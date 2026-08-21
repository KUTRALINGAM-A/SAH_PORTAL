import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AnnouncementBanner from './components/AnnouncementBanner';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import flowchart from './assets/FLOWCHART.png';
import vJeyakumarImg from './assets/V_jeyakumar.jpg';
import piyushImg from './assets/piyush-pratap-singh-faculty-image.jpeg';
import simhadriImg from './assets/simhadri_sir.jpeg';
import krishnakumarImg from './assets/s-krishnakumar.png';
import nivethithaImg from './assets/nivethitha.jpg';
import aravindImg from './assets/Aravind.png';
import parthasarathyImg from './assets/dr-parthasarathy.jpg';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TeamMarketplace from './pages/TeamMarketplace';
import MyTeamPage from './pages/MyTeamPage';
import CreateTeamPage from './pages/CreateTeamPage';
import ProfilePage from './pages/ProfilePage';
import ProblemStatementsPage from './pages/ProblemStatementsPage';
import EventLandingPage from './pages/EventLandingPage';

// Admin Pages
import ProblemStatementsAdmin from './pages/admin/ProblemStatementsAdmin';
import JudgePanelsAdmin from './pages/admin/JudgePanelsAdmin';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import MasterRoster from './pages/admin/MasterRoster';
import BootcampShortlist from './pages/admin/BootcampShortlist';

// Judge Pages
import EvaluationPage from './pages/judge/EvaluationPage';
import EvaluationHistory from './pages/judge/EvaluationHistory';

// SPOC Pages
import VerificationQueue from './pages/spoc/VerificationQueue';

function SahHomePage() {
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

      {/* How it Works Section */}
      <section className="how-it-works-section">
        {/* Header Pill */}
        <div className="flowchart-header">
          <span className="flowchart-pill">HOW IT WORKS</span>
        </div>

        {/* 3 Steps Row */}
        <div className="how-it-works-grid">
          {[
            {
              step: '01',
              colorTheme: 'step-orange',
              title: 'Register & Form a Team',
              desc: 'Sign up with your Amrita Chennai Roll ID and create or join a 6-member team.'
            },
            {
              step: '02',
              colorTheme: 'step-navy',
              title: 'Choose Problem',
              desc: 'Select an official problem statement and start developing your prototype.'
            },
            {
              step: '03',
              colorTheme: 'step-green',
              title: 'Lock & Submit',
              desc: 'Lock your team (min 1 female member) and submit solution PPT & GitHub links for SPOC verification.'
            }
          ].map((item, i) => (
            <div key={i} className={`how-it-works-column ${item.colorTheme}`}>
              {/* Step Card */}
              <div className="how-it-works-card">
                {/* Circular Badge */}
                <div className="how-it-works-badge">{item.step}</div>

                {/* Content */}
                <h4 className="how-it-works-title">{item.title}</h4>
                <p className="how-it-works-desc">{item.desc}</p>
              </div>
            </div>
          ))}

        </div>
      </section>{/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a href="/register" className="btn btn-orange btn-lg" style={{ marginRight: '12px' }}>
          Register Now
        </a>
        <a href="/problem-statements" className="btn btn-outline btn-lg">
          View Problem Statements
        </a>
      </div>

      {/* SAH Logo Showcase */}
      <div className="sah-logo-showcase">
        <img src={flowchart} alt="Smart Amrita Hackathon 2026" className="sah-logo-img" />
      </div>

      {/* Organizing Committee */}
      <section className="organizing-committee-section">
        <div className="flowchart-header">
          <span className="flowchart-pill">ORGANIZING COMMITTEE</span>
        </div>

        {/* Patron — Principal */}
        <div className="oc-tier">
          <div className="oc-tier-label">Patron</div>
          <div className="oc-cards-row oc-cards-center">
            <div className="oc-card oc-card-patron">
              <div className="oc-avatar oc-avatar-lg">
                <img src={vJeyakumarImg} alt="Dr. V. Jeyakumar" />
              </div>
              <div className="oc-name">Dr. V. Jayakumar</div>
              <div className="oc-designation">Principal</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>
          </div>
        </div>

        {/* SPOC */}
        <div className="oc-tier">
          <div className="oc-tier-label">Single Point of Contact (SPOC)</div>
          <div className="oc-cards-row oc-cards-center">
            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={piyushImg} alt="Dr. Piyush Pratap Singh" />
              </div>
              <div className="oc-name">Dr. Piyush Pratap Singh</div>
              <div className="oc-designation">SPOC — Smart India Hackathon</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>
          </div>
        </div>

        {/* Co-Patrons */}
        <div className="oc-tier">
          <div className="oc-tier-label">Co-Patrons</div>
          <div className="oc-cards-row oc-cards-center">
            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={simhadriImg} alt="Dr. Ravishankar Simhadri" />
              </div>
              <div className="oc-name">Dr. Ravishankar Simhadri</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>

            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={krishnakumarImg} alt="Dr. S. Krishnakumar" />
              </div>
              <div className="oc-name">Dr. S. Krishnakumar</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>

            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={nivethithaImg} alt="Dr. Nivethitha" />
              </div>
              <div className="oc-name">Dr. Nivethitha</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>

            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={aravindImg} alt="Dr. J.V. Aravind" />
              </div>
              <div className="oc-name">Dr. J.V. Aravind</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>

            <div className="oc-card">
              <div className="oc-avatar oc-avatar-md">
                <img src={parthasarathyImg} alt="Dr. S. Parthasarathy" />
              </div>
              <div className="oc-name">Dr. S. Parthasarathy</div>
              <div className="oc-institution">Amrita Vishwa Vidyapeetham, Chennai Campus</div>
            </div>
          </div>
        </div>
      </section>


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
        <Route path="/" element={<EventLandingPage />} />
        {/* Auth pages — no banner/header/navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* All other pages with layout */}
        <Route path="*" element={
          <>
            <AnnouncementBanner />
            <Header />
            <Navbar />
            <Routes>
              {/* Public */}
              <Route path="/sah" element={<SahHomePage />} />
              <Route path="/problem-statements" element={<ProblemStatementsPage />} />

              {/* Student / Team Leader */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><TeamMarketplace /></ProtectedRoute>} />
              <Route path="/my-team" element={<ProtectedRoute><MyTeamPage /></ProtectedRoute>} />
              <Route path="/create-team" element={<ProtectedRoute><CreateTeamPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Admin & SPOC Shared Management */}
              <Route path="/admin/problem-statements" element={<ProtectedRoute roles={['admin', 'spoc']}><ProblemStatementsAdmin /></ProtectedRoute>} />
              <Route path="/admin/judge-panels" element={<ProtectedRoute roles={['admin']}><JudgePanelsAdmin /></ProtectedRoute>} />
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
                    <div className="empty-icon"></div>
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
