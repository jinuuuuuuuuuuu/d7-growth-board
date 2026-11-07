import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/data';
import { money, pct, smoney } from '../lib/format';
import { LABEL, allocate, equalMarketing, leverOptions, threshold, type AllocBase, type AllocConfig, type Lever, type LeverGame, type Pick } from '../lib/allocator';
import { Card, Empty, Page, StatCard, StatsHead, TopBar } from '../components/ui';
import { InvestCurve, type Series } from '../components/InvestCurve';

const ROWS: [Lever, string][] = [['update', '업데이트 단축'], ['crash', '충돌 개선'], ['apk', '앱 용량 경량화'], ['engage', '참여 개선'], ['marketing', '마케팅 조각'], ['ads', '광고 추가 (다음 버전)'], ['iap', '인앱결제 추가 (다음 버전)']];
const keyOf = (g: LeverGame, l: Lever) => (l === 'marketing' ? 'mkt_15' : l === 'ads' || l === 'iap' ? 'structure' : g.k[l] ?? 'structure');
const line = (picks: Pick[], x0: number) => {
  const step = Math.max(1, Math.floor(picks.length / 240));
  return [{ x: x0, y: 0 }, ...picks.filter((_, i) => i % step === 0 || i === picks.length - 1).map(p => ({ x: p.spent, y: p.cumGain }))];
};

/* 입력 중에는 칸을 비워 둘 수 있고, 올바른 숫자만 계산에 넘긴다 */
function NumInput({ label, value, onCommit, min = 0, max = Infinity, step }: { label: string; value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input aria-label={label} type="number" min={min} max={max === Infinity ? undefined : max} step={step} value={draft ?? value}
    onChange={e => { const t = e.target.value, n = Number(t); setDraft(t); if (t !== '' && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n))); }}
    onBlur={() => setDraft(null)} />;
}

