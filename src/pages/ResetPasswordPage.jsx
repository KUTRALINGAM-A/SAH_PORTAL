import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import sahLogo from '../assets/Logo.png';

export default function ResetPasswordPage() {
  const { verifyOtpForPasswordReset, updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    let res;
    if (otpToken.trim().length >= 6 && email) {
      // 1. Verify 6-digit OTP code & update password
      res = await verifyOtpForPasswordReset({
        email: email.trim(),
        token: otpToken.trim(),
        newPassword
      });
    } else if (session?.user) {
      // 2. Direct session recovery update (if opened via magic link session)
      res = await updatePassword(newPassword);
    } else {
      setError('Please provide your email address and 6-digit OTP code.');
      setLoading(false);
      return;
    }

    if (res?.error) {
      setError(res.error.message || 'Failed to reset password. Please check your 6-digit OTP code or request a new one.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div className="login-logo">
          <img
            src={sahLogo}
            alt="SAH 2026 Logo"
            style={{ display: 'block', margin: '0 auto 16px', maxHeight: '80px', width: 'auto' }}
          />
        </div>

        <h2 className="login-heading">Reset Password with OTP</h2>

        <p className="login-subheading">
          Enter your email, 6-digit security OTP code, and new password below.
        </p>

        {error && (
          <div
            style={{
              background: '#FFEBEE',
              color: 'var(--red)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              borderLeft: '4px solid #D32F2F'
            }}
          >
             {error}
          </div>
        )}

        {success ? (
          <div
            style={{
              background: '#E8F5E9',
              color: '#2E7D32',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '20px',
              borderLeft: '4px solid #2E7D32',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎉</div>
            <strong>Password Reset Successfully!</strong>
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
              Your password has been updated. Redirecting to login page in 3 seconds...
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Go to Login Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {!session?.user && (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Registered Email Address
                  </label>
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
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 123456"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    style={{ letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                New Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Resetting Password...' : 'Verify OTP & Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-link" style={{ marginTop: '20px' }}>
          Back to <Link to="/login">Login</Link> | <Link to="/forgot-password">Resend OTP</Link>
        </div>
      </div>
    </div>
  );
}
