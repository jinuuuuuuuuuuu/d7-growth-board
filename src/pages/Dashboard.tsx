import { useMemo, useState } from 'react';
import { useApp } from '../lib/data';
import { GRADES, comboName } from '../lib/format';
import { Card, Donut, GradeLegend, Page, Select, StatCard, StatsHead, TopBar } from '../components/ui';
import { GameTable } from '../components/GameTable';

const opts = (v: string[], all: string): [string, string][] => [['', all], ...v.map(x => [x, x] as [string, string])];

export default function Dashboard() {
  const { index, meta } = useApp();
  const s = meta.evidence.summary;
  const [combo, setCombo] = useState('');
  const [tier, setTier] = useState('');
  const [size, setSize] = useState('');
  const [grade, setGrade] = useState('');
  const [excl, setExcl] = useState(true);
  const [exclM, setExclM] = useState(true);
  const [sort, setSort] = useState<'risk' | 'recover'>('risk');
  const counts = Object.fromEntries(GRADES.map(g => [g, s.grades[g].n]));
  const rows = useMemo(() => {
    const r = index.filter(g => (!combo || g.combo === combo) && (!tier || g.tier === tier) && (!size || g.size === size)
      && (grade ? g.risk_grade === grade : (!excl || !g.zero) && (!exclM || !g.excluded)));
    return [...r].sort((a, b) => sort === 'risk' ? (b.risk_prob ?? 0) - (a.risk_prob ?? 0) : b.recover_ops - a.recover_ops);
  }, [index, combo, tier, size, grade, excl, exclM, sort]);
  return (
    <Page stats={<>
      <StatsHead title="전체 현황" sub={`test 게임 ${s.n_test.toLocaleString()}개 · 출시 후 7일차 기준`} />
      <StatCard title="위험 등급 분포" tag={`${s.n_live.toLocaleString()}개`}>
        <div className="donut-wrap"><Donut counts={counts} center={<><b>{s.n_live.toLocaleString()}</b><span>진단 대상 게임</span></>} /></div>
        <GradeLegend counts={counts} />
        <div className="stat-rows">
          <div className="stat-row"><span>수익 구조 없는 게임 (진단 제외)</span><span>{s.n_zero}개</span></div>
          <div className="stat-row"><span>마케팅 결측 게임 (진단 제외)</span><span>{s.n_excluded}개</span></div>
        </div>
      </StatCard>
    </>}>
      <TopBar title="대시보드" />
      <Card title="게임 찾기">
        <div className="filters">
          <Select label="수익 구조" value={combo} onChange={setCombo} options={[['', '전체'], ...['광고+인앱결제', '인앱결제', '광고', '없음'].map(x => [x, comboName(x)] as [string, string])]} />
          <Select label="퍼블리셔" value={tier} onChange={setTier} options={opts(['AAA', 'Mid-size', 'Indie', 'Unknown'], '전체')} />
          <Select label="마케팅 규모" value={size} onChange={setSize} options={[['', '전체'], ['소형', '소형'], ['중형', '중형'], ['대형', '대형'], ['미상', '결측']]} />
          <Select label="위험 등급" value={grade} onChange={setGrade} options={[['', '전체'], ...GRADES.map(g => [g, g + ' 등급'] as [string, string])]} />
        </div>
        <div className="filters tog-row">
          <button className={'tog' + (excl ? ' on' : '')} aria-pressed={excl} onClick={() => setExcl(!excl)} title={`Free·Freemium이면서 광고와 인앱결제가 없어 매출이 0으로 확정된 게임 ${s.n_zero}개`}>수익 구조 없는 게임 제외 <small>{s.n_zero}개</small></button>
          <button className={'tog' + (exclM ? ' on' : '')} aria-pressed={exclM} onClick={() => setExclM(!exclM)} title={`첫 주 마케팅비가 비어 있어 비교군과 위험 등급을 정할 수 없는 게임 ${s.n_excluded}개`}>마케팅 결측 게임 제외 <small>{s.n_excluded}개</small></button>
          <button className="btn lg" onClick={() => { setCombo(''); setTier(''); setSize(''); setGrade(''); setExcl(true); setExclM(true); }}>초기화</button>
        </div>
      </Card>
      <Card title={`게임 목록 ${rows.length.toLocaleString()}개`} right={
        <div className="seg" role="group" aria-label="정렬">
          <button aria-pressed={sort === 'risk'} onClick={() => setSort('risk')}>위험도 순</button>
          <button aria-pressed={sort === 'recover'} onClick={() => setSort('recover')} title="충돌률 3% 이하, 업데이트 35일 이내로 고쳤을 때 늘어나는 예상 매출이 큰 순서">개선 효과 큰 순</button>
        </div>}>
        <p className="hint">위험도 순은 얼마나 위험한지, 개선 효과 큰 순은 고쳤을 때 매출이 얼마나 늘어나는지 기준입니다. 두 순위는 다를 수 있습니다.</p>
        <GameTable key={`${combo}${tier}${size}${grade}${excl}${exclM}${sort}`} rows={rows} />
      </Card>
    </Page>
  );
}
