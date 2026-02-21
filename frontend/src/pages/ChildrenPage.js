import React, { useEffect, useState } from 'react';
import { childAPI } from '../services/api';
import toast from 'react-hot-toast';

const FILTER_LEVELS = ['strict', 'moderate', 'custom', 'off'];

const ChildrenPage = () => {
  const [children, setChildren] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [form, setForm] = useState({ name: '', filteringLevel: 'moderate' });
  const [siteInput, setSiteInput] = useState({ blocked: '', allowed: '' });
  const [loading, setLoading] = useState(false);

  const load = () => childAPI.list().then((r) => setChildren(r.data.children));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await childAPI.add(form);
      toast.success(`Profile created! Device ID: ${res.data.deviceId.slice(0, 8)}...`);
      setShowAdd(false);
      setForm({ name: '', filteringLevel: 'moderate' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add child');
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await childAPI.update(editChild._id, editChild);
      toast.success('Profile updated');
      setEditChild(null);
      load();
    } catch (err) {
      toast.error('Update failed');
    } finally { setLoading(false); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this child profile?')) return;
    await childAPI.remove(id);
    toast.success('Profile removed');
    load();
  };

  const addSite = (type) => {
    const site = siteInput[type].trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!site) return;
    const field = type === 'blocked' ? 'blockedSites' : 'allowedSites';
    setEditChild({ ...editChild, [field]: [...(editChild[field] || []), site] });
    setSiteInput({ ...siteInput, [type]: '' });
  };

  const removeSite = (type, site) => {
    const field = type === 'blocked' ? 'blockedSites' : 'allowedSites';
    setEditChild({ ...editChild, [field]: editChild[field].filter((s) => s !== site) });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Children Profiles</h1>
        <button onClick={() => setShowAdd(true)} style={{ padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600 }}>
          + Add Child
        </button>
      </div>

      {/* Add Child Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 400, border: '1px solid #334155' }}>
            <h2 style={{ marginBottom: 20 }}>Add Child Profile</h2>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Child's Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alex" required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Filtering Level</label>
                <select value={form.filteringLevel} onChange={(e) => setForm({ ...form, filteringLevel: e.target.value })}>
                  {FILTER_LEVELS.map((l) => <option key={l} value={l} style={{ textTransform: 'capitalize' }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 10, background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, background: '#6366f1', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600 }}>{loading ? '...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Children List */}
      <div style={{ display: 'grid', gap: 16 }}>
        {children.map((child) => (
          <div key={child._id} style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ID: {child.deviceId?.slice(0, 12)}...</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Level: <span style={{ color: '#6366f1', textTransform: 'capitalize' }}>{child.filteringLevel}</span>
                    {' · '}Blocked: {child.blockedSites?.length || 0} sites
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditChild({ ...child })} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 13 }}>Edit</button>
                <button onClick={() => handleRemove(child._id)} style={{ padding: '8px 16px', background: '#450a0a', border: 'none', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        {children.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👧</div>
            <p>No child profiles yet. Add one to start protecting.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editChild && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: 20 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, border: '1px solid #334155' }}>
            <h2 style={{ marginBottom: 20 }}>Edit: {editChild.name}</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Name</label>
              <input value={editChild.name} onChange={(e) => setEditChild({ ...editChild, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Filtering Level</label>
              <select value={editChild.filteringLevel} onChange={(e) => setEditChild({ ...editChild, filteringLevel: e.target.value })}>
                {FILTER_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={editChild.isActive} onChange={(e) => setEditChild({ ...editChild, isActive: e.target.checked })} style={{ width: 'auto' }} />
                Filtering Active
              </label>
            </div>

            {/* Blocked Sites */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#94a3b8' }}>🚫 Blocked Sites</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={siteInput.blocked} onChange={(e) => setSiteInput({ ...siteInput, blocked: e.target.value })} placeholder="example.com" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSite('blocked'))} />
                <button type="button" onClick={() => addSite('blocked')} style={{ padding: '10px 16px', background: '#450a0a', border: 'none', borderRadius: 8, color: '#ef4444', whiteSpace: 'nowrap' }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {editChild.blockedSites?.map((site) => (
                  <span key={site} style={{ padding: '4px 10px', background: '#450a0a', borderRadius: 20, fontSize: 12, color: '#ef4444', cursor: 'pointer' }} onClick={() => removeSite('blocked', site)}>{site} ×</span>
                ))}
              </div>
            </div>

            {/* Allowed Sites */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#94a3b8' }}>✅ Allowed Sites</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={siteInput.allowed} onChange={(e) => setSiteInput({ ...siteInput, allowed: e.target.value })} placeholder="safekids.com" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSite('allowed'))} />
                <button type="button" onClick={() => addSite('allowed')} style={{ padding: '10px 16px', background: '#14532d', border: 'none', borderRadius: 8, color: '#22c55e', whiteSpace: 'nowrap' }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {editChild.allowedSites?.map((site) => (
                  <span key={site} style={{ padding: '4px 10px', background: '#14532d', borderRadius: 20, fontSize: 12, color: '#22c55e', cursor: 'pointer' }} onClick={() => removeSite('allowed', site)}>{site} ×</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setEditChild(null)} style={{ flex: 1, padding: 10, background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9' }}>Cancel</button>
              <button onClick={handleUpdate} disabled={loading} style={{ flex: 1, padding: 10, background: '#6366f1', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600 }}>{loading ? '...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenPage;
