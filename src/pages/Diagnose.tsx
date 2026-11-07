import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/data';
import { GRADES, comboName, money, pct } from '../lib/format';
import type { Grade } from '../lib/types';
import { Card, Donut, GradeLegend, Page, Select, StatCard, StatsHead, TopBar } from '../components/ui';
import { GameTable } from '../components/GameTable';

const COMBOS = ['광고+인앱결제', '인앱결제', '광고', '없음'];
const TIERS = ['AAA', 'Mid-size', 'Indie', 'Unknown'];

export default function Diagnose() {
  const { id } = useParams();
  const nav = useNavigate();
  const { index, meta, cluster } = useApp();
  const s = meta.evidence.summary;
  const sel = id ? cluster(id) : undefined;
  const special = sel?.id === 'Z00' || sel?.id === 'M00';
  const small = sel && !special && sel.n_test < 50;
  const [grade, setGrade] = useState('');
  const [genre, setGenre] = useState('');
  const [excl, setExcl] = useState(true);
  const [sort, setSort] = useState<'risk' | 'recover'>('risk');
  const base = useMemo(() => index.filter(g => (sel ? g.cluster_id === sel.id : !g.excluded && (!excl || !g.zero))), [index, sel, excl]);
  const genres = useMemo(() => Array.from(new Set(base.map(g => g.genre))).sort(), [base]);
  const rows = useMemo(() => [...base.filter(g => (!grade || g.risk_grade === grade) && (!genre || g.genre === genre))]
    .sort((a, b) => sort === 'risk' ? (b.risk_prob ?? 0) - (a.risk_prob ?? 0) : b.recover_ops - a.recover_ops), [base, grade, genre, sort]);
  const counts = useMemo(() => {
    const c: Partial<Record<Grade, number>> = {};
    for (const g of base) if (g.risk_grade) c[g.risk_grade] = (c[g.risk_grade] ?? 0) + 1;
    return c;
  }, [base]);
  const nGraded = GRADES.reduce((a, g) => a + (counts[g] ?? 0), 0);
  const cell = (combo: string, tier: string) => meta.clusters.find(c => c.combo === combo && c.tier === tier);
  return (
    <Page stats={<>
      <StatsHead title={sel ? sel.label : '전체 게임'} sub="출시 후 7일차 기준" />
      {!special && <StatCard title="위험 등급 분포" tag={`${nGraded.toLocaleString()}개`}>
        <div className="donut-wrap"><Donut counts={counts} center={<><b>{nGraded.toLocaleString()}</b><span>진단 대상 게임</span></>} /></div>
        <GradeLegend counts={counts} />
        {!sel && <div className="stat-rows">
          <div className="stat-row"><span>수익 구조 없는 게임</span><span>{s.n_zero}개</span></div>
        </div>}
      </StatCard>}
      {sel && !special && <StatCard title="군집 실제 매출 중앙값" tag="과거 실제" value={money(sel.history.p50)} note={`학습 게임 ${sel.history.n_train}개 기준`} row={['기준 종류', sel.history.bench ?? '']} />}
      {special && <StatCard title="진단 제외" tag={`${sel?.n_test}개`} note={sel?.history.note} />}
    </>}>
      <TopBar title="게임 진단" />
      <Card title="게임군 지도" right={sel && <Link className="btn-o" to="/diagnose">전체 보기</Link>}>
        <div className="gmap" role="group" aria-label="게임군 지도">
          <span />{TIERS.map(t => <b key={t}>{t}</b>)}
          {COMBOS.map(cb => [
            <b key={cb} className="rowh">{comboName(cb)}</b>,
            ...TIERS.map(t => {
              const c = cell(cb, t);
              if (!c) return <span key={t} className="gcell none" />;
              const r = c.n_test ? c.n_high_risk / c.n_test : 0;
              const pos = (TIERS.indexOf(c.tier) + 3 - COMBOS.indexOf(c.combo)) / 6;
              return <button key={t} className={'gcell' + (c.id === sel?.id ? ' on' : '')} aria-pressed={c.id === sel?.id} aria-label={c.label}
                style={{ background: `rgba(0,106,255,${(pos * .3).toFixed(3)})` }}
                onClick={() => { setGenre(''); setGrade(''); nav(c.id === sel?.id ? '/diagnose' : '/diagnose/' + c.id); }}>
                <strong>{c.n_test}개{c.n_test < 50 ? ' *' : ''}</strong><small>위험 D·E {pct(r, 0)}</small></button>;
            }),
          ])}
        </div>
        <p className="hint">칸을 누르면 그 게임군만 봅니다. 게임군은 수익 구조와 퍼블리셔로 묶고, 마케팅비 차이는 기대 매출에서 보정합니다.</p>
        <p className="hint">* 표본 50개 미만인 게임군은 데이터가 부족합니다. 표본이 더 있어야 정확한 예측이 가능합니다.</p>
        {small && <p className="banner">{sel.label}은 표본이 {sel.n_test}개로 데이터가 부족합니다. 표본이 더 있어야 정확한 예측이 가능합니다.</p>}
        <div className="filters tog-row">
          <Select label="위험 등급" value={grade} onChange={setGrade} options={[['', '전체'], ...GRADES.map(g => [g, g + ' 등급'] as [string, string])]} />
          <Select label="장르" value={genre} onChange={setGenre} options={[['', '전체'], ...genres.map(g => [g, g] as [string, string])]} />
          {!sel && <>
            <button className={'tog' + (excl ? ' on' : '')} aria-pressed={excl} onClick={() => setExcl(!excl)} title={`Free·Freemium이면서 광고와 인앱결제가 없어 매출이 0으로 확정된 게임 ${s.n_zero}개`}>수익 구조 없는 게임 제외</button>
          </>}
        </div>
      </Card>
      <Card title={`게임 목록 ${rows.length.toLocaleString()}개`} right={
        <div className="seg" role="group" aria-label="정렬">
          <button aria-pressed={sort === 'risk'} onClick={() => setSort('risk')}>위험도 순</button>
          <button aria-pressed={sort === 'recover'} onClick={() => setSort('recover')} title="충돌률 3% 이하, 업데이트 35일 이내, 앱 용량 175MB 이하로 고쳤을 때 늘어나는 예상 매출이 큰 순서">개선 효과 큰 순</button>
        </div>}>
        <p className="hint">위험도 순은 얼마나 위험한지, 개선 효과 큰 순은 충돌률, 업데이트, 앱 용량을 기준선까지 고쳤을 때의 개선 여지 기준입니다. 두 순위는 다를 수 있습니다.</p>
        <GameTable key={`${sel?.id}${grade}${genre}${excl}${sort}`} rows={rows} height={420} />
      </Card>
    </Page>
  );
}
