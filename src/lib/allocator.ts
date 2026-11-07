// 효율 엔진: 예산을 "게임 × 조치"에 배분한다. 팀원의 allocator.ts 방식을 따르되
// 매출 배수는 팀 모델 재예측값, 앱 용량 조치 추가, 실현율(추정 증분 중 실제로 기대하는 비율) 추가.
// 효율 = 실현율을 반영한 증분 매출 ÷ 비용. 효율이 가장 높은 조치부터 고르고, 고른 게임의 후보만 다시 계산한다.

export type Lever = 'update' | 'crash' | 'apk' | 'engage' | 'marketing' | 'ads' | 'iap';
export const LEVERS: Lever[] = ['update', 'crash', 'apk', 'engage', 'marketing', 'ads', 'iap'];
export const LABEL: Record<Lever, string> = {
  update: '업데이트 단축', crash: '충돌 개선', apk: '앱 용량 경량화', engage: '참여 개선', marketing: '마케팅 증액', ads: '광고 추가', iap: '인앱결제 추가',
};
type OpLever = 'update' | 'crash' | 'apk' | 'engage';

export interface LeverGame {
  id: string; genre: string; sub: string; tier: string; combo: string; pred: number; zero: boolean; ads: boolean; iap: boolean;
  openAds: number | null; openIap: number | null; openBoth: number | null; e: number; spend: number | null; spendCap: number | null;
  grade: string | null; nFix: number | null; m: Partial<Record<OpLever, number>>; k: Partial<Record<OpLever, string>>;
}

export interface AllocBase {
  costs: Record<'ads' | 'iap' | 'engage' | 'crash' | 'update' | 'apk', number>;
  marketingStep: number; fee: number; maxOpMult: number; tierCostMult: Record<string, number>; channelCoef: Record<string, number>;
}
export interface AllocConfig extends AllocBase { enabled: Lever[]; realization: number; maxActions: number | null }

interface State { ads: boolean; iap: boolean; engage: boolean; crash: boolean; update: boolean; apk: boolean; S: number | null; n: number }

export const threshold = (c: AllocConfig) => 1 / (1 - c.fee);
const comboOf = (a: boolean, i: boolean) => (a && i ? '광고+인앱결제' : a ? '광고' : i ? '인앱결제' : '없음');
const newState = (g: LeverGame): State => ({ ads: g.ads, iap: g.iap, engage: false, crash: false, update: false, apk: false, S: g.spend, n: 0 });

function revenue(g: LeverGame, s: State, c: AllocConfig): number {
  let level: number;
  if (g.zero) {
    if (s.ads && s.iap) level = g.openBoth ?? 0;
    else if (s.ads) level = g.openAds ?? 0;
    else if (s.iap) level = g.openIap ?? 0;
    else return 0;
  } else {
    level = g.pred * Math.exp(c.channelCoef[comboOf(s.ads, s.iap)] - c.channelCoef[comboOf(g.ads, g.iap)]);
  }
  let op = 1;
  for (const l of ['engage', 'crash', 'update', 'apk'] as OpLever[]) if (s[l]) op *= g.m[l] ?? 1;
  if (g.spend !== null && g.spend > 0) op *= Math.pow((s.S as number) / g.spend, g.e);
  return level * Math.min(op, c.maxOpMult);
}

const leverCost = (g: LeverGame, lev: Lever, c: AllocConfig) => (lev === 'marketing' ? c.marketingStep : (c.tierCostMult[g.tier] ?? 1) * c.costs[lev]);
const applyLever = (s: State, lev: Lever, c: AllocConfig): State => (lev === 'marketing' ? { ...s, S: (s.S as number) + c.marketingStep } : { ...s, [lev]: true, n: s.n + 1 });

function candidates(g: LeverGame, s: State, c: AllocConfig) {
  const out: { lev: Lever; cost: number; gain: number }[] = [];
  const R = revenue(g, s, c);
  for (const lev of LEVERS) {
    if (!c.enabled.includes(lev)) continue;
    if (lev === 'marketing') {
      if (g.spendCap === null || (s.S as number) + c.marketingStep > g.spendCap + 1e-9) continue;
    } else {
      if (s[lev] || (c.maxActions !== null && s.n >= c.maxActions)) continue;
      if (lev !== 'ads' && lev !== 'iap' && g.m[lev] == null) continue;
    }
    const cost = Math.max(leverCost(g, lev, c), 1);
    out.push({ lev, cost, gain: (revenue(g, applyLever(s, lev, c), c) - R) * c.realization });
  }
  return out;
}

