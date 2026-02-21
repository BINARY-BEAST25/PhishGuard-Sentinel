// Email Verification Page
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return; }

    axios.post(`${API_BASE}/auth/verify`, { token })
      .then(({ data }) => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => navigate('/dashboard'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a'
    }}>
      <div className="card" style={{ maxWidth: 440, width: '90%', textAlign: 'center', padding: 40 }}>
        {status === 'loading' && (
          <>
            <div className="spinner" />
            <p style={{ color: '#94a3b8' }}>Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ color: '#34d399', marginBottom: 12 }}>Email Verified!</h2>
            <p style={{ color: '#94a3b8' }}>{message}</p>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>❌</div>
            <h2 style={{ color: '#f87171', marginBottom: 12 }}>Verification Failed</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>{message}</p>
            <Link to="/login" className="btn btn-primary">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
