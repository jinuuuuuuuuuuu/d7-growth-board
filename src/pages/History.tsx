import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/data';
import { money, pct } from '../lib/format';
import { Card, Page, StatCard, StatsHead, TopBar } from '../components/ui';

const CH = ['#006AFF', '#7FB2FF', '#A3A3A3', '#1A1919'];

function Pair({ title, a, b, la, lb }: { title: string; a?: number | null; b?: number | null; la: string; lb: string }) {
  const mx = Math.max(a ?? 0, b ?? 0, 1);
  const R = ({ v, l, c }: { v?: number | null; l: string; c: string }) => (
    <div className="pair-r"><span>{l}</span><i><u style={{ width: `${((v ?? 0) / mx) * 100}%`, background: c }} /></i><b>{v == null ? '표본 부족' : money(v)}</b></div>
  );
  return <Card title={title}><R v={a} l={la} c="#006AFF" /><R v={b} l={lb} c="#A3A3A3" /></Card>;
}

export default function HistoryPage() {
  const { id: pid } = useParams();
  const nav = useNavigate();
  const { meta, index, cluster } = useApp();
  const dflt = index.find(g => g.id === meta.portfolio[0]?.id)?.cluster_id ?? meta.clusters[0].id;
  const c = cluster(pid ?? dflt) ?? cluster(dflt)!;
  const h = c.history;
  const share = Object.entries(h.channel_share ?? {});
  return (
    <Page stats={<>
      <StatsHead title="과거 실제 매출" sub="학습 게임의 실제 매출입니다. D7 진단 화면과 구분해 주세요." />
      {c.id === 'Z00' || c.id === 'M00' ? <StatCard title={c.id === 'M00' ? '마케팅 결측 게임' : '수익 구조 없는 게임'} note={h.note} /> : <>
        <StatCard title="실제 매출 중앙값" tag={`${h.n_train}개`} value={money(h.p50)} row={['기준 종류', h.bench ?? '']} />
        <StatCard title="실제 매출 범위" tag="25~75%" note={`${money(h.p25)} ~ ${money(h.p75)}`} />
        <StatCard title="마케팅비 대비 매출" tag="ROAS" value={h.roas_median == null ? '표본 부족' : `${h.roas_median}배`} row={['1배 미만 게임', pct(h.loss_rate)]} />
      </>}
    </>}>
      <TopBar title="과거 성과 분석" />
      <Card title="게임군 선택">
        <label className="field wide"><span>게임군</span><select value={c.id} onChange={e => nav('/history/' + e.target.value)}>{meta.clusters.map(x => <option key={x.id} value={x.id}>{x.id} · {x.label}</option>)}</select></label>
      </Card>
      {c.id !== 'Z00' && c.id !== 'M00' && <>
        <Card title="채널별 실제 매출 구성">
          <div className="stack">{share.map(([k, v], i) => v > 0 && <i key={k} style={{ flex: v, background: CH[i] }} title={`${k} ${pct(v)}`} />)}</div>
          <div className="lg-inline">{share.map(([k, v], i) => <span key={k}><i style={{ background: CH[i] }} />{k} {pct(v)}</span>)}</div>
        </Card>
        <Pair title="충돌률 기준 실제 매출 중앙값" a={h.crash_ok_median} b={h.crash_bad_median} la="3% 이하" lb="3% 초과" />
        <Pair title="업데이트 간격 기준 실제 매출 중앙값" a={h.update_ok_median} b={h.update_bad_median} la="35일 이내" lb="35일 초과" />
      </>}
    </Page>
  );
}