export const leverOptions = (g: LeverGame, c: AllocConfig) => candidates(g, newState(g), c);

type Entry = [number, number, number, number, number, number]; // [-효율, 게임, 조치, 판, 비용, 증분]
const less = (a: Entry, b: Entry) => (a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] !== b[2] ? a[2] < b[2] : a[3] < b[3]);
class Heap {
  h: Entry[] = [];
  get size() { return this.h.length; }
  push(x: Entry) {
    const h = this.h; h.push(x); let i = h.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (less(h[i], h[p])) { [h[i], h[p]] = [h[p], h[i]]; i = p; } else break; }
  }
  pop(): Entry {
    const h = this.h; const top = h[0]; const last = h.pop() as Entry;
    if (h.length) {
      h[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < h.length && less(h[l], h[m])) m = l;
        if (r < h.length && less(h[r], h[m])) m = r;
        if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m;
      }
    }
    return top;
  }
}

export interface Pick { gameIdx: number; lever: Lever; cost: number; gain: number; efficiency: number; spent: number; cumGain: number }
export interface GamePlan { game: LeverGame; cost: number; gain: number; actions: { lever: Lever; cost: number; gain: number }[] }
export interface AllocResult {
  picks: Pick[]; byLever: { lever: Lever; cost: number; gain: number; count: number; costShare: number; gainShare: number }[]; byGame: GamePlan[];
  spent: number; gain: number; net: number; perDollar: number; base: number; stop: 'budget' | 'threshold' | 'exhausted';
}

export function allocate(games: LeverGame[], c: AllocConfig, X: number): AllocResult {
  const th = threshold(c); const st = games.map(newState); const ver = games.map(() => 0);
  const H = new Heap();
  const push = (i: number) => { for (const { lev, cost, gain } of candidates(games[i], st[i], c)) H.push([-(gain / cost), i, LEVERS.indexOf(lev), ver[i], cost, gain]); };
  games.forEach((_, i) => push(i));
  let left = X, spent = 0, sum = 0, skipped = false; let stop: AllocResult['stop'] = 'exhausted';
  const picks: Pick[] = [];
  while (H.size) {
    const [ne, i, li, v, cost, gain] = H.pop();
    if (v !== ver[i]) continue;
    if (-ne < th) { stop = 'threshold'; break; }
    if (cost > left + 1e-9) { skipped = true; continue; }
    const lever = LEVERS[li];
    st[i] = applyLever(st[i], lever, c); ver[i] += 1; left -= cost; spent += cost; sum += gain;
    picks.push({ gameIdx: i, lever, cost, gain, efficiency: -ne, spent, cumGain: sum });
    push(i);
  }
  if (skipped) stop = 'budget';
  const L = new Map<Lever, AllocResult['byLever'][number]>();
  const G = new Map<number, GamePlan>();
  for (const p of picks) {
    const d = L.get(p.lever) ?? { lever: p.lever, cost: 0, gain: 0, count: 0, costShare: 0, gainShare: 0 };
    d.cost += p.cost; d.gain += p.gain; d.count += 1; L.set(p.lever, d);
    const q = G.get(p.gameIdx) ?? { game: games[p.gameIdx], cost: 0, gain: 0, actions: [] };
    q.cost += p.cost; q.gain += p.gain;
    const a = q.actions.find(x => x.lever === p.lever);
    if (a) { a.cost += p.cost; a.gain += p.gain; } else q.actions.push({ lever: p.lever, cost: p.cost, gain: p.gain });
    G.set(p.gameIdx, q);
  }
  return {
    picks, spent, gain: sum, net: sum * (1 - c.fee) - spent, perDollar: spent ? sum / spent : 0, stop,
    base: games.reduce((a, g) => a + (g.zero ? 0 : g.pred), 0),
    byLever: [...L.values()].map(d => ({ ...d, costShare: spent ? d.cost / spent : 0, gainShare: sum ? d.gain / sum : 0 })).sort((a, b) => b.cost - a.cost),
    byGame: [...G.values()].sort((a, b) => b.gain - a.gain),
  };
}

// 비교 기준: 같은 예산을 마케팅에 게임별로 똑같이 나눈 경우
export function equalMarketing(games: LeverGame[], c: AllocConfig, X: number) {
  const el = games.filter(g => g.spendCap !== null && !g.zero);
  if (!el.length) return 0;
  return el.reduce((sum, g) => {
    const s = newState(g), add = Math.min(X / el.length, (g.spendCap as number) - (g.spend as number));
    return sum + (revenue(g, { ...s, S: (g.spend as number) + add }, c) - revenue(g, s, c)) * c.realization;
  }, 0);
}
