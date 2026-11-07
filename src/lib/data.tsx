import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fixLabel } from './format';
import type { Cluster, ExperimentCard, Game, IndexGame, Meta } from './types';

const BASE = import.meta.env.BASE_URL;
const load = async <T,>(p: string): Promise<T> => {
  const r = await fetch(`${BASE}data/${p}`);
  if (!r.ok) throw new Error(p);
  return r.json();
};

const read = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장소를 쓸 수 없는 환경 */ } };

interface Ctx {
  index: IndexGame[]; byId: Map<string, IndexGame>; meta: Meta; cluster: (id: string) => Cluster | undefined;
  current: string | null; setCurrent: (id: string | null) => void;
  cards: ExperimentCard[]; saveCard: (c: ExperimentCard) => void; removeCard: (id: string) => void;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

const cache = new Map<string, Promise<Game[]>>();
export const loadCluster = (id: string) => {
  if (!cache.has(id)) cache.set(id, load<Game[]>(`details/${id}.json`));
  return cache.get(id)!;
};

export function useGame(id: string | undefined) {
  const { byId } = useApp();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  useEffect(() => {
    const row = id ? byId.get(id) : undefined;
    if (!row) { setGame(null); return; }
    let on = true;
    setGame(undefined);
    loadCluster(row.cluster_id).then(l => { if (on) setGame(l.find(g => g.id === id) ?? null); });
    return () => { on = false; };
  }, [id, byId]);
  return game;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ index: IndexGame[]; meta: Meta } | null>(null);
  const [err, setErr] = useState(false);
  const [current, setCur] = useState<string | null>(() => read('d7.current', null));
  const [cards, setCards] = useState<ExperimentCard[]>(() => read('d7.cards', []));
  useEffect(() => {
    Promise.all([load<IndexGame[]>('index.json'), load<Meta>('meta.json')]).then(([index, meta]) => setState({ index, meta: { ...meta, clusters: meta.clusters.map(c => ({ ...c, label: fixLabel(c.label) })) } })).catch(() => setErr(true));
  }, []);
  const byId = useMemo(() => new Map((state?.index ?? []).map(g => [g.id, g])), [state]);
  const value = useMemo<Ctx | null>(() => {
    if (!state) return null;
    const setCurrent = (id: string | null) => { setCur(id); write('d7.current', id); };
    return {
      ...state, byId, cluster: id => state.meta.clusters.find(c => c.id === id),
      current, setCurrent,
      cards,
      saveCard: c => { const n = [c, ...cards.filter(x => x.id !== c.id)]; setCards(n); write('d7.cards', n); },
      removeCard: id => { const n = cards.filter(x => x.id !== id); setCards(n); write('d7.cards', n); },
    };
  }, [state, byId, current, cards]);
  if (err) return <div className="boot">데이터를 불러오지 못했습니다. 새로고침해 주세요.</div>;
  if (!value) return <div className="boot">게임 2,000개 데이터를 불러오는 중입니다.</div>;
  return <C.Provider value={value}>{children}</C.Provider>;
}
