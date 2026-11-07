import { useState, type MouseEvent } from 'react';
import { money, short } from '../lib/format';

export interface Series { name: string; color: string; dash?: string; pts: { x: number; y: number }[] }

const W = 760, H = 270, L = 62, B = 28, T = 12, Rr = 14;
const TICKS = [1, 3, 10, 30, 100, 300, 1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8];

/* 가로축은 로그 눈금. 곡선을 누르면 그 지점의 예산으로 설정된다 */
export function InvestCurve({ series, budget, cap, onPick }: { series: Series[]; budget: number; cap: number; onPick: (x: number) => void }) {
  const [hx, setHx] = useState<number | null>(null);
  const all = series.flatMap(s => s.pts);
  if (all.length < 2 || cap <= 0) return <p className="hint">이 조건에서 손익분기를 넘는 조치가 없어 곡선을 그릴 수 없습니다.</p>;
  const maxX = Math.max(...all.map(p => p.x), cap) * 1.05;
  const minX = Math.max(1, Math.min(...all.filter(p => p.x > 0).map(p => p.x)) * .8);
  const maxY = Math.max(...all.map(p => p.y)) * 1.05 || 1;
  const lx = (v: number) => Math.log10(Math.max(v, minX));
  const x = (v: number) => L + ((lx(v) - lx(minX)) / (lx(maxX) - lx(minX))) * (W - L - Rr);
  const y = (v: number) => H - B - (v / maxY) * (H - B - T);
  const unx = (px: number) => 10 ** (lx(minX) + ((px - L) / (W - L - Rr)) * (lx(maxX) - lx(minX)));
  const at = (s: Series, v: number) => s.pts.reduce((b, p) => (p.x <= v && p.x >= b.x ? p : b), s.pts[0]);
  const pos = (e: MouseEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); return Math.min(maxX, Math.max(minX, unx(((e.clientX - r.left) / r.width) * W))); };
  const ticks = TICKS.filter(t => t >= minX && t <= maxX);
  const yt = [0, .25, .5, .75, 1].map(t => (maxY / 1.05) * t);
  return (
    <div className="gb">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="예산별 누적 증분 매출" className="curve" onMouseMove={e => setHx(pos(e))} onMouseLeave={() => setHx(null)} onClick={e => onPick(pos(e))}>
        {yt.map(t => <g key={t}><line x1={L} x2={W - Rr} y1={y(t)} y2={y(t)} stroke="#EBEBE7" /><text x={L - 8} y={y(t) + 4} textAnchor="end">{short(t)}</text></g>)}
        {ticks.map(t => <text key={t} x={x(t)} y={H - 8} textAnchor="middle">{short(t)}</text>)}
        {series.map(s => <path key={s.name} d={s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" />)}
        <line x1={x(cap)} x2={x(cap)} y1={T} y2={H - B} stroke="#E02020" strokeDasharray="3 4" />
        <text x={x(cap) < L + 130 ? x(cap) + 4 : x(cap) - 4} y={T + 10} textAnchor={x(cap) < L + 130 ? 'start' : 'end'} fill="#E02020" style={{ fill: '#E02020' }}>추천 상한 {short(cap)}</text>
        {budget >= minX && <line x1={x(budget)} x2={x(budget)} y1={T} y2={H - B} stroke="#1A1919" />}
        {budget >= minX && <text x={x(budget) + (x(budget) > W - 90 ? -5 : 5)} y={H - B - 6} textAnchor={x(budget) > W - 90 ? 'end' : 'start'}>입력 예산</text>}
        {hx !== null && <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} stroke="#A3A3A3" />}
      </svg>
      {hx !== null && (
        <div className="gb-tip" style={{ left: `${Math.min(82, Math.max(18, (x(hx) / W) * 100))}%` }}>
          <b>예산 {money(hx)}</b>{series.map(s => <span key={s.name}>{s.name} {money(at(s, hx).y)}</span>)}
        </div>
      )}
    </div>
  );
}
