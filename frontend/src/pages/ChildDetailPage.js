// Child Detail & Settings Page
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MainLayout } from '../components/layout/Sidebar';
import { API_BASE } from '../context/AuthContext';

const TagInput = ({ label, values, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const val = input.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    if (val && !values.includes(val)) {
      onChange([...values, val]);
    }
    setInput('');
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="form-control" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={addTag}>Add</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {values.map(v => (
          <span key={v} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
            padding: '3px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
          }}>
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter(x => x !== v))}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}
            >×</button>
          </span>
        ))}
        {values.length === 0 && <span style={{ color: '#475569', fontSize: 13 }}>None added</span>}
      </div>
    </div>
  );
};

const ChildDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/child/${id}`)
      .then(({ data }) => {
        setChild(data.child);
        setForm({
          filteringLevel: data.child.filteringLevel,
          allowedSites: data.child.allowedSites || [],
          blockedSites: data.child.blockedSites || [],
          isActive: data.child.isActive,
          customSettings: data.child.customSettings || {}
        });
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await axios.put(`${API_BASE}/child/${id}`, form);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MainLayout><div className="spinner" /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>← Back</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{child?.name}'s Settings</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Configure protection and filtering rules</p>
          </div>
        </div>

        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSave}>
          {/* Filtering Level */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🛡️ Filtering Level</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['strict', 'moderate', 'custom', 'off'].map(level => (
                <label key={level} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: form.filteringLevel === level ? 'rgba(99,102,241,0.1)' : '#0f172a',
                  border: `1px solid ${form.filteringLevel === level ? '#6366f1' : '#334155'}`,
                  borderRadius: 8, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input type="radio" name="filteringLevel" value={level}
                    checked={form.filteringLevel === level}
                    onChange={() => setForm({ ...form, filteringLevel: level })} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                      {level === 'strict' ? '🔒' : level === 'moderate' ? '⚠️' : level === 'custom' ? '⚙️' : '🔓'} {level}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {level === 'strict' ? 'Maximum protection' :
                       level === 'moderate' ? 'Balanced filtering' :
                       level === 'custom' ? 'You control settings' : 'No filtering'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid #334155' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Protection Active</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Disable to pause all filtering</div>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 44, height: 24, background: form.isActive ? '#6366f1' : '#334155',
                  borderRadius: 12, position: 'relative', transition: 'background 0.2s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: form.isActive ? 22 : 2,
                    width: 20, height: 20, background: 'white', borderRadius: '50%',
                    transition: 'left 0.2s'
                  }} />
                </div>
                <input type="checkbox" style={{ display: 'none' }}
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              </label>
            </div>
          </div>

          {/* Custom Settings (shown when level = custom) */}
          {form.filteringLevel === 'custom' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚙️ Custom Filter Rules</h3>
              {[
                { key: 'blockAdultContent', label: '🔞 Block Adult Content' },
                { key: 'blockViolence', label: '⚔️ Block Violence' },
                { key: 'blockHateSpeech', label: '🚫 Block Hate Speech' },
                { key: 'blockGambling', label: '🎰 Block Gambling' },
                { key: 'blockSocialMedia', label: '📱 Block Social Media' },
              ].map(({ key, label }) => (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #334155'
                }}>
                  <span style={{ fontSize: 14 }}>{label}</span>
                  <input type="checkbox"
                    checked={form.customSettings[key] ?? true}
                    onChange={e => setForm({
                      ...form,
                      customSettings: { ...form.customSettings, [key]: e.target.checked }
                    })} />
                </div>
              ))}
            </div>
          )}

          {/* Site Lists */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🌐 Site Lists</h3>
            <TagInput
              label="✅ Always Allowed (Allowlist)"
              values={form.allowedSites}
              onChange={v => setForm({ ...form, allowedSites: v })}
              placeholder="example.com (press Enter)"
            />
            <TagInput
              label="🚫 Always Blocked (Blocklist)"
              values={form.blockedSites}
              onChange={v => setForm({ ...form, blockedSites: v })}
              placeholder="badsite.com (press Enter)"
            />
          </div>

          {/* Device ID */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔑 Extension Setup</h3>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
              Enter this Device ID in the SafeGuard AI Chrome extension on your child's device:
            </p>
            <div style={{
              background: '#0f172a', borderRadius: 8, padding: '12px 16px',
              fontFamily: 'monospace', fontSize: 13, color: '#a5b4fc',
              border: '1px solid #334155', wordBreak: 'break-all'
            }}>
              {child?.deviceId}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default ChildDetailPage;
