import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signUp, signOut, user, profile, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Clear existing session
    await signOut();

    // 2. Attempt sign in
    const { error: signInError } = await signIn({ email: email.trim(), password, userType });

    if (signInError) {
      setError(signInError.message || 'Login failed. Please check your credentials or register a new account.');
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/Logo.png" alt="SAH 2026" />
        </div>

        <h2 className="login-heading">
          SAH 2026 Portal Login
        </h2>

        <p className="login-subheading">
          Smart Amrita Hackathon — Amrita Chennai Campus
        </p>

        {isAuthenticated && (
          <div style={{
            background: 'var(--navy-light)',
            color: 'var(--white)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              👤 Currently logged in as: <strong>{profile?.full_name || user?.email}</strong> ({profile?.role || 'student'})
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-orange btn-sm"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--white)', borderColor: 'var(--white)' }}
                onClick={() => signOut()}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {(error || authError) && (
          <div style={{
            background: '#FFEBEE',
            color: 'var(--red)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            ⚠️ {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In to SAH Portal'}
          </button>
        </form>

        <div className="auth-link">
          Don't have an account?{' '}
          <Link to="/register">Register for SAH 2026</Link>
        </div>
      </div>
    </div>
  );
}
