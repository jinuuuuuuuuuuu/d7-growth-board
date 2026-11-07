import { useApp, useGame } from '../lib/data';
import { metric, money, pct } from '../lib/format';
import { Card, Empty, Page, StatCard, StatsHead, TopBar } from '../components/ui';

const CH: [number, string, string][] = [[6, '인앱결제', '#006AFF'], [7, '광고', '#7FB2FF'], [8, '유료 판매', '#A3A3A3'], [9, '구독', '#1A1919']];
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export default function HistoryPage() {
  const { current } = useApp();
  const g = useGame(current ?? undefined);
  const head = <TopBar title={current ? `과거 성과 분석 · ${current}` : '과거 성과 분석'} />;
  if (!current) return <Page stats={<StatsHead title="과거 성과" sub="게임을 고르면 비슷한 과거 게임의 실제 성과를 보여줍니다" />}>{head}<Card><Empty to="/diagnose" cta="게임 진단으로">게임 진단에서 게임을 먼저 선택해 주세요.</Empty></Card></Page>;
  if (g === undefined) return <div className="boot">불러오는 중입니다.</div>;
  const past = g?.past;
  if (!g || !past?.length) return <Page stats={<StatsHead title="과거 성과" sub={current} />}>{head}<Card><Empty to="/diagnose" cta="게임 진단으로">이 게임은 비교할 과거 게임이 없습니다.</Empty></Card></Page>;
  const rev = past.map(p => p[1] as number), m = med(rev), lo = Math.min(...rev), hi = Math.max(...rev);
  const tot = rev.reduce((a, b) => a + b, 0) || 1;
  const share = CH.map(([i, n, c]) => ({ n, c, v: past.reduce((a, p) => a + (p[i] as number), 0) / tot }));
  const mx = Math.max(m, g.pred, 1);
  return (
    <Page stats={<>
      <StatsHead title="과거 성과" sub="학습 게임의 실제 매출입니다. D7 진단 화면과 구분해 주세요." />
      <StatCard title="비슷한 과거 게임의 실제 매출" tag={`${past.length}개`} value={money(m)} note="90일 실제 매출 중앙값" row={['범위', `${money(lo)} ~ ${money(hi)}`]} />
      <StatCard title="이 게임의 예측 매출" tag="모델" value={money(g.pred)} note="이 게임은 D7 시점이라 실제 매출이 아직 없습니다." />
    </>}>
      {head}
      <Card title="이 게임과 가장 비슷했던 과거 게임의 결과">
        <p className="hint">같은 수익 구조와 퍼블리셔의 학습 게임 중 마케팅비, 이용 시간, 충돌률, 업데이트 간격, 앱 용량이 가장 가까운 {past.length}개입니다.</p>
        <div className="pair-r"><span>과거 실제</span><i><u style={{ width: `${(m / mx) * 100}%`, background: '#A3A3A3' }} /></i><b>{money(m)}</b></div>
        <div className="pair-r"><span>이 게임 예측</span><i><u style={{ width: `${(g.pred / mx) * 100}%`, background: '#006AFF' }} /></i><b>{money(g.pred)}</b></div>
      </Card>
      <Card title="어디서 벌었나요 · 채널별 실제 매출">
        <div className="stack">{share.map(s => s.v > 0 && <i key={s.n} style={{ flex: s.v, background: s.c }} title={`${s.n} ${pct(s.v)}`} />)}</div>
        <div className="lg-inline">{share.map(s => <span key={s.n}><i style={{ background: s.c }} />{s.n} {pct(s.v)}</span>)}</div>
      </Card>
      <Card title="비슷한 과거 게임 목록">
        <div className="tbl-x"><table className="cmp">
          <thead><tr><th>게임 ID</th><th className="r">실제 90일 매출</th><th className="r">마케팅비</th><th className="r">하루 이용 시간</th><th className="r">충돌률</th><th className="r">업데이트 간격</th></tr></thead>
          <tbody>
            <tr className="me"><td>{g.id} (이 게임)</td><td className="r">아직 없음</td><td className="r num">{metric(g.metrics.marketing, 'USD')}</td><td className="r num">{metric(g.metrics.engage, '분')}</td><td className="r num">{metric(g.metrics.crash, '%')}</td><td className="r num">{metric(g.metrics.update, '일')}</td></tr>
            {past.map(p => <tr key={p[0]}><td>{p[0]}</td><td className="r num">{money(p[1] as number)}</td><td className="r num">{money(p[2] as number)}</td><td className="r num">{metric(p[3] as number, '분')}</td><td className="r num">{metric(p[4] as number, '%')}</td><td className="r num">{metric(p[5] as number, '일')}</td></tr>)}
          </tbody>
        </table></div>
      </Card>
    </Page>
  );
}
