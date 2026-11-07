import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp, useGame } from '../lib/data';
import { GRADE_COLOR, QUAD, metric, money, pct, prob, smoney, spct } from '../lib/format';
import type { Game, Lever } from '../lib/types';
import { Card, Empty, GradeBadge, Page, StatCard, StatsHead, TopBar } from '../components/ui';
import { Slider } from '../components/Slider';

function Gauge({ p, grade }: { p: number; grade: 'A' | 'B' | 'C' | 'D' | 'E' }) {
  const r = 58, c = 2 * Math.PI * r;
  return (
    <div className="donut" style={{ width: 146, height: 146 }}>
      <svg viewBox="0 0 146 146" role="img" aria-label={`미달 확률 ${pct(p)}`}>
        <circle cx="73" cy="73" r={r} fill="none" stroke="#EFEFEA" strokeWidth="20" />
        <circle cx="73" cy="73" r={r} fill="none" stroke={GRADE_COLOR[grade]} strokeWidth="20" strokeDasharray={`${p * c} ${c}`} transform="rotate(-90 73 73)" />
      </svg>
      <div className="donut-c"><b>{grade}</b><span>{pct(p)}</span></div>
    </div>
  );
}

function Simulator({ g }: { g: Game }) {
  const { meta } = useApp();
  const grid = meta.grid, w = g.w!, m = g.metrics;
  const start = useMemo(() => ({ crash: m.crash ?? 0, update: m.update, marketing: 1, engage: 1, apk: m.apk }), [m]);
  const [v, setV] = useState<Record<Lever, number>>(start);
  const [cost, setCost] = useState(0);
  const set = (k: Lever) => (x: number) => setV(s => ({ ...s, [k]: x }));
  const mult = (k: Lever) => {
    const arr = w[k]; if (!arr || v[k] === start[k]) return 1;
    const i = grid[k].indexOf(v[k]); return i >= 0 ? arr[i] : 1;
  };
  const total = mult('crash') * mult('update') * mult('marketing') * mult('engage') * mult('apk');
  const np = g.pred * total;
  const addMkt = m.marketing && v.marketing !== 1 ? m.marketing * (v.marketing - 1) : 0;
  const net = np - g.pred - addMkt - cost;
  const mx = Math.max(g.pred, np, 1);
  const crashMax = Math.max(6, Math.ceil(m.crash ?? 0));
  const updMax = Math.max(90, m.update);
  const apkMax = Math.max(500, Math.ceil(m.apk));
  const changed = (Object.keys(start) as Lever[]).some(k => v[k] !== start[k]);
  const recommended = g.actions.filter(x => !x.ref_only);
  const applyRec = () => setV(cur => {
    const n = { ...start, marketing: cur.marketing };
    for (const x of recommended) {
      if (x.lever === 'engage') n.engage = 1.2;
      else if (x.lever === 'update' || x.lever === 'crash' || x.lever === 'apk') n[x.lever] = x.to_value;
    }
    return n;
  });
  return (
    <div className="sim">
      <div className="sim-l">
        {w.crash && <Slider label="충돌률" min={0.25} max={crashMax} current={start.crash} stops={grid.crash.filter(x => x <= crashMax)} value={v.crash} onChange={set('crash')} fmt={x => x.toFixed(2) + '%'} marks={[{ at: 3, text: '기준선 3%' }]} hint="3% 표시가 기준선" />}
        <Slider label="업데이트 간격" min={2} max={updMax} current={start.update} stops={grid.update.filter(x => x <= updMax)} value={v.update} onChange={set('update')} fmt={x => Math.round(x) + '일'} marks={[{ at: 14, text: '기준선 14일' }, { at: 35, text: '기준선 35일' }]} hint="14일, 35일을 넘을 때 차이가 큼" />
        {w.marketing && m.marketing && <Slider label="마케팅비 (비교 참고)" min={0.5} max={3} current={1} stops={grid.marketing} value={v.marketing} onChange={set('marketing')} fmt={x => `${money(m.marketing! * x)} (×${x})`} />}
        <Slider label="참여도 (하루 이용 시간)" min={0.7} max={1.5} current={1} stops={grid.engage} value={v.engage} onChange={set('engage')} fmt={x => `${(m.engage * x).toFixed(1)}분 (×${x})`} />
        <Slider label="앱 용량" min={25} max={apkMax} current={start.apk} stops={grid.apk.filter(x => x <= apkMax)} value={v.apk} onChange={set('apk')} fmt={x => x.toFixed(0) + 'MB'} marks={[{ at: 175, text: '기준선 175MB' }]} hint="175MB 표시가 기준선" />
      </div>
      <div className="sim-r">
        <div className="sim-row"><span>조정 후 예측 매출</span><b data-testid="sim-pred">{money(np)}</b></div>
        <div className="sim-row"><span>매출 변화 (×{total.toFixed(3)})</span><b>{smoney(np - g.pred)}</b></div>
        <div className="sim-row"><span>추가 마케팅비</span><b>{money(addMkt)}</b></div>
        <label className="sim-row"><span>개발·업데이트 비용 입력</span><input type="number" min="0" step="100" value={cost} onChange={e => setCost(Math.max(0, Number(e.target.value) || 0))} /></label>
        <div className="sim-big"><span>입력 비용 제외 예상 매출 변화</span><b className={net >= 0 ? 'up' : 'down'} data-testid="sim-net">{smoney(net)}</b></div>
        <div className="sim-bars">
          <div><em>현재</em><span><i style={{ width: `${(g.pred / mx) * 100}%`, background: '#A3A3A3' }} /></span><b>{money(g.pred)}</b></div>
          <div><em>조정 후</em><span><i style={{ width: `${(np / mx) * 100}%`, background: '#006AFF' }} /></span><b>{money(np)}</b></div>
        </div>
        {recommended.length > 0 && <button className="btn wide" onClick={applyRec}>추천 조치 적용</button>}
        {changed && <button className="btn-o wide" onClick={() => { setV(start); setCost(0); }}>현재값으로 되돌리기</button>}
        {v.marketing !== 1 && <p className="warn-s">초기 집행액이 다른 게임끼리 비교한 값이며 D7 이후 추가 집행의 효과는 아닙니다.</p>}
      </div>
      <p className="sim-note">비슷한 게임과 비교한 시뮬레이션이며 매출 상승을 보장하지 않습니다. 실험으로 확인해야 합니다. 검은 선이 현재값이고 회색 선이 기준선입니다. 값은 우리 모델에 입력값을 바꿔 넣어 미리 계산한 지점에 맞춰 움직입니다.</p>
    </div>
  );
}

