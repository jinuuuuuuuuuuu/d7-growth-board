import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useGames } from '../lib/data';
import { money, prob } from '../lib/format';
import { Card, Empty, GradeBadge, Page, StatCard, StatsHead, TopBar } from '../components/ui';

type Over = Record<string, { feas?: number; days?: number }>;

export default function Board() {
  const { cart, setCart, toggleCart, meta } = useApp();
  const games = useGames(cart);
  const [over, setOver] = useState<Over>({});
  const [budget, setBudget] = useState(30);
  const live = useMemo(() => (games ?? []).filter(g => !g.zero), [games]);
  const zeros = (games ?? []).filter(g => g.zero);
  const acts = useMemo(() => live.flatMap(g => g.actions.filter(a => !a.ref_only).map(a => {
    const k = `${g.id}|${a.key}`, feas = over[k]?.feas ?? a.feas, days = over[k]?.days ?? a.days;
    const edited = feas !== a.feas || days !== a.days;
    const exp = edited ? a.net * feas : a.exp_net;
    return { ...a, gameId: g.id, k, feas, days, exp, per: edited ? (days > 0 ? exp / days : 0) : a.per_day, sc: edited ? exp * (1 + (g.risk_prob ?? 0)) : a.score };
  })), [live, over]);
  const best = (id: string) => acts.filter(a => a.gameId === id).sort((a, b) => b.per - a.per)[0];
  const plan = useMemo(() => {
    let left = budget; const seen = new Set<string>(); const p: typeof acts = [];
    for (const a of [...acts].sort((x, y) => y.per - x.per)) {
      if (seen.has(a.gameId) || a.days > left) continue;
      p.push(a); left -= a.days; seen.add(a.gameId);
    }
    return { p, left };
  }, [acts, budget]);
  const sum = plan.p.reduce((s, a) => s + a.exp, 0);
  const upd = (k: string, f: 'feas' | 'days', v: number) => setOver(o => ({ ...o, [k]: { ...o[k], [f]: v } }));
  const rows = [...live].sort((a, b) => (best(b.id)?.sc ?? 0) - (best(a.id)?.sc ?? 0));
  return (
    <Page stats={<>
      <StatsHead title="투입 계획" sub="가용 인력 안에서 먼저 할 조치" />
      <StatCard title="가용 인일" tag="입력">
        <label className="big-in"><input aria-label="가용 인일" type="number" min="0" value={budget} onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))} /><span>인일</span></label>
        <div className="stat-row"><span>사용</span><span>{budget - plan.left}인일</span></div>
        <div className="stat-row"><span>남음</span><span>{plan.left}인일</span></div>
      </StatCard>
      <StatCard title="기대 순증분 합계" tag={`${plan.p.length}개 조치`} value={money(sum)} note="예상 증분 × 실행 가능성, 시뮬레이션 기준" />
      <StatCard title="담은 게임" tag={`${cart.length}개`} note="회사 정보가 없어 test 게임으로 구성한 데모입니다.">
        <div className="stat-btns">
          <button className="btn" onClick={() => setCart(meta.portfolio.map(p => p.id))}>데모 포트폴리오 불러오기</button>
          {cart.length > 0 && <button className="btn-o" onClick={() => setCart([])}>모두 비우기</button>}
        </div>
      </StatCard>
    </>}>
      <TopBar title="우선순위 보드" />
      {games?.length !== cart.length ? <div className="boot">게임 정보를 불러오는 중입니다.</div> : cart.length < 3 ? <Card><Empty to="/groups" cta="게임군에서 담기">게임을 3개 이상 담아 주세요. 왼쪽의 데모 포트폴리오를 불러와도 됩니다.</Empty></Card> : <>
        <Card title="게임 비교">
          <div className="tbl-x"><table className="bd">
            <thead><tr><th>게임</th><th>위험</th><th>첫 조치</th><th className="r">영향도</th><th>실행 가능성 (가정)</th><th className="r">심각성</th><th>인일 (가정)</th><th className="r">기대 순증분</th><th className="r">점수</th><th /></tr></thead>
            <tbody>{rows.map(g => {
              const a = best(g.id);
              return <tr key={g.id}>
                <td><Link className="chip" to={'/game/' + g.id}>{g.id.replace('REV4_', '')}</Link></td>
                <td><GradeBadge grade={g.risk_grade} n={g.n_fix} /></td>
                <td>{a ? a.label : '유지와 확장'}</td>
                <td className="r num">{a ? money(a.gain) : '없음'}</td>
                <td>{a && <input aria-label={g.id + ' 실행 가능성'} type="number" min="0" max="1" step="0.1" value={a.feas} onChange={e => upd(a.k, 'feas', Math.min(1, Math.max(0, Number(e.target.value) || 0)))} />}</td>
                <td className="r num">{prob(g.risk_prob)}</td>
                <td>{a && <input aria-label={g.id + ' 인일'} type="number" min="1" value={a.days} onChange={e => upd(a.k, 'days', Math.max(1, Number(e.target.value) || 1))} />}</td>
                <td className="r num">{a ? money(a.exp) : '없음'}</td>
                <td className="r num"><b>{a ? money(a.sc) : '없음'}</b></td>
                <td><button className="link" onClick={() => toggleCart(g.id)}>빼기</button></td>
              </tr>;
            })}</tbody>
          </table></div>
          <details className="formula"><summary>계산 공식 보기</summary><p>{meta.evidence.priority.formula}</p><p>{meta.evidence.priority.note}</p></details>
        </Card>
        <Card title="이번 투입 계획">
          {plan.p.length === 0 && <p className="body">가용 인일 안에서 고를 수 있는 조치가 없습니다.</p>}
          <div className="plan">{plan.p.map((a, i) => (
            <div key={a.k} className="plan-r"><em>{i + 1}</em><Link className="chip" to={'/game/' + a.gameId}>{a.gameId.replace('REV4_', '')}</Link><b>{a.label}</b><span>{a.days}인일 · 인일당 기대 순증분 {money(a.per)}</span><Link className="btn sm" to={`/cards/new/${a.gameId}/${a.key}`}>실험 카드 만들기</Link></div>
          ))}</div>
        </Card>
        {zeros.length > 0 && <Card title="구조 검토 대상"><div className="plan">{zeros.map(g => (
          <div key={g.id} className="plan-r"><Link className="chip" to={'/game/' + g.id}>{g.id.replace('REV4_', '')}</Link><b>수익 경로 없음</b><span>90일 예측 0, 다음 버전 수익 채널 검토</span><Link className="btn-o" to={`/cards/new/${g.id}/structure`}>실험 카드 만들기</Link></div>
        ))}</div></Card>}
      </>}
    </Page>
  );
}
