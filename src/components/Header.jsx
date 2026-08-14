import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { isAuthenticated, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="header-logo" style={{ textDecoration: 'none' }}>
          <img src="/Logo.png" alt="SAH 2026 Logo" />
          <div className="header-logo-text">
            <span className="title">SMART AMRITA HACKATHON 2026</span>
            <span className="subtitle">Amrita Vishwa Vidyapeetham, Chennai Campus</span>
          </div>
        </Link>

        <div className="header-actions">
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn-login-pill"
                onClick={() => navigate('/profile')}
                title={`Logged in as ${profile?.full_name || 'User'} (${profile?.role || 'student'}) — Click to view My Profile`}
                style={{ cursor: 'pointer' }}
              >
                <span>{profile?.full_name?.split(' ')[0] || 'My Profile'}</span>
                <span className="login-icon">
                  {getInitials(profile?.full_name)}
                </span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={signOut}
                style={{ fontSize: '0.8rem' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="btn-login-pill" onClick={handleAuthClick}>
              <span>SAH Login</span>
              <span className="login-icon">👤</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
