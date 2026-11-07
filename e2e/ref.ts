// 화면 기본값과 같은 조건의 기준 계산. check.py가 호출해 화면 값과 대조한다.
import { readFileSync } from 'node:fs';
import { allocate, equalMarketing, type AllocConfig, type LeverGame } from '../src/lib/allocator.ts';
const P = new URL('../public/data/', import.meta.url);
const L = JSON.parse(readFileSync(new URL('levers.json', P), 'utf8')) as LeverGame[];
const M = JSON.parse(readFileSync(new URL('meta.json', P), 'utf8'));
const c: AllocConfig = { ...M.alloc.conservative, realization: 0.5, maxActions: null, enabled: ['update', 'crash', 'apk', 'engage'] };
const g = L.filter(x => !x.zero);
const r = allocate(g, c, 200000), u = allocate(g, c, Infinity);
const c2: AllocConfig = { ...c, enabled: [...c.enabled, 'ads', 'iap'] };
const r2 = allocate(L, c2, 200000);
// 게임 하나만 넣었을 때: 손익분기를 넘는 조치가 있는 게임 비중
const one = g.map(x => allocate([x], c, Infinity));
const has = one.filter(x => x.picks.length > 0);
const mid = (a: number[]) => [...a].sort((p, q) => p - q)[a.length >> 1] ?? 0;
const G = g.find(x => x.id === 'REV4_008978') as LeverGame, s = allocate([G], c, Infinity);
console.log(JSON.stringify({ spent: r.spent, gain: r.gain, net: r.net, per: r.perDollar, picks: r.picks.length, games: r.byGame.length, eq: equalMarketing(g, c, 200000), cap: u.spent, capGain: u.gain, chanGain: r2.gain,
  levers: r.byLever.map(l => [l.lever, Math.round(l.costShare * 100)]), top: r.byGame.slice(0, 3).map(p => [p.game.id, p.game.grade, p.actions.map(a => a.lever).join('+'), Math.round(p.cost), Math.round(p.gain)]),
  single: { n: g.length, has: has.length, medActions: mid(has.map(x => x.picks.length)), medPer: mid(has.map(x => x.perDollar)) },
  one: { id: G.id, spent: s.spent, gain: s.gain, levers: s.byLever.map(l => l.lever) } }));
