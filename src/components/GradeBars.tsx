import { useState } from 'react';
import { GRADE_LEVEL, GRADES, money, short } from '../lib/format';
import type { Evidence, Grade } from '../lib/types';

const W = 740, H = 210, L = 52, B = 26, T = 8;

export function GradeBars({ data }: { data: Evidence['summary']['grades'] }) {
  const [hover, setHover] = useState<Grade | null>(null);
  const maxV = Math.max(...GRADES.map(g => data[g].pred));
  const top = Math.ceil(maxV / 2e7) * 2e7;
  const ticks = [0, top / 4, top / 2, (top * 3) / 4, top];
  const y = (v: number) => H - B - (v / top) * (H - B - T);
  const band = (W - L) / GRADES.length, bw = 30;
  return (
    <div className="gb">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="등급별 예측 매출과 회복 가능 매출">
        {ticks.map(t => <g key={t}><line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="#EBEBE7" /><text x={L - 8} y={y(t) + 4} textAnchor="end">{short(t)}</text></g>)}
        {GRADES.map((g, i) => {
          const cx = L + band * i + band / 2, d = data[g];
          return (
            <g key={g} onMouseEnter={() => setHover(g)} onMouseLeave={() => setHover(null)}>
              <rect x={L + band * i} y={T} width={band} height={H - B - T} fill={hover === g ? '#F4F5F7' : 'transparent'} />
              <rect x={cx - bw - 1} y={y(d.pred)} width={bw} height={Math.max(H - B - y(d.pred), 2)} rx="4" fill="#006AFF" />
              <rect x={cx + 1} y={y(d.recover)} width={bw} height={Math.max(H - B - y(d.recover), 2)} rx="4" fill="#A3A3A3" />
              <text x={cx} y={H - 8} textAnchor="middle">{g} 위험 {GRADE_LEVEL[g]}</text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="gb-tip" style={{ left: `${((L + band * GRADES.indexOf(hover) + band / 2) / W) * 100}%` }}>
          <b>{hover} 등급 · {data[hover].n}개</b><span>예측 매출 {money(data[hover].pred)}</span><span>회복 가능 {money(data[hover].recover)}</span>
        </div>
      )}
    </div>
  );
}
