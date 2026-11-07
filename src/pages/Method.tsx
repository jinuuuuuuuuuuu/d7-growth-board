import { useApp } from '../lib/data';
import { money, pct } from '../lib/format';
import { Card, GradeBadge, Page, StatCard, StatsHead, TopBar } from '../components/ui';

export default function Method() {
  const { meta } = useApp();
  const e = meta.evidence, m = e.model;
  return (
    <Page stats={<>
      <StatsHead title="모델" sub="사전 과제 팀 최종 모델" />
      <StatCard title="CV RMSLE" tag="기대 성능" value={m.cv_rmsle.toFixed(4)} note={m.name} row={['처음 보는 분할', m.fresh_split_rmsle.toFixed(4)]} />
      <StatCard title="Public RMSLE" tag="참고" value={m.public_rmsle.toFixed(4)} note={m.public_note} />
      <StatCard title="개선 시 증가 매출" tag="시뮬레이션" value={money(e.summary.recover_total)} note={`예측 합계의 ${pct(e.summary.recover_pct)}, 상위 10% 게임 비중 ${pct(e.summary.top10_share)}`} />
    </>}>
      <TopBar title="방법과 한계" />
      <Card title="위험 등급과 검증">
        <p className="body">{e.risk.definition}. 식: {e.risk.formula}. {e.risk.sigma_note}.</p>
        <table className="cmp">
          <thead><tr><th>등급</th><th>범위</th><th className="r">검증 게임 수</th><th className="r">계산 확률 평균</th><th className="r">실제 미달 비율</th><th className="r">실제 매출 중앙값</th></tr></thead>
          <tbody>{e.risk.validation.map((v, i) => (
            <tr key={v.grade}><td><GradeBadge grade={v.grade} /></td><td>{e.risk.grades[i].range}</td><td className="r num">{v.n.toLocaleString()}</td><td className="r num">{pct(v.mean_prob)}</td><td className="r num">{pct(v.actual_below)}</td><td className="r num">{money(v.actual_median)}</td></tr>
          ))}</tbody>
        </table>
        <p className="hint">{e.risk.validation_note}</p>
      </Card>
      <Card title="우선순위 계산"><p className="body">{e.priority.formula}</p><p className="hint">{e.priority.note}</p></Card>
      <Card title="서비스에 반영한 인사이트">
        <div className="ins">{e.insights.map(x => <div key={x.id}><b>{x.title}</b><p>{x.fact}</p><small>활용: {x.use}</small></div>)}</div>
      </Card>
      <Card title="효과가 없던 변수"><ul className="ul">{e.no_effect.map(x => <li key={x.name}><b>{x.name}</b> {x.detail}</li>)}</ul></Card>
      <Card title="한계"><ul className="ul">{e.limitations.map(x => <li key={x}>{x}</li>)}</ul></Card>
      <Card title="디자인 출처"><p className="body">화면 구성은 Mahmud Saeef의 Figma Community 파일 Car Rental Company Dashboard UI(교육 목적 무료)를 참고했습니다. 글꼴은 Pretendard(SIL Open Font License)입니다.</p></Card>
    </Page>
  );
}
