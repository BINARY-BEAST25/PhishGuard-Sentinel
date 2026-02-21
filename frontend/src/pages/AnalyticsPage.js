import React, { useEffect, useState } from 'react';
import { activityAPI, childAPI } from '../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [days, setDays] = useState(7);

  useEffect(() => { childAPI.list().then((r) => setChildren(r.data.children)); }, []);

  useEffect(() => {
    activityAPI.getAnalytics({ days, childId: selectedChild || undefined })
      .then((r) => setAnalytics(r.data));
  }, [days, selectedChild]);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#334155' } },
    },
  };

  const barData = {
    labels: analytics?.byDay?.map((d) => d._id) || [],
    datasets: [
      { label: 'Allowed', data: analytics?.byDay?.map((d) => d.count - d.blocked) || [], backgroundColor: '#22c55e80', borderColor: '#22c55e', borderWidth: 1 },
      { label: 'Blocked', data: analytics?.byDay?.map((d) => d.blocked) || [], backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 1 },
    ],
  };

  const donutData = {
    labels: ['Allowed', 'Blocked'],
    datasets: [{
      data: [analytics?.allowed || 0, analytics?.blocked || 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
    }],
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Analytics</h1>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select style={{ flex: 1, minWidth: 160 }} value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
          <option value="">All Children</option>
          {children.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select style={{ flex: 1, minWidth: 130 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          {[
            { label: 'Total Requests', value: analytics.total, color: '#6366f1' },
            { label: 'Allowed', value: analytics.allowed, color: '#22c55e' },
            { label: 'Blocked', value: analytics.blocked, color: '#ef4444' },
            { label: 'Block Rate', value: analytics.total ? `${Math.round(analytics.blocked / analytics.total * 100)}%` : '0%', color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, minWidth: 160, background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Daily Activity</h3>
          <Bar data={barData} options={chartOptions} />
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Request Distribution</h3>
          <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } } }} />
        </div>
      </div>

      {/* Top Blocked Domains */}
      {analytics?.topDomains?.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Top Blocked Domains</h3>
          {analytics.topDomains.map((d, i) => (
            <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ color: '#64748b', fontSize: 13, width: 20 }}>{i + 1}</span>
              <div style={{ flex: 1, background: '#334155', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / analytics.topDomains[0].count) * 100}%`, height: '100%', background: '#ef4444', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8', minWidth: 120 }}>{d._id}</span>
              <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
