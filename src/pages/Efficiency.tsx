import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/data';
import { GRADE_LEVEL, money, pct } from '../lib/format';
import { LABEL, allocate, equalMarketing, threshold, type AllocBase, type AllocConfig, type Lever, type LeverGame } from '../lib/allocator';
import type { Grade } from '../lib/types';
import { Card, GradeBadge, Page, StatCard, StatsHead, TopBar } from '../components/ui';
import { InvestCurve } from '../components/InvestCurve';

const BUDGETS = [50000, 100000, 200000, 500000];
const COSTS: [keyof AllocBase['costs'], string][] = [['update', '업데이트 단축'], ['crash', '충돌 개선'], ['apk', '앱 용량 경량화'], ['engage', '참여 개선'], ['ads', '광고 추가'], ['iap', '인앱결제 추가']];
const keyOf = (g: LeverGame, l: Lever) => (l === 'marketing' ? 'mkt_15' : l === 'ads' || l === 'iap' ? 'structure' : g.k[l] ?? 'structure');
const times = (x: number) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10) + '배';

export default function Efficiency() {
  const { meta, cart, setCart } = useApp();
  const [levers, setLevers] = useState<LeverGame[] | null>(null);
  const [budget, setBudget] = useState(200000);
  const [scope, setScope] = useState<'all' | 'cart'>(cart.length >= 3 ? 'cart' : 'all');
  const [mode, setMode] = useState<'conservative' | 'standard'>('conservative');
  const [real, setReal] = useState(0.5);
  const [mkt, setMkt] = useState(false);
  const [chan, setChan] = useState(false);
  const [costs, setCosts] = useState(meta.alloc.conservative.costs);
  const [fee, setFee] = useState(meta.alloc.conservative.fee);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/levers.json`).then(r => r.json()).then(setLevers); }, []);

  const cfg = useMemo<AllocConfig>(() => ({
    ...meta.alloc[mode], costs, fee, realization: real,
    enabled: ['update', 'crash', 'apk', 'engage', ...(mkt ? ['marketing' as Lever] : []), ...(chan ? ['ads', 'iap'] as Lever[] : [])],
  }), [meta, mode, costs, fee, real, mkt, chan]);
  const games = useMemo(() => (levers ?? []).filter(g => (scope === 'all' || cart.includes(g.id)) && (chan || !g.zero)), [levers, scope, cart, chan]);
  const r = useMemo(() => allocate(games, cfg, budget), [games, cfg, budget]);
  const full = useMemo(() => allocate(games, cfg, Infinity), [games, cfg]);
  const eq = useMemo(() => equalMarketing(games, cfg, budget), [games, cfg, budget]);
  const at = (t: number) => { const p = full.picks.filter(x => x.efficiency >= t); return p.length ? p[p.length - 1].spent : 0; };
  const cap5 = at(5), th = threshold(cfg);

  const left = <>
    <StatsHead title="효율" sub="한정된 예산을 어디에 먼저 쓸지 계산합니다" />
    <StatCard title="담은 게임" tag={`${cart.length}개`} note="회사 정보가 없어 test 게임으로 구성한 데모입니다.">
      <div className="stat-btns">
        <button className="btn" onClick={() => { setCart(meta.portfolio.map(p => p.id)); setScope('cart'); }}>데모 포트폴리오 불러오기</button>
        {cart.length > 0 && <button className="btn-o" onClick={() => { setCart([]); setScope('all'); }}>모두 비우기</button>}
      </div>
    </StatCard>
  </>;
  if (!levers) return <Page stats={left}><TopBar title="효율" /><div className="boot">배분 데이터를 불러오는 중입니다.</div></Page>;

  return (
    <Page stats={left}>
      <TopBar title="효율" />
      <Card title="예산과 가정">
        <div className="eff-top">
          <label className="field"><span>투입 예산 (달러)</span><input aria-label="투입 예산" className="eff-in" type="number" min="0" step="10000" value={budget} onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))} /></label>
          <div className="eff-chips" role="group" aria-label="예산 빠른 선택">{BUDGETS.map(b => <button key={b} className={'btn-o' + (budget === b ? ' on' : '')} onClick={() => setBudget(b)}>{b / 10000}만</button>)}</div>
        </div>
        <div className="eff-row">
          <div><span className="lbl">적용 범위</span><div className="seg" role="group" aria-label="적용 범위">
            <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>전체 게임</button>
            <button aria-pressed={scope === 'cart'} onClick={() => setScope('cart')}>담은 게임 {cart.length}개</button></div></div>
          <div><span className="lbl">비용 가정</span><div className="seg" role="group" aria-label="비용 가정">
            <button aria-pressed={mode === 'conservative'} onClick={() => setMode('conservative')} title="큰 게임일수록 비용이 크고, 운영 조치를 겹쳐도 매출 2배까지만 인정">보수적</button>
            <button aria-pressed={mode === 'standard'} onClick={() => setMode('standard')} title="게임 크기와 관계없이 같은 비용, 운영 조치를 겹쳐 매출 3배까지 인정">표준</button></div></div>
          <label className="field sm"><span>실현율 (가정)</span><select aria-label="실현율" value={real} onChange={e => setReal(Number(e.target.value))}>{[.25, .5, .75, 1].map(v => <option key={v} value={v}>{pct(v, 0)}</option>)}</select></label>
          <label className="field sm"><span>플랫폼 수수료 (가정)</span><select aria-label="수수료" value={fee} onChange={e => setFee(Number(e.target.value))}>{[0, .15, .3].map(v => <option key={v} value={v}>{pct(v, 0)}</option>)}</select></label>
        </div>
        <div className="filters tog-row">
          <button className={'tog' + (mkt ? ' on' : '')} aria-pressed={mkt} onClick={() => setMkt(!mkt)} title="첫 주 마케팅비가 다른 게임을 비교한 값이며, D7 이후 추가 집행의 효과는 아닙니다">마케팅 증액 포함 (비교 참고)</button>
          <button className={'tog' + (chan ? ' on' : '')} aria-pressed={chan} onClick={() => setChan(!chan)} title="설명서 가정상 D7 수익화 설정은 90일 동안 유지됩니다. 켜면 다음 버전 시나리오로 계산합니다">수익 채널 추가 포함 (다음 버전 시나리오)</button>
        </div>
        <details className="formula"><summary>조치별 단가 수정 (가정값)</summary>
          <div className="cost-grid">{COSTS.map(([k, n]) => <label key={k} className="field"><span>{n}</span><input aria-label={n + ' 단가'} type="number" min="0" step="500" value={costs[k]} onChange={e => setCosts({ ...costs, [k]: Math.max(0, Number(e.target.value) || 0) })} /></label>)}</div>
          <p>단가는 설명용 가정값입니다. 회사 숫자로 바꿔 넣으면 결과가 다시 계산됩니다. 보수적 설정은 단가에 AAA ×4, Mid-size ×2, Unknown ×1.5를 곱합니다.</p>
        </details>
      </Card>

      <Card title="이 예산을 쓰면">
        <div className="kpis">
          <div><span>실제 투입</span><b data-testid="eff-spent">{money(r.spent)}</b><small>조치 {r.picks.length}건 · 게임 {r.byGame.length}개</small></div>
          <div><span>예상 증분 매출</span><b data-testid="eff-gain">{money(r.gain)}</b><small>실현율 {pct(real, 0)} 반영</small></div>
          <div><span>수수료·투입 비용 제외</span><b className={r.net >= 0 ? 'up' : 'down'}>{money(r.net)}</b><small>수수료 {pct(fee, 0)} 가정</small></div>
          <div><span>1달러당 회수</span><b data-testid="eff-per">{money(r.perDollar).replace('$', '$')}</b><small>손익분기 ${th.toFixed(2)}</small></div>
        </div>
        {eq > 0 && <p className="eff-msg">같은 예산을 게임별로 똑같이 마케팅에 나누면 증분 {money(eq)}입니다. 효율 순서로 쓰면 <b>{times(r.gain / eq)}</b>입니다.</p>}
        {r.spent < budget && r.stop !== 'budget' && <p className="eff-msg">손익분기를 넘는 조치가 더 없어서 {money(budget - r.spent)}은 쓰지 않는 것이 낫습니다.</p>}
        <p className="hint">시뮬레이션 금액은 단가와 실현율 가정에 따라 크게 달라집니다. 금액보다 순서와 배분 비율을 보세요. 매출 상승을 보장하지 않습니다.</p>
      </Card>

      <Card title="어디에 쓰나요">
        {r.byLever.length === 0 && <p className="body">이 조건에서 손익분기를 넘는 조치가 없습니다.</p>}
        <table className="cmp lev">
          <thead><tr><th>조치</th><th className="r">건수</th><th className="r">투입</th><th>예산 비중</th><th className="r">예상 증분</th><th>증분 비중</th></tr></thead>
          <tbody>{r.byLever.map(l => <tr key={l.lever}>
            <td>{LABEL[l.lever]}</td><td className="r num">{l.count}</td><td className="r num">{money(l.cost)}</td>
            <td><span className="share"><i><u style={{ width: `${l.costShare * 100}%` }} /></i><em>{pct(l.costShare, 0)}</em></span></td>
            <td className="r num">{money(l.gain)}</td>
            <td><span className="share g"><i><u style={{ width: `${l.gainShare * 100}%` }} /></i><em>{pct(l.gainShare, 0)}</em></span></td></tr>)}</tbody>
        </table>
      </Card>

      <Card title="얼마까지 쓸 만한가요">
        <div className="kpis three">
          <div><span>1달러당 $5 이상 유지</span><b>{money(cap5)}</b><small>우선 집행 구간</small></div>
          <div><span>손익분기까지</span><b data-testid="eff-cap">{money(full.spent)}</b><small>이 이상은 손해로 추정</small></div>
          <div><span>손익분기까지의 증분</span><b>{money(full.gain)}</b><small>실현율 {pct(real, 0)} 반영</small></div>
        </div>
        <InvestCurve picks={full.picks} budget={budget} />
        <p className="hint">파란 선은 예산을 늘릴 때의 누적 증분 매출입니다. 점선이 지금 입력한 예산입니다. 뒤로 갈수록 기울기가 줄어듭니다.</p>
      </Card>

      <Card title={`게임별 투자안 ${r.byGame.length}개`}>
        <div className="tbl-x gp"><table className="bd">
          <thead><tr><th>게임</th><th>위험</th><th>조치</th><th className="r">투입</th><th className="r">예상 증분</th><th className="r">1달러당</th><th /></tr></thead>
          <tbody>{r.byGame.slice(0, 40).map(p => {
            const main = [...p.actions].sort((a, b) => b.gain - a.gain)[0];
            return <tr key={p.game.id}>
              <td><Link className="chip" to={'/game/' + p.game.id}>{p.game.id.replace('REV4_', '')}</Link></td>
              <td>{p.game.grade ? <GradeBadge grade={p.game.grade as Grade} n={p.game.nFix} /> : <span className="dim">수익 구조 없음</span>}</td>
              <td className="acts-c">{p.actions.map(a => LABEL[a.lever]).join(', ')}{p.game.grade && <small>{GRADE_LEVEL[p.game.grade as Grade]} 위험 · {p.game.genre}</small>}</td>
              <td className="r num">{money(p.cost)}</td><td className="r num">{money(p.gain)}</td><td className="r num">{money(p.gain / p.cost)}</td>
              <td><Link className="btn sm" to={`/plans/new/${p.game.id}/${keyOf(p.game, main.lever)}`}>개선안</Link></td></tr>;
          })}</tbody>
        </table></div>
        {r.byGame.length > 40 && <p className="hint">상위 40개만 표시합니다.</p>}
      </Card>
    </Page>
  );
}
