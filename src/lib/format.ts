import type { Grade } from './types';

export const money = (n: number | null | undefined) => (n == null ? '미상' : '$' + Math.round(n).toLocaleString('en-US'));
export const smoney = (n: number) => (n >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
export const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
export const pct = (x: number | null | undefined, d = 1) => (x == null ? '미상' : (x * 100).toFixed(d) + '%');
export const prob = (x: number | null | undefined) => (x == null ? '미상' : x >= 0.999 ? '99.9% 이상' : pct(x));
export const spct = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%';

export function metric(v: number | null | undefined, unit: string) {
  if (v == null) return '미상';
  if (unit === '%') return v.toFixed(2) + '%';
  if (unit === '일') return Math.round(v) + '일';
  if (unit === '분') return v.toFixed(1) + '분';
  if (unit === 'USD') return money(v);
  if (unit === '건') return Math.round(v).toLocaleString('en-US') + '건';
  if (unit === 'MB') return v.toFixed(1) + 'MB';
  return String(v);
}

export const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E'];
/* 등급은 안전과 위험의 양극이라 초록-회색-빨강 발산 구조. 항상 글자와 함께 표시한다 */
export const GRADE_COLOR: Record<Grade, string> = { A: '#1E9E4A', B: '#8FD19E', C: '#B5B5B0', D: '#F59A92', E: '#E02020' };
export const GRADE_LEVEL: Record<Grade, string> = { A: '낮음', B: '낮음', C: '중간', D: '높음', E: '높음' };
export const QUAD: Record<string, string> = { A: 'A 건강 · 유지와 확장', B: 'B QA 우선', C: 'C 콘텐츠 우선', D: 'D 전면 점검' };

export function normalizeId(s: string) {
  const v = s.trim().toUpperCase().replace(/\s+/g, '');
  return /^\d{6}$/.test(v) ? 'REV4_' + v : v;
}
