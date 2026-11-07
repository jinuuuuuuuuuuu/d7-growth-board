import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/data';
import { GRADE_COLOR, GRADES, money, short } from '../lib/format';
import { Card, Donut, GradeLegend, Page, Select, StatCard, StatsHead, TopBar } from '../components/ui';
import { GameTable } from '../components/GameTable';

const opts = (v: string[]): [string, string][] => [['', '전체'], ...v.map(x => [x, x] as [string, string])];

export default function Groups() {
  const { id = 'C03' } = useParams();
  const nav = useNavigate();
  const { meta, index, cluster } = useApp();
  const c = cluster(id) ?? cluster('C03')!;
  const [combo, setCombo] = useState('');
  const [tier, setTier] = useState('');
  const [size, setSize] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<'risk' | 'recover'>('risk');
  const list = meta.clusters.filter(x => (!combo || x.combo === combo) && (!tier || x.tier === tier) && (!size || x.size === size));
  const inC = useMemo(() => index.filter(g => g.cluster_id === c.id), [index, c.id]);
  const genres = useMemo(() => Array.from(new Set(inC.map(g => g.genre))).sort(), [inC]);
  const rows = useMemo(() => [...inC.filter(g => !genre || g.genre === genre)].sort((a, b) => sort === 'risk' ? (b.risk_prob ?? 0) - (a.risk_prob ?? 0) : b.recover_ops - a.recover_ops), [inC, genre, sort]);
  const h = c.history;
  return (
    <Page stats={<>
      <StatsHead title="선택한 게임군" sub={c.label} />
      <StatCard title="예측 90일 매출" tag={`${c.n_test}개`} value={money(c.pred_total)} note="이 군집 test 게임의 모델 예측 합계" row={['회복 가능 매출', money(c.recover_total)]} />
      <StatCard title="비교 기준" tag="과거 실제" value={money(h.p50)} note={h.n_train ? `학습 게임 ${h.n_train}개의 실제 매출 중앙값` : h.note} row={['기준 종류', h.bench ?? '해당 없음']} />
      {c.id !== 'Z00' && <StatCard title="위험 등급 분포" tag={`D·E ${c.n_high_risk}개`}>
        <div className="donut-wrap"><Donut counts={c.grades} center={<><b>{c.n_test}</b><span>게임</span></>} /></div>
        <GradeLegend counts={c.grades} />
      </StatCard>}
    </>}>
      <TopBar title="게임군" />
      <Card title={`비슷한 게임군 ${list.length}개`}>
        <div className="filters">
          <Select label="수익 구조" value={combo} onChange={setCombo} options={opts(['광고+인앱결제', '인앱결제', '광고', '없음'])} />
          <Select label="퍼블리셔" value={tier} onChange={setTier} options={opts(['AAA', 'Mid-size', 'Indie', 'Unknown'])} />
          <Select label="예산 규모" value={size} onChange={setSize} options={opts(['소형', '중형', '대형', '미상'])} />
        </div>
        <div className="cl-grid">
          {list.map(x => {
            const tot = GRADES.reduce((s, g) => s + (x.grades[g] ?? 0), 0);
            return (
              <button key={x.id} className={'cl' + (x.id === c.id ? ' on' : '')} onClick={() => { setGenre(''); nav('/groups/' + x.id); }}>
                <small>{x.id}</small><b>{x.label}</b>
                {tot > 0 && <span className="cl-bar">{GRADES.map(g => (x.grades[g] ?? 0) > 0 && <i key={g} style={{ flex: x.grades[g], background: GRADE_COLOR[g] }} />)}</span>}
                <span className="cl-meta"><span>게임 {x.n_test}개</span><span>위험 D·E {x.n_high_risk}개</span><span>회복 {short(x.recover_total)}</span></span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card title={c.label} right={
        <div className="head-tools">
          <label className="mini"><span className="sr">장르</span><select value={genre} onChange={e => setGenre(e.target.value)}><option value="">장르 전체</option>{genres.map(g => <option key={g}>{g}</option>)}</select></label>
          <div className="seg" role="group" aria-label="정렬">
            <button aria-pressed={sort === 'risk'} onClick={() => setSort('risk')}>위험도 순</button>
            <button aria-pressed={sort === 'recover'} onClick={() => setSort('recover')}>회복 가능 매출 순</button>
          </div>
        </div>}>
        <p className="hint">위험도는 심각성, 회복 가능 매출은 영향도입니다. 두 순위는 다를 수 있습니다. <Link to={'/history/' + c.id}>이 군집의 과거 성과 보기</Link></p>
        <GameTable key={c.id + genre + sort} rows={rows} height={420} />
      </Card>
    </Page>
  );
}
