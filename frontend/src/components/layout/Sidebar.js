// Sidebar layout component
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '#', icon: '📊', label: 'Analytics' },
  { to: '#', icon: '📋', label: 'Activity Logs' },
  { to: '#', icon: '🔒', label: 'Settings' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: '#1e293b',
      borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#6366f1' }}>PhishGuard Sentinel</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Parental Control</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        {navItems.map(item => (
          <NavLink
            key={item.label}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', textDecoration: 'none',
              fontSize: 14, fontWeight: 500,
              color: isActive ? '#6366f1' : '#94a3b8',
              background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
              borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
              transition: 'all 0.2s'
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
          {user?.email || 'Parent Account'}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export const MainLayout = ({ children }) => (
  <div style={{ display: 'flex' }}>
    <Sidebar />
    <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', padding: 32 }}>
      {children}
    </main>
  </div>
);

export default Sidebar;
