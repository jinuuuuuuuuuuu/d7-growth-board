import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BookOpenText, FlaskConical, History, Layers, LayoutGrid, ListOrdered } from 'lucide-react';
import { DataProvider, useApp } from './lib/data';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GamePage from './pages/GamePage';
import Board from './pages/Board';
import { CardEditor, CardList } from './pages/Cards';
import HistoryPage from './pages/History';
import Method from './pages/Method';

const TOP = [
  { to: '/', label: '대시보드', icon: LayoutGrid, end: true },
  { to: '/groups', label: '게임군', icon: Layers },
  { to: '/board', label: '우선순위 보드', icon: ListOrdered },
  { to: '/cards', label: '실험 카드', icon: FlaskConical },
];
const REPORT = [
  { to: '/history', label: '과거 성과 분석', icon: History },
  { to: '/method', label: '방법과 한계', icon: BookOpenText },
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
        {TOP.map(m => <Item key={m.to} {...m} badge={m.to === '/board' ? cart.length : m.to === '/cards' ? cards.length : 0} />)}
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<Groups />} />
            <Route path="/game/:id" element={<GamePage />} />
            <Route path="/board" element={<Board />} />
            <Route path="/cards" element={<CardList />} />
            <Route path="/cards/new/:game/:action" element={<CardEditor />} />
            <Route path="/cards/:id" element={<CardEditor />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<HistoryPage />} />
            <Route path="/method" element={<Method />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </DataProvider>
  );
}
