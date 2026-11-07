import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp, useGame } from '../lib/data';
import { metric, money } from '../lib/format';
import type { Action, ExperimentCard, Game, Template } from '../lib/types';
import { Card, Empty, Page, StatCard, StatsHead, TopBar } from '../components/ui';

function fill(t: string, g: Game, a?: Action) {
  const num = (v?: number) => (v == null ? '' : a?.lever === 'marketing' || a?.lever === 'mkt' ? money(v) : String(Math.round(v * 100) / 100));
  return t.replaceAll('{game}', g.id).replaceAll('{from}', num(a?.from_value)).replaceAll('{to}', num(a?.to_value))
    .replaceAll('{gain_lo}', a ? money(a.gain_lo) : '').replaceAll('{gain_hi}', a ? money(a.gain_hi) : '');
}
function build(g: Game, key: string, t: Template): ExperimentCard {
  const a = g.actions.find(x => x.key === key);
  return {
    id: 'c' + Date.now(), game: g.id, actionKey: key, title: fill(t.title, g, a), target: fill(t.target, g, a), hypothesis: fill(t.hypothesis, g, a), action: fill(t.action, g, a),
    metric: fill(t.metric, g, a), period: fill(t.period, g, a), design: fill(t.design, g, a), owner: '', status: '초안', createdAt: new Date().toISOString(),
    pred: g.pred, grade: g.risk_grade ? `${g.risk_grade}${g.n_fix ?? ''}` : '수익 경로 없음', gain: a?.gain ?? null, gainLo: a?.gain_lo ?? null, gainHi: a?.gain_hi ?? null,
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="ff"><span>{label}</span>{children}</label>; }

function Form({ init, isNew }: { init: ExperimentCard; isNew: boolean }) {
  const { saveCard, removeCard } = useApp();
  const nav = useNavigate();
  const [c, setC] = useState(init);
  const up = <K extends keyof ExperimentCard>(k: K, v: ExperimentCard[K]) => setC(s => ({ ...s, [k]: v }));
  return (
    <Page stats={<>
      <StatsHead title={isNew ? '새 실험 카드' : '실험 카드'} sub={c.game} />
      <StatCard title="예측 90일 매출" tag="모델" value={money(c.pred)} row={['위험 등급', c.grade]} />
      {c.gain != null && <StatCard title="조치의 예상 증분" tag="시뮬레이션" value={money(c.gain)} note={`${money(c.gainLo)} ~ ${money(c.gainHi)}`} />}
    </>}>
      <TopBar title={isNew ? '실험 카드 만들기' : '실험 카드 수정'} />
      <Card>
        <div className="form">
          <Field label="제목"><input value={c.title} onChange={e => up('title', e.target.value)} /></Field>
          <Field label="대상"><input value={c.target} onChange={e => up('target', e.target.value)} /></Field>
          <Field label="가설"><textarea rows={3} value={c.hypothesis} onChange={e => up('hypothesis', e.target.value)} /></Field>
          <Field label="실행안"><textarea rows={3} value={c.action} onChange={e => up('action', e.target.value)} /></Field>
          <Field label="성공 지표"><textarea rows={3} value={c.metric} onChange={e => up('metric', e.target.value)} /></Field>
          <div className="form-2">
            <Field label="관찰 기간"><input value={c.period} onChange={e => up('period', e.target.value)} /></Field>
            <Field label="실험 방식"><input value={c.design} onChange={e => up('design', e.target.value)} /></Field>
            <Field label="담당자"><input value={c.owner} onChange={e => up('owner', e.target.value)} /></Field>
            <Field label="상태"><select value={c.status} onChange={e => up('status', e.target.value as ExperimentCard['status'])}><option>초안</option><option>진행</option><option>완료</option></select></Field>
          </div>
          <div className="form-b">
            <button className="btn lg" onClick={() => { saveCard(c); nav('/cards'); }}>저장</button>
            <button className="btn-o" onClick={() => nav(-1)}>취소</button>
            {!isNew && <button className="link danger" onClick={() => { removeCard(c.id); nav('/cards'); }}>삭제</button>}
          </div>
        </div>
      </Card>
    </Page>
  );
}

function NewCard({ gameId, actionKey }: { gameId: string; actionKey: string }) {
  const g = useGame(gameId);
  const { meta } = useApp();
  const [init, setInit] = useState<ExperimentCard | null>(null);
  useEffect(() => {
    if (g && meta.templates[actionKey]) setInit(build(g, actionKey, meta.templates[actionKey]));
  }, [g, actionKey, meta]);
  if (g === null || !meta.templates[actionKey]) return <Page stats={<StatsHead title="실험 카드" sub="" />}><TopBar title="실험 카드" /><Empty to="/cards" cta="목록으로">이 조치의 양식을 찾지 못했습니다.</Empty></Page>;
  return init ? <Form init={init} isNew /> : <div className="boot">카드를 준비하는 중입니다.</div>;
}

export function CardEditor() {
  const { game, action, id } = useParams();
  const { cards } = useApp();
  if (game && action) return <NewCard gameId={game} actionKey={action} />;
  const c = cards.find(x => x.id === id);
  if (!c) return <Page stats={<StatsHead title="실험 카드" sub="" />}><TopBar title="실험 카드" /><Empty to="/cards" cta="목록으로">카드를 찾지 못했습니다.</Empty></Page>;
  return <Form init={c} isNew={false} />;
}

export function CardList() {
  const { cards, saveCard } = useApp();
  const n = (s: string) => cards.filter(c => c.status === s).length;
  return (
    <Page stats={<>
      <StatsHead title="실험 현황" sub="이 브라우저에 저장됩니다" />
      <StatCard title="저장한 카드" tag="전체" value={`${cards.length}개`} row={['초안', `${n('초안')}개`]}>
        <div className="stat-row"><span>진행</span><span>{n('진행')}개</span></div>
        <div className="stat-row"><span>완료</span><span>{n('완료')}개</span></div>
      </StatCard>
    </>}>
      <TopBar title="실험 카드" />
      {cards.length === 0 ? <Card><Empty to="/board" cta="우선순위 보드로">아직 저장한 카드가 없습니다. 게임 상세나 우선순위 보드에서 만들 수 있습니다.</Empty></Card> :
        <div className="cards">{cards.map(c => (
          <Card key={c.id} title={c.title} right={<select className="st-sel" aria-label="상태" value={c.status} onChange={e => saveCard({ ...c, status: e.target.value as ExperimentCard['status'] })}><option>초안</option><option>진행</option><option>완료</option></select>}>
            <p className="xc-sub"><Link className="chip" to={'/game/' + c.game}>{c.game.replace('REV4_', '')}</Link> 위험 {c.grade} · 예측 {metric(c.pred, 'USD')}{c.gain != null && ` · 예상 증분 ${money(c.gain)}`}</p>
            <dl className="xc"><dt>대상</dt><dd>{c.target}</dd><dt>가설</dt><dd>{c.hypothesis}</dd><dt>실행안</dt><dd>{c.action}</dd><dt>성공 지표</dt><dd>{c.metric}</dd><dt>관찰 기간</dt><dd>{c.period}</dd></dl>
            <Link className="btn-o" to={'/cards/' + c.id}>열기</Link>
          </Card>
        ))}</div>}
    </Page>
  );
}
