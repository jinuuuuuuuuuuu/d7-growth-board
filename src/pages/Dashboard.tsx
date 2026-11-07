import { useMemo, useState } from 'react';
import { useApp } from '../lib/data';
import { GRADES, comboName, money, pct } from '../lib/format';
import { Card, Donut, GradeLegend, Page, Select, StatCard, StatsHead, TopBar } from '../components/ui';
import { GameTable } from '../components/GameTable';
import { GradeBars } from '../components/GradeBars';

const opts = (v: string[], all: string): [string, string][] => [['', all], ...v.map(x => [x, x] as [string, string])];

export default function Dashboard() {
  const { index, meta } = useApp();
  const s = meta.evidence.summary;
  const [combo, setCombo] = useState('');
  const [tier, setTier] = useState('');
  const [size, setSize] = useState('');
  const [grade, setGrade] = useState('');
  const [excl, setExcl] = useState(true);
  const [sort, setSort] = useState<'risk' | 'recover'>('risk');
  const counts = Object.fromEntries(GRADES.map(g => [g, s.grades[g].n]));
  const rows = useMemo(() => {
    const r = index.filter(g => (!combo || g.combo === combo) && (!tier || g.tier === tier) && (!size || g.size === size)
      && (grade ? g.risk_grade === grade : excl ? !g.zero : true));
    return [...r].sort((a, b) => sort === 'risk' ? (b.risk_prob ?? 0) - (a.risk_prob ?? 0) : b.recover_ops - a.recover_ops);
  }, [index, combo, tier, size, grade, excl, sort]);
  return (
    <Page stats={<>
      <StatsHead title="전체 현황" sub={`test 게임 ${s.n_test.toLocaleString()}개 · 출시 후 7일차 기준`} />
      <StatCard title="예측 90일 매출" tag="합계" value={money(s.pred_total)} note={`수익 게임 ${s.n_live.toLocaleString()}개의 모델 예측`} row={['수익 경로 없는 게임', `${s.n_zero}개`]} />
      <StatCard title="회복 가능 매출" tag="시뮬레이션" value={money(s.recover_total)} delta={'+' + pct(s.recover_pct)} deltaTone="up" note="충돌률 3% 이하, 업데이트 35일 이내 가정" row={['상위 10% 게임 비중', pct(s.top10_share)]} />
      <StatCard title="위험 등급 분포" tag="1,831개">
        <div className="donut-wrap"><Donut counts={counts} center={<><b>{s.n_live.toLocaleString()}</b><span>수익 게임</span></>} /></div>
        <GradeLegend counts={counts} />
      </StatCard>
    </>}>
      <TopBar title="대시보드" />
      <Card title="게임 찾기">
        <div className="filters">
          <Select label="수익 구조" value={combo} onChange={setCombo} options={[['', '전체'], ...['광고+인앱결제', '인앱결제', '광고', '없음'].map(x => [x, comboName(x)] as [string, string])]} />
          <Select label="퍼블리셔" value={tier} onChange={setTier} options={opts(['AAA', 'Mid-size', 'Indie', 'Unknown'], '전체')} />
          <Select label="예산 규모" value={size} onChange={setSize} options={opts(['소형', '중형', '대형', '미상'], '전체')} />
          <Select label="위험 등급" value={grade} onChange={setGrade} options={[['', '전체'], ...GRADES.map(g => [g, g + ' 등급'] as [string, string])]} />
          <button className={'tog' + (excl ? ' on' : '')} aria-pressed={excl} onClick={() => setExcl(!excl)} title={`Free·Freemium이면서 광고와 인앱결제가 없어 매출이 0으로 확정된 게임 ${s.n_zero}개`}>수익구조 없는 게임 제외 <small>{s.n_zero}개</small></button>
          <button className="btn lg" onClick={() => { setCombo(''); setTier(''); setSize(''); setGrade(''); setExcl(true); }}>초기화</button>
        </div>
      </Card>
      <Card title={`게임 목록 ${rows.length.toLocaleString()}개`} right={
        <div className="seg" role="group" aria-label="정렬">
          <button aria-pressed={sort === 'risk'} onClick={() => setSort('risk')}>위험도 순</button>
          <button aria-pressed={sort === 'recover'} onClick={() => setSort('recover')}>회복 가능 매출 순</button>
        </div>}>
        <p className="hint">위험도는 심각성, 회복 가능 매출은 영향도입니다. 두 순위는 다를 수 있습니다.</p>
        <GameTable key={`${combo}${tier}${size}${grade}${excl}${sort}`} rows={rows} />
      </Card>
      <Card title="등급별 매출" right={<div className="lg-inline"><span><i style={{ background: '#006AFF' }} />예측 90일 매출</span><span><i style={{ background: '#A3A3A3' }} />회복 가능 매출</span></div>}>
        <GradeBars data={s.grades} />
      </Card>
    </Page>
  );
}
