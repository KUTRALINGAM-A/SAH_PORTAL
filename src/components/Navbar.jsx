import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();

  // Hide navbar on login/register pages
  if (['/login', '/register'].includes(location.pathname)) return null;

  const studentTabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/marketplace', label: 'Team Recruitment' },
    { path: '/my-team', label: 'My Team & Pitch' },
    { path: '/problem-statements', label: 'Problem Statements' },
    { path: '/profile', label: 'My Profile' },
  ];

  const adminTabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/admin/problem-statements', label: 'Problem Statements' },
    { path: '/admin/judge-panels', label: 'Judge Panels' },
    { path: '/admin/roster', label: 'Master Roster' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/spoc/verify', label: 'Verification Queue' },
    { path: '/admin/bootcamp', label: 'Top 50 Shortlist' },
    { path: '/profile', label: 'My Profile' },
  ];

  const spocTabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/spoc/verify', label: 'Verification Queue' },
    { path: '/admin/roster', label: 'Master Roster' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/bootcamp', label: 'Top 50 Shortlist' },
    { path: '/problem-statements', label: 'Problem Statements' },
    { path: '/profile', label: 'My Profile' },
  ];

  const judgeTabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/judge/evaluate', label: 'Evaluate Teams' },
    { path: '/judge/history', label: 'My Evaluations' },
    { path: '/problem-statements', label: 'Problem Statements' },
    { path: '/profile', label: 'My Profile' },
  ];

  let tabs = studentTabs;
  if (profile?.role === 'admin') tabs = adminTabs;
  else if (profile?.role === 'judge') tabs = judgeTabs;
  else if (profile?.role === 'spoc') tabs = spocTabs;

  // If not authenticated, show public tabs
  if (!isAuthenticated) {
    tabs = [
      { path: '/', label: 'Home' },
      { path: '/problem-statements', label: 'Problem Statements' },
    ];
  }

  return (
    <nav className="main-navbar">
      <div className="navbar-container">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
