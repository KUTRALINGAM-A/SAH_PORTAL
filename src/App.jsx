import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AnnouncementBanner from './components/AnnouncementBanner';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TeamMarketplace from './pages/TeamMarketplace';
import MyTeamPage from './pages/MyTeamPage';
import CreateTeamPage from './pages/CreateTeamPage';
import ProfilePage from './pages/ProfilePage';
import ProblemStatementsPage from './pages/ProblemStatementsPage';

// Admin Pages
import ProblemStatementsAdmin from './pages/admin/ProblemStatementsAdmin';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import MasterRoster from './pages/admin/MasterRoster';
import BootcampShortlist from './pages/admin/BootcampShortlist';

// Judge Pages
import EvaluationPage from './pages/judge/EvaluationPage';
import EvaluationHistory from './pages/judge/EvaluationHistory';

// SPOC Pages
import VerificationQueue from './pages/spoc/VerificationQueue';

function HomePage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="hero-banner" style={{ marginTop: '0' }}>
        <h1>Smart Amrita Hackathon 2026</h1>
        <p>Amrita Vishwa Vidyapeetham, Chennai Campus — Innovating India, Solving National Challenges</p>
      </div>

      {/* What is SAH */}
      <div className="card" style={{ marginBottom: '24px', padding: '32px' }}>
        <h2 style={{ marginBottom: '12px' }}>What is SAH 2026?</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
          Smart Amrita Hackathon (SAH) 2026 is an internal hackathon organized by
          Amrita Vishwa Vidyapeetham, Chennai Campus to prepare and shortlist the
          best student teams for the National Smart India Hackathon (SIH) 2026.
          Students form teams of 6, choose problem statements from government
          ministries and organizations, and develop innovative solutions. The top 50
          teams will be selected through a rigorous evaluation process including
          Z-Score normalized judging, and will participate in an intensive bootcamp
          before being submitted to the national SIH portal.
        </p>
      </div>

      {/* How it Works */}
      <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>How It Works</h2>
      <div className="grid-4" style={{ marginBottom: '30px' }}>
        {[
          { icon: '📝', title: 'Register', desc: 'Sign up with your Amrita Chennai Roll ID and create your profile.' },
          { icon: '👥', title: 'Form a Team', desc: 'Create a team or join one from the recruitment marketplace.' },
          { icon: '📋', title: 'Choose Problem', desc: 'Select a problem statement and start building your solution.' },
          { icon: '🔒', title: 'Lock & Submit', desc: 'Lock your team (6 members, 1 female min) for SPOC verification.' }
        ].map((step, i) => (
          <div key={i} className="card card-elevated" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{step.icon}</div>
            <h4 style={{ marginBottom: '6px' }}>{step.title}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a href="/register" className="btn btn-orange btn-lg" style={{ marginRight: '12px' }}>
          🚀 Register Now
        </a>
        <a href="/problem-statements" className="btn btn-outline btn-lg">
          📋 View Problem Statements
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Auth pages — no banner/header/navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All other pages with layout */}
        <Route path="*" element={
          <>
            <AnnouncementBanner />
            <Header />
            <Navbar />
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/problem-statements" element={<ProblemStatementsPage />} />

              {/* Student / Team Leader */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><TeamMarketplace /></ProtectedRoute>} />
              <Route path="/my-team" element={<ProtectedRoute><MyTeamPage /></ProtectedRoute>} />
              <Route path="/create-team" element={<ProtectedRoute><CreateTeamPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Admin & SPOC Shared Management */}
              <Route path="/admin/problem-statements" element={<ProtectedRoute roles={['admin', 'spoc']}><ProblemStatementsAdmin /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin', 'spoc']}><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/admin/roster" element={<ProtectedRoute roles={['admin', 'spoc']}><MasterRoster /></ProtectedRoute>} />
              <Route path="/admin/bootcamp" element={<ProtectedRoute roles={['admin', 'spoc']}><BootcampShortlist /></ProtectedRoute>} />
              <Route path="/spoc/verify" element={<ProtectedRoute roles={['spoc', 'admin']}><VerificationQueue /></ProtectedRoute>} />

              {/* Judge */}
              <Route path="/judge/evaluate" element={<ProtectedRoute roles={['judge', 'admin']}><EvaluationPage /></ProtectedRoute>} />
              <Route path="/judge/history" element={<ProtectedRoute roles={['judge', 'admin']}><EvaluationHistory /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={
                <div className="page-container">
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>Page Not Found</h3>
                    <p>The page you're looking for doesn't exist.</p>
                  </div>
                </div>
              } />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
    </>
  );
}
