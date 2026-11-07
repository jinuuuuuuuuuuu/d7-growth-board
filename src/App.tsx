import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { FileCheck2, Gauge, History, LayoutGrid } from 'lucide-react';
import { DataProvider, useApp } from './lib/data';
import Diagnose from './pages/Diagnose';
import GamePage from './pages/GamePage';
import Efficiency from './pages/Efficiency';
import { CardEditor, CardList } from './pages/Plans';
import HistoryPage from './pages/History';

const TOP = [
  { to: '/diagnose', label: '게임 진단', icon: LayoutGrid },
  { to: '/efficiency', label: '효율', icon: Gauge },
  { to: '/plans', label: '개선안', icon: FileCheck2 },
];
const REPORT = [
  { to: '/history', label: '과거 성과 분석', icon: History },
];

function Item({ to, label, icon: I, end, badge }: { to: string; label: string; icon: typeof History; end?: boolean; badge?: number }) {
  return <NavLink to={to} end={end} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><I size={22} strokeWidth={1.7} /><span>{label}</span>{!!badge && <em>{badge}</em>}</NavLink>;
}

function Side() {
  const { cart, cards } = useApp();
  return (
    <nav className="side" aria-label="주 메뉴">
      <div className="logo"><b>D7</b><span>성장 처방 보드</span></div>
      <div className="side-list">
        {TOP.map(m => <Item key={m.to} {...m} badge={m.to === '/efficiency' ? cart.length : m.to === '/plans' ? cards.length : 0} />)}
      </div>
      <hr />
      <p className="side-h">리포트</p>
      <div className="side-list">{REPORT.map(m => <Item key={m.to} {...m} />)}</div>
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
            <Route path="/history/:id" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/diagnose" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </DataProvider>
  );
}
