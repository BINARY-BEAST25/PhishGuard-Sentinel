import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { activityAPI, childAPI } from '../services/api';

const EXTENSION_ZIP_URL = 'https://github.com/BINARY-BEAST25/PhishGuard-Sentinel/raw/main/PhishGuard-Sentinel-Extension.zip';
const EXTENSION_FOLDER_URL = 'https://github.com/BINARY-BEAST25/PhishGuard-Sentinel/tree/main/extension';

const DashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [children, setChildren] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([childAPI.list(), activityAPI.getAnalytics({ days: 7 }), activityAPI.getHistory({ limit: 6 })])
      .then(([childRes, analyticsRes, historyRes]) => {
        setChildren(childRes.data.children || []);
        setAnalytics(analyticsRes.data || {});
        setRecentLogs(historyRes.data.logs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const blockRate = useMemo(() => {
    if (!analytics?.total) return 0;
    return Math.round((analytics.blocked / analytics.total) * 100);
  }, [analytics]);

  if (loading) {
    return <div className="page-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="section-header">
        <div>
          <h2>Security Overview</h2>
          <p>Live protection snapshot for the last 7 days.</p>
        </div>
        <Link to="/children" className="btn btn-primary">
          Add Child Profile
        </Link>
      </div>

      <div className="dashboard-stats">
        <div className="metric-card">
          <span className="metric-label">Monitored Profiles</span>
          <strong>{children.length}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Checks</span>
          <strong>{analytics?.total || 0}</strong>
        </div>
        <div className="metric-card danger">
          <span className="metric-label">Threats Blocked</span>
          <strong>{analytics?.blocked || 0}</strong>
        </div>
        <div className="metric-card warning">
          <span className="metric-label">Block Rate</span>
          <strong>{blockRate}%</strong>
        </div>
      </div>

      <section className="install-card">
        <div className="install-head">
          <div>
            <h3>Install Browser Extension</h3>
            <p>After parent login, install the extension on the child's browser and connect using Device ID.</p>
          </div>
          <div className="install-actions">
            <a className="btn btn-primary" href={EXTENSION_ZIP_URL} target="_blank" rel="noreferrer">
              Download Extension ZIP
            </a>
            <a className="btn btn-secondary" href={EXTENSION_FOLDER_URL} target="_blank" rel="noreferrer">
              View Extension Folder
            </a>
          </div>
        </div>
        <ol className="install-steps">
          <li>Download and extract the extension-only ZIP.</li>
          <li>Open Chrome and go to <code>chrome://extensions</code>.</li>
          <li>Enable Developer mode, click Load unpacked, and select the <code>extension/</code> folder.</li>
          <li>
            Open the extension popup and paste a child Device ID from <Link to="/children">Children</Link>.
          </li>
        </ol>
      </section>

      <div className="dashboard-columns">
        <section className="panel-card">
          <div className="panel-head">
            <h3>Children Status</h3>
            <span>{children.length} profile(s)</span>
          </div>

          {children.length === 0 ? (
            <div className="panel-empty">
              No profiles added. <Link to="/children">Create the first one</Link>.
            </div>
          ) : (
            <div className="child-list">
              {children.map((child) => (
                <article key={child._id} className="child-item">
                  <div className="child-main">
                    <strong>{child.name}</strong>
                    <span>ID: {child.deviceId?.slice(0, 10)}...</span>
                  </div>
                  <div className="child-meta">
                    <span className={`status-pill ${child.isActive ? 'ok' : 'off'}`}>
                      {child.isActive ? 'Active' : 'Paused'}
                    </span>
                    <span className="level-pill">{child.filteringLevel || 'moderate'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h3>Recent Threat Log</h3>
            <Link to="/activity">View all</Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="panel-empty">No activity logged yet.</div>
          ) : (
            <div className="activity-list">
              {recentLogs.map((log) => (
                <article key={log._id} className="activity-item">
                  <div>
                    <strong>{log.domain || log.url || 'Unknown domain'}</strong>
                    <span>{log.childId?.name || 'Unknown child'}</span>
                  </div>
                  <div className="activity-meta">
                    <span className={`status-pill ${log.status === 'blocked' ? 'danger' : 'ok'}`}>
                      {log.status}
                    </span>
                    <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
