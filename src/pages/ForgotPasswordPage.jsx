import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import sahLogo from '../assets/Logo.png';

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail, verifyOtpForPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset
  const [email, setEmail] = useState('');
  const [dispatchedEmail, setDispatchedEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Trigger 6-Digit OTP email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { data: resetData, error: resetErr } = await resetPasswordForEmail(email);

    if (resetErr) {
      setError(resetErr.message || 'Failed to send OTP email. Please check the email address.');
    } else {
      const target = resetData?.targetEmail || email;
      const isCollege = resetData?.isCollegeEmail;
      setDispatchedEmail(target);
      setMessage(
        isCollege
          ? `A 6-digit OTP security code has been sent to your College Mail ID: ${target}. Please check your inbox.`
          : `A 6-digit OTP security code has been sent to your Personal Email: ${target}. Please check your inbox.`
      );
      setStep(2);
    }
    setLoading(false);
  };

  // Step 2: Verify 6-Digit OTP & Reset Password
  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError('');

    if (otpToken.trim().length < 6) {
      setError('Please enter the full 6-digit OTP code sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: verifyErr } = await verifyOtpForPasswordReset({
      email: dispatchedEmail || email,
      token: otpToken,
      newPassword
    });

    if (verifyErr) {
      setError(verifyErr.message || 'Invalid or expired OTP code. Please verify the 6-digit code or request a new one.');
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

        <h2 className="login-heading">
          {success ? 'Password Updated!' : step === 1 ? 'Forgot Password?' : 'Enter OTP & New Password'}
        </h2>

        <p className="login-subheading">
          {step === 1
            ? 'Enter your registered Email Address or College Mail ID to receive a 6-digit OTP code.'
            : `Enter the 6-digit OTP sent to ${dispatchedEmail || email} along with your new password.`}
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

        {message && !error && step === 2 && !success && (
          <div
            style={{
              background: '#E3F2FD',
              color: '#1565C0',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              borderLeft: '4px solid #1976D2'
            }}
          >
            ℹ️ {message}
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
            <strong>Password Reset Successful!</strong>
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
              Your account password has been updated. Redirecting to login page in 3 seconds...
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Go to Login Now
              </Link>
            </div>
          </div>
        ) : step === 1 ? (
          /* STEP 1 FORM: Send OTP */
          <form onSubmit={handleRequestOtp}>
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

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Sending OTP Code...' : 'Send 6-Digit OTP'}
            </button>
          </form>
        ) : (
          /* STEP 2 FORM: Enter OTP & New Password */
          <form onSubmit={handleVerifyOtpAndReset}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                6-Digit OTP Security Code
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
              {loading ? 'Verifying OTP...' : 'Verify OTP & Reset Password'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.8rem' }}>
              <button
                type="button"
                className="btn-text"
                style={{ background: 'none', border: 'none', color: 'var(--orange-primary)', cursor: 'pointer', padding: 0 }}
                onClick={() => setStep(1)}
              >
                ← Change Email
              </button>
              <button
                type="button"
                className="btn-text"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                onClick={handleRequestOtp}
                disabled={loading}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <div className="auth-link" style={{ marginTop: '20px' }}>
          Remembered your password? <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
