import { HashRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { FileCheck2, Gauge, History, X } from 'lucide-react';
import { DataProvider, useApp } from './lib/data';
import { GRADE_COLOR } from './lib/format';
import Diagnose from './pages/Diagnose';
import GamePage from './pages/GamePage';
import Efficiency from './pages/Efficiency';
import { CardEditor, CardList } from './pages/Plans';
import HistoryPage from './pages/History';

function Item({ to, label, icon: I, badge }: { to: string; label: string; icon: typeof History; badge?: number }) {
  return <NavLink to={to} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><I size={22} strokeWidth={1.7} /><span>{label}</span>{!!badge && <em>{badge}</em>}</NavLink>;
}

function Side() {
  const { cards, current, setCurrent, byId } = useApp();
  const g = current ? byId.get(current) : undefined;
  const n = current ? cards.filter(c => c.game === current).length : cards.length;
  return (
    <nav className="side" aria-label="주 메뉴">
      <Link className="logo" to="/diagnose" onClick={() => setCurrent(null)} title="처음 화면으로"><b>D7</b><span>성장 처방 보드</span></Link>
      {g && (
        <div className="cur">
          <Link to={'/game/' + g.id}><small>선택한 게임</small><b>{g.id}</b><span>{g.risk_grade && <i style={{ background: GRADE_COLOR[g.risk_grade] }} />}{g.risk_grade ? `${g.risk_grade}${g.n_fix ?? ''} · ` : ''}{g.genre}</span></Link>
          <button aria-label="게임 선택 해제" onClick={() => setCurrent(null)}><X size={16} /></button>
        </div>
      )}
      <div className="side-list">
        <Item to="/efficiency" label="효율" icon={Gauge} />
        <Item to="/plans" label="개선안" icon={FileCheck2} badge={n} />
        <Item to="/history" label="과거 성과 분석" icon={History} />
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <div className="app">
          <Side />
          <Routes>
            <Route path="/diagnose" element={<Diagnose />} />
            <Route path="/diagnose/:id" element={<Diagnose />} />
            <Route path="/game/:id" element={<GamePage />} />
            <Route path="/efficiency" element={<Efficiency />} />
            <Route path="/plans" element={<CardList />} />
            <Route path="/plans/new/:game/:action" element={<CardEditor />} />
            <Route path="/plans/:id" element={<CardEditor />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/diagnose" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </DataProvider>
  );
}