export default function Efficiency() {
  const { meta, current } = useApp();
  const [levers, setLevers] = useState<LeverGame[] | null>(null);
  const [budgetK, setBudgetK] = useState(200);
  const [mode, setMode] = useState<'conservative' | 'standard'>('conservative');
  const [real, setReal] = useState(0.5);
  const [fee, setFee] = useState(30);
  const [maxA, setMaxA] = useState<number | null>(null);
  const [costs, setCosts] = useState<AllocBase['costs']>(meta.alloc.conservative.costs);
  const [stepC, setStepC] = useState(meta.alloc.conservative.marketingStep);
  const [on, setOn] = useState<Record<Lever, boolean>>({ update: true, crash: true, apk: true, engage: true, marketing: false, ads: false, iap: false });
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/levers.json`).then(r => r.json()).then(setLevers); }, []);

  const game = current ? levers?.find(g => g.id === current) : undefined;
  const cfg = useMemo<AllocConfig>(() => ({
    ...meta.alloc[mode], costs, marketingStep: stepC, fee: fee / 100, realization: real, maxActions: maxA,
    enabled: (Object.keys(on) as Lever[]).filter(k => on[k]),
  }), [meta, mode, costs, stepC, fee, real, maxA, on]);
  const games = useMemo(() => (game ? [game] : (levers ?? []).filter(g => on.ads || on.iap || !g.zero)), [game, levers, on.ads, on.iap]);
  const budget = budgetK * 1000;
  const r = useMemo(() => allocate(games, cfg, budget), [games, cfg, budget]);
  const full = useMemo(() => allocate(games, cfg, Infinity), [games, cfg]);
  const series = useMemo<Series[]>(() => {
    const mk = { ...cfg, enabled: ['marketing'] as Lever[] };
    const m = allocate(games, mk, Infinity);
    const x0 = Math.min(1000, cfg.marketingStep);
    const out: Series[] = [{ name: '선택한 조치 최적', color: '#006AFF', pts: line(full.picks, x0) }];
    if (m.picks.length) out.push({ name: '마케팅만 최적', color: '#525256', pts: line(m.picks, x0) });
    if (!game && m.picks.length) {
      const top = Math.max(m.spent, full.spent);
      const pts = Array.from({ length: 36 }, (_, i) => { const v = x0 * (top / x0) ** (i / 35); return { x: v, y: equalMarketing(games, mk, v) }; });
      out.push({ name: '마케팅만 균등', color: '#A3A3A3', dash: '6 5', pts });
    }
    return out;
  }, [games, cfg, full, game]);
  // 예산을 직접 고치기 전까지는 그 게임의 손익분기 예산을 따라간다
  const touched = useRef(false), lastId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!levers) return;
    if (lastId.current !== game?.id) { lastId.current = game?.id; touched.current = false; }
    if (!touched.current) setBudgetK(game ? Math.ceil(full.spent / 1000) : 200);
  }, [game?.id, !!levers, full.spent]); // eslint-disable-line react-hooks/exhaustive-deps

  const th = threshold(cfg);
  // 손익분기를 넘는 조치가 없을 때: 단가를 1로 두고 다시 계산해, 효과가 가장 큰 조치와 투자 가능한 단가를 찾는다
  const best = useMemo(() => {
    if (!game || full.picks.length) return null;
    const unit = Object.fromEntries(Object.keys(costs).map(k => [k, 1])) as AllocBase['costs'];
    const p = allocate([game], { ...cfg, costs: unit, enabled: cfg.enabled.filter(l => l !== 'marketing') }, Infinity).picks[0];
    return p ? { lever: p.lever, gain: p.gain, cost: Math.floor(p.efficiency / th) } : null;
  }, [game, full, cfg, costs, th]);
  const at = (t: number) => full.picks.filter(p => p.efficiency >= t).reduce((b, p) => Math.max(b, p.spent), 0);
  const pickK = (v: number) => { touched.current = true; setBudgetK(Math.max(1, Math.ceil(v / 1000))); };
  // 체크한 조치 전부를 비용, 증분, 판단과 함께 보여준다
  const rows = useMemo(() => {
    if (!game) return [];
    const opts = leverOptions(game, cfg);
    return cfg.enabled.map(l => {
      const o = opts.find(x => x.lev === l), ps = full.picks.filter(p => p.lever === l);
      if (!o) return { l, cost: 0, gain: 0, per: 0, be: 0, rank: 3, status: l === 'ads' || l === 'iap' ? '이미 운영 중' : l === 'marketing' ? '증액 상한 초과' : '개선 여지 없음' };
      const cost = ps.length ? ps.reduce((a, p) => a + p.cost, 0) : o.cost, gain = ps.length ? ps.reduce((a, p) => a + p.gain, 0) : o.gain;
      const unit = l === 'marketing' ? stepC : costs[l as keyof AllocBase['costs']];
      const inR = r.picks.some(p => p.lever === l);
      return { l, cost, gain, per: gain / cost, be: Math.floor((o.gain / o.cost) * unit / th), rank: inR ? 0 : ps.length ? 1 : 2, status: inR ? '투자' : ps.length ? '예산 부족' : '회수 불가' };
    }).sort((a, b) => a.rank - b.rank || b.per - a.per);
  }, [game, cfg, full, r, costs, stepC, th]);
  const last = r.picks.length ? r.picks[r.picks.length - 1].efficiency : 0;
  const title = current ?? '전체 게임';

  const left = <>
    <StatsHead title="효율" sub={game ? `${current}의 매출을 가장 효율적으로 높이는 방법입니다` : '게임을 고르지 않으면 전체 게임에 예산을 나눕니다'} />
    <StatCard title="총예산" tag="입력">
      <label className="big-in"><NumInput label="총예산" step={game ? 1 : 10} value={budgetK} onCommit={v => { touched.current = true; setBudgetK(v); }} /><span>천 달러</span></label>
      <div className="stat-row"><span>사용</span><span>{money(r.spent)}</span></div>
      <div className="stat-row"><span>남음</span><span>{money(budget - r.spent)}</span></div>
    </StatCard>
    <StatCard title="예산 추천" tag="투자 곡선" value={<span data-testid="eff-cap">{money(full.spent)}</span>} note={`마지막 1달러가 손익분기 $${th.toFixed(2)} 이상을 회수하는 동안 쓸 수 있는 최대 예산입니다.`}>
      {[10, 5, 3].filter(t => t > th && at(t) > 0).map(t => <div key={t} className="stat-row rec"><span>1달러당 {t} 이상까지</span><span>{money(at(t))}<button className="link" onClick={() => pickK(at(t))}>적용</button></span></div>)}
      <div className="stat-row rec"><span>손익분기까지</span><span>{money(full.spent)}<button className="link" onClick={() => pickK(full.spent)}>적용</button></span></div>
    </StatCard>
    <StatCard title="조치 단가" tag="가정" note="체크한 조치만 계산하고, 입력하면 바로 반영됩니다. 설명용 가정값이니 회사 단가로 바꿔 넣으세요.">
      <div className="lever-list">{ROWS.map(([k, n]) => (
        <div key={k} className="lv"><label><input type="checkbox" aria-label={n + ' 사용'} checked={on[k]} onChange={e => setOn({ ...on, [k]: e.target.checked })} /><span>{n}</span></label>
          <span className="lv-in">$<NumInput label={n + ' 단가'} min={1} step={500} value={k === 'marketing' ? stepC : costs[k]} onCommit={v => { if (k === 'marketing') setStepC(v); else setCosts({ ...costs, [k]: v }); }} /></span></div>
      ))}</div>
    </StatCard>
    <StatCard title="계산 설정" tag={mode === 'conservative' ? '보수' : '기본'}>
      <div className="seg full" role="group" aria-label="비용 가정">
        <button aria-pressed={mode === 'standard'} onClick={() => setMode('standard')}>기본</button>
        <button aria-pressed={mode === 'conservative'} onClick={() => setMode('conservative')}>보수</button>
      </div>
      <div className="stat-row set"><span>스토어 수수료</span><span className="lv-in"><NumInput label="수수료" max={60} value={fee} onCommit={setFee} />%</span></div>
      <div className="stat-row set"><span>실현율 (가정)</span><select aria-label="실현율" value={real} onChange={e => setReal(Number(e.target.value))}>{[.25, .5, .75, 1].map(v => <option key={v} value={v}>{pct(v, 0)}</option>)}</select></div>
      <div className="stat-row set"><span>게임당 조치 상한</span><select aria-label="게임당 조치 상한" value={maxA ?? ''} onChange={e => setMaxA(e.target.value ? Number(e.target.value) : null)}><option value="">제한 없음</option>{[1, 2, 3].map(v => <option key={v} value={v}>{v}개</option>)}</select></div>
      <p className="stat-note">보수: 운영 조치를 겹쳐도 매출 2배까지만 인정하고, 큰 게임일수록 비용이 크다고 가정합니다 (AAA ×4, Mid-size ×2, Unknown ×1.5).</p>
    </StatCard>
  </>;

  if (!levers) return <Page stats={<StatsHead title="효율" sub="" />}><TopBar title="효율" /><div className="boot">배분 데이터를 불러오는 중입니다.</div></Page>;
  if (current && !game) return <Page stats={<StatsHead title="효율" sub={current} />}><TopBar title="효율" /><Card><Empty to="/diagnose" cta="게임 진단으로">이 게임은 효율 계산 대상이 아닙니다.</Empty></Card></Page>;

  return (
    <Page stats={left}>
      <TopBar title={game ? `효율 · ${title}` : '효율 · 전체 게임'} />
      <div className="kpis top">
        <div><span>투입 예산</span><b data-testid="eff-spent">{money(r.spent)}</b><small>입력 {money(budget)}</small></div>
        <div><span>예상 증분 매출</span><b className="up" data-testid="eff-gain">{smoney(r.gain)}</b><small>실현율 {pct(real, 0)} 반영, 연관 기반 추정</small></div>
        <div><span>1달러당 회수</span><b data-testid="eff-per">{r.perDollar.toFixed(1)}</b><small>마지막 1달러 {last.toFixed(1)}</small></div>
        {game ? <div><span>적용 조치</span><b>{r.byLever.length}개</b><small>예측 {money(game.pred)} → {money(game.pred + r.gain)}</small></div>
          : <div><span>투자 게임</span><b>{r.byGame.length}개</b><small>{r.stop === 'budget' ? '예산 소진' : '손익분기 도달'}</small></div>}
      </div>
      {game && full.picks.length === 0 && <p className="banner" data-testid="eff-best">{best
        ? `현재 단가로는 비용을 회수하는 조치가 없습니다. 효과가 가장 큰 조치는 ${LABEL[best.lever]}(예상 증분 ${smoney(best.gain)})이며, 단가가 ${money(best.cost)} 이하이면 투자할 만합니다.`
        : '이 게임은 지금 체크한 조치로 개선할 항목이 없습니다. 수익 구조가 없는 게임은 광고·인앱결제 추가를 체크해 보세요.'}</p>}
      {!(game && full.picks.length === 0) && <Card title="얼마를 써야 하나요 · 투자 곡선" right={<div className="lg-inline">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>}>
        <p className="hint">예산을 늘릴수록 1달러의 효과가 줄어듭니다. 곡선을 누르면 그 지점의 예산으로 설정됩니다. 가로축은 로그 눈금입니다.</p>
        <InvestCurve series={series} budget={budget} cap={full.spent} onPick={pickK} />
      </Card>}
      {game ? <Card title="이 게임에 무엇을 먼저 할까요">
        <p className="hint">체크한 조치의 손익입니다. 1달러당 회수가 손익분기 ${th.toFixed(2)} 이상이면 투자합니다. 손익분기 단가는 이 조치를 가장 먼저 할 때의 기준입니다.</p>
        <div className="tbl-x"><table className="cmp lvt">
          <thead><tr><th>조치</th><th className="r">비용</th><th className="r">예상 증분</th><th className="r">1달러당</th><th className="r">손익분기 단가</th><th>판단</th><th /></tr></thead>
          <tbody>{rows.map(x => (
            <tr key={x.l} className={x.rank === 0 ? 'pick' : ''}>
              <td><b>{LABEL[x.l]}</b></td>
              {x.rank === 3 ? <><td className="r" data-l="비용">—</td><td className="r" data-l="예상 증분">—</td><td className="r" data-l="1달러당">—</td><td className="r" data-l="손익분기 단가">—</td></>
                : <><td className="r num" data-l="비용">{money(x.cost)}</td><td className="r num" data-l="예상 증분">{smoney(x.gain)}</td><td className="r num" data-l="1달러당">{x.per.toFixed(2)}</td><td className="r num" data-l="손익분기 단가">{money(x.be)}</td></>}
              <td data-l="판단"><span className={'verdict v' + x.rank}>{x.status}</span></td>
              <td className="c-act">{x.rank < 3 && <Link className="btn sm" to={`/plans/new/${game.id}/${keyOf(game, x.l)}`}>개선안</Link>}</td>
            </tr>
          ))}</tbody>
        </table></div>
        {rows.length === 0 && <p className="body">왼쪽에서 조치를 체크해 주세요.</p>}
      </Card> : <Card title="조치별 배분" right={<div className="lg-inline"><span><i style={{ background: '#006AFF' }} />예산 비중</span><span><i style={{ background: '#A3A3A3' }} />매출 비중</span></div>}>
        <p className="hint">예산 비중보다 매출 비중이 큰 조치가 가성비가 좋은 조치입니다.</p>
        {r.byLever.length === 0 && <p className="body">이 예산으로 고를 수 있는 조치가 없습니다.</p>}
        <div className="lvs">{r.byLever.map(l => (
          <div key={l.lever} className="lvr">
            <div className="lvr-n"><b>{LABEL[l.lever]}</b><small>{l.count}회 · {money(l.cost)}</small></div>
            <div className="lvr-b">
              <span className="share"><i><u style={{ width: `${l.costShare * 100}%` }} /></i><em>{pct(l.costShare, 0)}</em></span>
              <span className="share g"><i><u style={{ width: `${l.gainShare * 100}%` }} /></i><em>{pct(l.gainShare, 0)}</em></span>
            </div>
            <div className="lvr-e">1달러당 {(l.gain / l.cost).toFixed(1)}</div>
          </div>
        ))}</div>
        <p className="hint top8">게임 진단에서 게임을 고르면 그 게임 하나의 효율로 바뀌고, 조치별 개선안을 만들 수 있습니다.</p>
      </Card>}
      <Card><details className="formula"><summary>계산 방식과 한계</summary>
        <p>효율은 실현율을 반영한 증분 매출을 비용으로 나눈 값입니다. 효율이 가장 높은 조치부터 고르고, 고른 게임의 다른 조치를 다시 계산합니다. 손익분기 효율은 1 ÷ (1 − 수수료)입니다.</p>
        <p>매출 배수는 팀 모델 재예측값이고, 마케팅은 퍼블리셔 등급별 탄력성을 씁니다. 단가, 실현율, 수수료는 가정값이므로 금액보다 순서와 배분 비율을 보세요. 비슷한 게임끼리 비교한 추정이며 매출 상승을 보장하지 않습니다.</p>
        <p>마케팅은 첫 주 집행액이 다른 게임끼리의 비교값이고, 광고·인앱결제 추가는 D7 수익화 설정이 90일 유지된다는 데이터 가정 밖의 시나리오입니다.</p>
      </details></Card>
    </Page>
  );
}
