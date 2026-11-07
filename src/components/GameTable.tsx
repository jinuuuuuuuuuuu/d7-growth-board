import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/data';
import { money, prob } from '../lib/format';
import type { IndexGame } from '../lib/types';
import { GradeBadge } from './ui';

const STEP = 50;

export function GameTable({ rows, height = 340 }: { rows: IndexGame[]; height?: number }) {
  const { cart, toggleCart, meta } = useApp();
  const [n, setN] = useState(STEP);
  return (
    <div className="gt">
      <div className="gt-scroll" style={{ maxHeight: height }}>
        <table>
          <thead><tr><th className="c-no">No.</th><th>게임 ID</th><th>장르와 첫 조치</th><th>위험</th><th className="r">예측 90일 매출</th><th className="r">개선 여지</th><th /></tr></thead>
          <tbody>
            {rows.slice(0, n).map((g, i) => (
              <tr key={g.id}>
                <td className="c-no">{String(i + 1).padStart(2, '0')}</td>
                <td><Link className="chip" to={'/game/' + g.id}>{g.id.replace('REV4_', '')}</Link></td>
                <td className="c-genre"><b>{g.genre} · {g.sub_genre}</b><small>{g.excluded ? '비교군과 위험 등급 제외' : g.first_action ? meta.actions[g.first_action] : g.zero ? '다음 버전 구조 검토' : '유지와 확장'}</small></td>
                <td><GradeBadge grade={g.risk_grade} n={g.n_fix} excluded={g.excluded} />{g.risk_prob != null && <small className="prob">미달 확률 {prob(g.risk_prob)}</small>}</td>
                <td className="r num">{money(g.pred)}</td>
                <td className="r num">{g.zero || g.excluded ? '—' : money(g.recover_ops)}</td>
                <td className="c-act">
                  {!g.excluded && <button className={'btn-o' + (cart.includes(g.id) ? ' on' : '')} onClick={() => toggleCart(g.id)} aria-pressed={cart.includes(g.id)}>{cart.includes(g.id) ? '담음' : '담기'}</button>}
                  <Link className="btn sm" to={'/game/' + g.id}>상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="gt-empty">조건에 맞는 게임이 없습니다.</p>}
      </div>
      {rows.length > n && <button className="more" onClick={() => setN(n + STEP)}>더 보기 ({rows.length - n}개 남음)</button>}
    </div>
  );
}
