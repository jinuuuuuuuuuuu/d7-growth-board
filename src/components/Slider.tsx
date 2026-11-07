import type { KeyboardEvent } from 'react';

interface Props {
  label: string; hint?: string; min: number; max: number; current: number; stops: number[]; value: number;
  onChange: (v: number) => void; fmt: (v: number) => string; marks?: { at: number; text: string }[];
}

/* 현재값 근처는 자석처럼 현재값에 붙고, 그 밖에서는 모델로 계산한 가장 가까운 지점에 붙는다 */
const MAGNET = 0.05;

export function Slider({ label, hint, min, max, current, stops, value, onChange, fmt, marks = [] }: Props) {
  const range = max - min || 1;
  const pos = (v: number) => ((v - min) / range) * 100;
  const all = Array.from(new Set([...stops, current])).sort((a, b) => a - b);
  const snap = (raw: number) => {
    if (Math.abs(raw - current) <= range * MAGNET) return current;
    return stops.reduce((b, s) => (Math.abs(s - raw) < Math.abs(b - raw) ? s : b), stops[0]);
  };
  const key = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = all.indexOf(value);
    onChange(all[Math.min(all.length - 1, Math.max(0, i + d))]);
  };
  const a = Math.min(pos(value), pos(current)), b = Math.max(pos(value), pos(current));
  const changed = value !== current;
  return (
    <div className="sl">
      <div className="sl-head"><span>{label}</span><b className={changed ? 'on' : ''}>{changed ? fmt(value) : `현재 ${fmt(current)}`}</b></div>
      <div className="sl-track">
        <div className="sl-fill" style={{ left: `${a}%`, width: `${b - a}%` }} />
        {marks.map(m => <i key={m.at} className="sl-mark" style={{ left: `${pos(m.at)}%` }} title={m.text} />)}
        <i className="sl-cur" style={{ left: `${pos(current)}%` }} />
        <input type="range" min={min} max={max} step="any" value={value} aria-label={label} aria-valuetext={fmt(value)}
          onChange={e => onChange(snap(Number(e.target.value)))} onKeyDown={key} />
      </div>
      <div className="sl-foot"><span>{fmt(min)}</span>{hint && <em>{hint}</em>}<span>{fmt(max)}</span></div>
    </div>
  );
}
