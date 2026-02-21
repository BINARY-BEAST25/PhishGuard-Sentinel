import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register(form);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', padding: 40, background: '#1e293b', borderRadius: 16, border: '1px solid #334155', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ color: '#22c55e', marginBottom: 8 }}>Check your email!</h2>
        <p style={{ color: '#94a3b8' }}>We sent a verification link to <strong>{form.email}</strong></p>
        <Link to="/login" style={{ display: 'inline-block', marginTop: 24, color: '#6366f1' }}>Back to login →</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 40, background: '#1e293b', borderRadius: 16, border: '1px solid #334155' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ color: '#6366f1', fontSize: 24, fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>Start protecting your children today</p>
        </div>
        <form onSubmit={handleSubmit}>
          {['name', 'email', 'password'].map((field) => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>{field}</label>
              <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={field === 'name' ? 'Your name' : field === 'email' ? 'email@example.com' : 'Min 8 characters'}
                required minLength={field === 'password' ? 8 : undefined} />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 12, background: '#6366f1', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: 15, marginTop: 8,
          }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
