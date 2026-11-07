import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../lib/data';
import { GRADE_COLOR, GRADE_LEVEL, GRADES, normalizeId, pct } from '../lib/format';
import type { Grade } from '../lib/types';

export function Page({ stats, children }: { stats: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <aside className="stats">{stats}</aside>
      <div className="main">
        {children}
        <p className="legal">합성 데이터 기반 시제품입니다. 실제 시장 통계가 아닙니다.</p>
      </div>
    </div>
  );
}

export const StatsHead = ({ title, sub }: { title: string; sub: string }) => (
  <header className="stats-head"><h1>{title}</h1><p>{sub}</p></header>
);

export function StatCard({ title, tag, value, delta, deltaTone, note, row, children }: {
  title: string; tag?: string; value?: ReactNode; delta?: string; deltaTone?: 'up' | 'down'; note?: ReactNode; row?: [string, ReactNode]; children?: ReactNode;
}) {
  return (
    <section className="stat">
      <div className="stat-top"><h2>{title}</h2>{tag && <span className="tag">{tag}</span>}</div>
      {value != null && <div className="stat-val"><b>{value}</b>{delta && <span className={deltaTone}>{delta}</span>}</div>}
      {note && <p className="stat-note">{note}</p>}
      {row && <div className="stat-row"><span>{row[0]}</span><span>{row[1]}</span></div>}
      {children}
    </section>
  );
}

export const Card = ({ title, right, children, id }: { title?: ReactNode; right?: ReactNode; children: ReactNode; id?: string }) => (
  <section className="card" id={id}>
    {(title || right) && <div className="card-head"><h2>{title}</h2>{right}</div>}
    {children}
  </section>
);

export function TopBar({ title, children }: { title: ReactNode; children?: ReactNode }) {
  const { index, byId } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const hits = useMemo(() => {
    const v = q.trim().toUpperCase();
    return v.length < 2 ? [] : index.filter(g => g.id.includes(v)).slice(0, 6);
  }, [q, index]);
  const open = (id: string) => { setQ(''); setMsg(''); nav('/game/' + id); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = normalizeId(q);
    if (byId.has(id)) open(id); else setMsg(id ? `${id}는 없는 게임 ID입니다.` : '게임 ID를 입력해 주세요.');
  };
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {children}
      <form className="search" onSubmit={submit} role="search">
        <input aria-label="게임 ID 검색" placeholder="게임 ID 검색" value={q} onChange={e => { setQ(e.target.value); setMsg(''); }} spellCheck={false} />
        <button type="submit" aria-label="검색"><Search size={22} /></button>
        {(hits.length > 0 || msg) && (
          <div className="search-pop">
            {msg && <p>{msg}</p>}
            {!msg && hits.map(g => <button type="button" key={g.id} onClick={() => open(g.id)}><b>{g.id}</b><span>{g.genre} · {g.sub_genre}</span></button>)}
          </div>
        )}
      </form>
    </div>
  );
}

export function GradeBadge({ grade, n }: { grade: Grade | null | undefined; n?: number | null }) {
  if (!grade) return <span className="grade none"><i />수익 경로 없음</span>;
  return <span className="grade"><i style={{ background: GRADE_COLOR[grade] }} /><b>{grade}{n ?? ''}</b><span>{GRADE_LEVEL[grade]}</span></span>;
}

export function Donut({ counts, size = 146, center }: { counts: Partial<Record<Grade, number>>; size?: number; center?: ReactNode }) {
  const [hover, setHover] = useState<Grade | null>(null);
  const total = GRADES.reduce((s, g) => s + (counts[g] ?? 0), 0) || 1;
  const r = 58, c = 2 * Math.PI * r, gap = 3;
  let acc = 0;
  const segs = GRADES.map(g => {
    const v = counts[g] ?? 0, len = (v / total) * c, off = acc; acc += len;
    return { g, v, len, off };
  }).filter(s => s.v > 0);
  const h = hover ? segs.find(s => s.g === hover) : null;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 146 146" role="img" aria-label="위험 등급 분포">
        <g transform="rotate(-90 73 73)">
          {segs.map(s => (
            <circle key={s.g} cx="73" cy="73" r={r} fill="none" stroke={GRADE_COLOR[s.g]} strokeWidth={hover === s.g ? 24 : 20}
              strokeDasharray={`${Math.max(s.len - gap, 1)} ${c}`} strokeDashoffset={-s.off}
              onMouseEnter={() => setHover(s.g)} onMouseLeave={() => setHover(null)} />
          ))}
        </g>
      </svg>
      <div className="donut-c">{h ? <><b>{h.g}</b><span>{h.v}개</span></> : center}</div>
    </div>
  );
}

export function GradeLegend({ counts }: { counts: Partial<Record<Grade, number>> }) {
  const total = GRADES.reduce((s, g) => s + (counts[g] ?? 0), 0) || 1;
  return (
    <ul className="legend">
      {GRADES.map(g => (
        <li key={g}><i style={{ background: GRADE_COLOR[g] }} /><span>{g} 위험 {GRADE_LEVEL[g]}</span><b>{counts[g] ?? 0}개</b><em>{pct((counts[g] ?? 0) / total, 0)}</em></li>
      ))}
    </ul>
  );
}

export const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <label className="field"><span>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
  </label>
);

export const Empty = ({ children, to, cta }: { children: ReactNode; to?: string; cta?: string }) => (
  <div className="empty"><p>{children}</p>{to && <Link className="btn" to={to}>{cta}</Link>}</div>
);
