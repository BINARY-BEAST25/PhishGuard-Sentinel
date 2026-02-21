import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: '📊 Dashboard', exact: true },
  { path: '/children', label: '👨‍👧 Children' },
  { path: '/activity', label: '📋 Activity Log' },
  { path: '/analytics', label: '📈 Analytics' },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 240 : 64, background: '#1e293b', borderRight: '1px solid #334155', transition: 'width 0.3s', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          {sidebarOpen && <span style={{ fontWeight: 700, fontSize: 16, color: '#6366f1' }}>PhishGuard Sentinel</span>}
        </div>
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {navItems.map(({ path, label, exact }) => (
            <NavLink key={path} to={path} end={exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
              marginBottom: 4, color: isActive ? '#6366f1' : '#94a3b8', background: isActive ? '#312e81' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden',
              transition: 'all 0.2s',
            })}>
              <span style={{ fontSize: 18 }}>{label.split(' ')[0]}</span>
              {sidebarOpen && <span>{label.split(' ').slice(1).join(' ')}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 8px', borderTop: '1px solid #334155' }}>
          {sidebarOpen && <div style={{ padding: '8px 12px', marginBottom: 8, fontSize: 13, color: '#64748b' }}>
            {user?.name}
          </div>}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14, width: '100%',
          }}>
            <span>🚪</span>{sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 16, background: '#1e293b' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20 }}>☰</button>
          <span style={{ color: '#64748b', fontSize: 14 }}>Welcome back, <strong style={{ color: '#f1f5f9' }}>{user?.name}</strong></span>
        </header>
        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