export default function GamePage() {
  const { id } = useParams();
  const g = useGame(id);
  const { cart, toggleCart, cluster, meta } = useApp();
  if (g === undefined) return <div className="boot">게임 정보를 불러오는 중입니다.</div>;
  if (g === null) return <Page stats={<StatsHead title="게임 없음" sub={id ?? ''} />}><TopBar title="게임 상세" /><Empty to="/diagnose" cta="게임 진단으로">이 ID의 게임을 찾지 못했습니다.</Empty></Page>;
  const c = cluster(g.cluster_id);
  const inCart = cart.includes(g.id);
  const head = <TopBar title={<Link className="back" to={'/diagnose/' + g.cluster_id}><ArrowLeft size={18} />{c?.label}</Link>}>
    <button className={'btn-o' + (inCart ? ' on' : '')} onClick={() => toggleCart(g.id)} aria-pressed={inCart}>{inCart ? '효율 계획에 담음' : '효율 계획에 담기'}</button>
  </TopBar>;
  const sub = `${g.genre} · ${g.sub_genre} · ${g.model} · ${g.tier} · ${g.region}`;
  if (g.excluded) return (
    <Page stats={<><StatsHead title={g.id} sub={sub} /><StatCard title="예측 90일 매출" tag="모델" value={money(g.pred)} note={`80% 범위 ${money(g.pred_lo80)} ~ ${money(g.pred_hi80)}`} /></>}>
      <TopBar title={<Link className="back" to="/diagnose/M00"><ArrowLeft size={18} />{c?.label}</Link>} />
      <Card title="마케팅 결측 게임"><p className="body">첫 주 마케팅비가 비어 있는 게임입니다. 예측 오차가 약 1.7배로 커서 비슷한 게임군 비교, 위험 등급, 조정 시뮬레이션을 제공하지 않습니다. 모델이 예측한 90일 매출만 참고용으로 보여줍니다.</p></Card>
    </Page>
  );
  if (g.zero) return (
    <Page stats={<><StatsHead title={g.id} sub={sub} /><StatCard title="예측 90일 매출" tag="규칙" value={money(0)} note="수익 구조가 없어 매출이 0으로 확정됩니다." /></>}>
      {head}
      <Card title="수익 구조 없는 게임"><p className="body">Free·Freemium이면서 광고와 인앱결제가 모두 없는 게임입니다. 위험 등급을 매기지 않습니다. 설명서 가정상 D7 수익화 설정은 90일 동안 유지되므로 수익 채널 추가 효과를 90일 예측에 더하지 않고, 다음 버전 구조 검토 대상으로만 둡니다.</p>
        <Link className="btn" to={`/plans/new/${g.id}/structure`}>구조 검토 개선안 만들기</Link></Card>
    </Page>
  );
  const grade = g.risk_grade!;
  const main = g.actions.filter(a => !a.ref_only);
  const sigs = [g.signals?.crash && '충돌률 3% 초과', g.signals?.update && '업데이트 35일 초과'].filter(Boolean) as string[];
  return (
    <Page stats={<>
      <StatsHead title={g.id} sub={sub} />
      <StatCard title="예측 90일 매출" tag="모델" value={money(g.pred)} note={`80% 범위 ${money(g.pred_lo80)} ~ ${money(g.pred_hi80)}`} row={['기대 매출', money(g.peer_median)]} />
      <StatCard title="위험도" tag={`${g.risk_rank}/${c?.n_test ?? g.cluster_n}위`}>
        <div className="donut-wrap"><Gauge p={g.risk_prob!} grade={grade} /></div>
        <p className="stat-note center">같은 마케팅비를 쓴 비슷한 게임의 기대 매출에 못 미칠 확률 <b>{prob(g.risk_prob)}</b></p>
        <div className="stat-row"><span>위험 수준</span><span><GradeBadge grade={grade} n={g.n_fix} /></span></div>
        <div className="stat-row"><span>고칠 신호</span><span>{sigs.length ? sigs.join(', ') : '없음'}</span></div>
        <div className="stat-row"><span>군집 안 위치</span><span>{pct(g.peer_pct)}</span></div>
        <div className="stat-row"><span>처방 라벨</span><span>{QUAD[g.quadrant ?? ''] ?? '판정 불가'}</span></div>
      </StatCard>
    </>}>
      {head}
      <Card title="왜 이렇게 판단했나요">
        <div className="why">
          {g.factors.map(f => <div key={f.key} className="why-c neg"><span>{f.name}</span><b>{spct(f.contrib_pct)}</b><small>{metric(f.value, f.unit)} · 군집 {metric(f.peer_median, f.unit)}</small></div>)}
          {(g.strengths ?? []).map(f => <div key={f.key} className="why-c pos"><span>{f.name}</span><b>{spct(f.contrib_pct)}</b><small>{metric(f.value, f.unit)} · 군집 {metric(f.peer_median, f.unit)}</small></div>)}
        </div>
        <p className="hint">각 수치는 그 지표가 예측 매출에 주는 영향입니다. 빨간 칸이 {grade}등급 판단의 근거입니다.</p>
        <h3 className="sub-h">비슷한 게임군 {g.peer_n}개와 비교</h3>
        <table className="cmp">
          <thead><tr><th>지표</th><th>이 게임</th><th>군집 중앙값</th><th>군집 안 위치 (오른쪽일수록 좋음)</th><th>상태</th><th>조정</th></tr></thead>
          <tbody>{g.compare.map(r => (
            <tr key={r.key}><td>{r.name}</td><td className="num">{metric(r.value, r.unit)}</td><td className="num">{metric(r.peer_median, r.unit)}</td>
              <td><span className="pos-bar"><i className={r.status === '강점' ? 'g' : r.status === '약점' ? 'b' : ''} style={{ width: `${Math.max(3, (r.good_pct ?? 0) * 100)}%` }} /></span></td>
              <td><span className={'st ' + (r.status === '강점' ? 'g' : r.status === '약점' ? 'b' : '')}>{r.status ?? '미상'}</span></td><td className="dim">{r.adjustable}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card title="조정 시뮬레이션" id="sim"><Simulator key={g.id} g={g} /></Card>
      <Card title="추천 조치">
        {main.length === 0 && <p className="body">운영 조치 후보가 없어 유지와 확장 대상입니다.</p>}
        <div className="acts">
          {main.map((a, i) => (
            <div key={a.key} className={'act' + (i === 0 ? ' first' : '')}>
              <div className="act-h"><b>{a.label}</b>{i === 0 && <span className="first-tag">먼저 검토</span>}<em>{metric(a.from_value, a.lever === 'crash' ? '%' : a.lever === 'update' ? '일' : a.lever === 'apk' ? 'MB' : '분')} → {metric(a.to_value, a.lever === 'crash' ? '%' : a.lever === 'update' ? '일' : a.lever === 'apk' ? 'MB' : '분')}</em></div>
              <div className="act-m"><span>예상 증분 <b>{money(a.gain)}</b> ({money(a.gain_lo)} ~ {money(a.gain_hi)})</span><span>단가 대비 효율 {a.eff}배 (가정)</span><span>근거 {a.evidence}</span></div>
              {a.edge && <p className="warn-s">기준선 바로 위 게임이라 효과가 과대할 수 있습니다.</p>}
              <Link className="btn sm" to={`/plans/new/${g.id}/${a.key}`}>개선안 만들기</Link>
            </div>
          ))}
        </div>
      </Card>
      <Card><details className="formula"><summary>이 진단의 제한점 보기</summary><ul className="ul">{meta.evidence.limitations.map(x => <li key={x}>{x}</li>)}</ul></details></Card>
    </Page>
  );
}
