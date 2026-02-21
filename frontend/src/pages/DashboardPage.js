import React, { useEffect, useState } from 'react';
import { childAPI, activityAPI } from '../services/api';

const StatCard = ({ icon, label, value, color = '#6366f1', sub }) => (
  <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155', flex: 1, minWidth: 200 }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{sub}</div>}
  </div>
);

const DashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [children, setChildren] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      childAPI.list(),
      activityAPI.getAnalytics({ days: 7 }),
      activityAPI.getHistory({ limit: 5 }),
    ]).then(([childRes, analyticsRes, historyRes]) => {
      setChildren(childRes.data.children);
      setAnalytics(analyticsRes.data);
      setRecentLogs(historyRes.data.logs);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading dashboard...</div>;

  const blockRate = analytics?.total > 0 ? Math.round((analytics.blocked / analytics.total) * 100) : 0;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard Overview</h1>
      
      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard icon="👨‍👧" label="Monitored Profiles" value={children.length} />
        <StatCard icon="🔍" label="Total Checks (7d)" value={analytics?.total || 0} color="#22c55e" />
        <StatCard icon="🚫" label="Blocked (7d)" value={analytics?.blocked || 0} color="#ef4444" />
        <StatCard icon="📊" label="Block Rate" value={`${blockRate}%`} color="#f59e0b" />
      </div>

      {/* Children Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {children.map((child) => (
          <div key={child._id} style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Device: {child.deviceId?.slice(0, 8)}...</div>
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: child.isActive ? '#14532d' : '#450a0a',
                color: child.isActive ? '#22c55e' : '#ef4444' }}>
                {child.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Filter Level:</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: '#1e3a5f', color: '#60a5fa', textTransform: 'capitalize' }}>
                {child.filteringLevel}
              </span>
            </div>
          </div>
        ))}
        {children.length === 0 && (
          <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
            No children added yet. <a href="/children" style={{ color: '#6366f1' }}>Add one →</a>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h2>
        {recentLogs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No activity logged yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 13 }}>
                <th style={{ textAlign: 'left', paddingBottom: 8 }}>Child</th>
                <th style={{ textAlign: 'left', paddingBottom: 8 }}>Domain</th>
                <th style={{ textAlign: 'left', paddingBottom: 8 }}>Status</th>
                <th style={{ textAlign: 'left', paddingBottom: 8 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log._id} style={{ borderTop: '1px solid #334155', fontSize: 14 }}>
                  <td style={{ padding: '10px 0' }}>{log.childId?.name || '—'}</td>
                  <td style={{ padding: '10px 0', color: '#94a3b8' }}>{log.domain}</td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12,
                      background: log.status === 'blocked' ? '#450a0a' : '#14532d',
                      color: log.status === 'blocked' ? '#ef4444' : '#22c55e' }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0', color: '#64748b', fontSize: 12 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
