import React, { useEffect, useState } from 'react';
import { activityAPI, childAPI } from '../services/api';

const ActivityPage = () => {
  const [logs, setLogs] = useState([]);
  const [children, setChildren] = useState([]);
  const [filters, setFilters] = useState({ childId: '', status: '', page: 1 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { childAPI.list().then((r) => setChildren(r.data.children)); }, []);

  useEffect(() => {
    setLoading(true);
    activityAPI.getHistory({ ...filters, limit: 25 })
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Activity Log</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select style={{ flex: 1, minWidth: 160 }} value={filters.childId} onChange={(e) => setFilters({ ...filters, childId: e.target.value, page: 1 })}>
          <option value="">All Children</option>
          {children.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select style={{ flex: 1, minWidth: 140 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">All Status</option>
          <option value="blocked">Blocked</option>
          <option value="allowed">Allowed</option>
        </select>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24, fontSize: 14, border: '1px solid #334155' }}>
        <span style={{ color: '#94a3b8' }}>Total: <strong style={{ color: '#f1f5f9' }}>{total}</strong></span>
        <span style={{ color: '#94a3b8' }}>Showing: <strong style={{ color: '#f1f5f9' }}>{logs.length}</strong></span>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#0f172a' }}>
              <tr>
                {['Child', 'Domain / URL', 'Type', 'Status', 'Reason', 'Time'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} style={{ borderTop: '1px solid #334155' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{log.childId?.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span title={log.url}>{log.domain || log.url}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#1e3a5f', color: '#60a5fa' }}>{log.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: log.status === 'blocked' ? '#450a0a' : '#14532d', color: log.status === 'blocked' ? '#ef4444' : '#22c55e' }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{log.blockReason || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No activity found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <button disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9', opacity: filters.page === 1 ? 0.5 : 1 }}>← Prev</button>
        <span style={{ padding: '8px 12px', color: '#64748b', fontSize: 14 }}>Page {filters.page}</span>
        <button disabled={logs.length < 25} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9', opacity: logs.length < 25 ? 0.5 : 1 }}>Next →</button>
      </div>
    </div>
  );
};

export default ActivityPage;
