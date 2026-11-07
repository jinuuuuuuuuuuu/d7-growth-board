import { useMemo, useState, type MouseEvent } from 'react';
import { money, short } from '../lib/format';
import type { Pick } from '../lib/allocator';

const W = 760, H = 240, L = 58, B = 28, T = 10, Rr = 12;

/* 예산을 늘릴 때 누적 증분 매출이 어떻게 둔화되는지 보여주는 한 줄 그래프 */
export function InvestCurve({ picks, budget }: { picks: Pick[]; budget: number }) {
  const [hx, setHx] = useState<number | null>(null);
  const pts = useMemo(() => {
    const step = Math.max(1, Math.floor(picks.length / 240));
    const a = picks.filter((_, i) => i % step === 0 || i === picks.length - 1);
    return [{ spent: 0, cumGain: 0, efficiency: 0 }, ...a];
  }, [picks]);
  if (picks.length < 2) return <p className="hint">이 조건에서 손익분기를 넘는 조치가 없습니다.</p>;
  const maxX = pts[pts.length - 1].spent, maxY = pts[pts.length - 1].cumGain;
  const x = (v: number) => L + (v / maxX) * (W - L - Rr);
  const y = (v: number) => H - B - (v / maxY) * (H - B - T);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.spent).toFixed(1)} ${y(p.cumGain).toFixed(1)}`).join('');
  const near = (bx: number) => pts.reduce((b, p) => (Math.abs(p.spent - bx) < Math.abs(b.spent - bx) ? p : b), pts[0]);
  const cur = budget <= maxX ? near(budget) : pts[pts.length - 1];
  const hov = hx === null ? null : near(hx);
  const move = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHx(Math.min(maxX, Math.max(0, (((e.clientX - r.left) / r.width) * W - L) / (W - L - Rr) * maxX)));
  };
  const ticks = [0, .25, .5, .75, 1];
  return (
    <div className="gb">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="예산별 누적 증분 매출" onMouseMove={move} onMouseLeave={() => setHx(null)}>
        {ticks.map(t => <g key={t}><line x1={L} x2={W - Rr} y1={y(maxY * t)} y2={y(maxY * t)} stroke="#EBEBE7" /><text x={L - 8} y={y(maxY * t) + 4} textAnchor="end">{short(maxY * t)}</text></g>)}
        {ticks.map(t => <text key={t} x={x(maxX * t)} y={H - 8} textAnchor={t === 1 ? 'end' : t === 0 ? 'start' : 'middle'}>{short(maxX * t)}</text>)}
        <path d={path} fill="none" stroke="#006AFF" strokeWidth="2" strokeLinejoin="round" />
        <line x1={x(cur.spent)} x2={x(cur.spent)} y1={T} y2={H - B} stroke="#1A1919" strokeDasharray="4 4" />
        <circle cx={x(cur.spent)} cy={y(cur.cumGain)} r="5" fill="#1A1919" stroke="#fff" strokeWidth="2" />
        {hov && <><line x1={x(hov.spent)} x2={x(hov.spent)} y1={T} y2={H - B} stroke="#A3A3A3" /><circle cx={x(hov.spent)} cy={y(hov.cumGain)} r="4" fill="#006AFF" stroke="#fff" strokeWidth="2" /></>}
      </svg>
      {hov && hov.spent > 0 && (
        <div className="gb-tip" style={{ left: `${Math.min(84, Math.max(16, (x(hov.spent) / W) * 100))}%` }}>
          <b>예산 {money(hov.spent)}</b><span>누적 증분 {money(hov.cumGain)}</span><span>이 지점 효율 1달러당 {money(hov.efficiency).replace('$', '$')}</span>
        </div>
      )}
    </div>
  );
}
