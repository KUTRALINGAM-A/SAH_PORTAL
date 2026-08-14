import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import StatCard from '../../components/StatCard';
import UserProfileModal from '../../components/UserProfileModal';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allProblemStatements, setAllProblemStatements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Problem Statement Mapping
  const [psSearch, setPsSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedPsFilter, setSelectedPsFilter] = useState('all'); // 'all', 'with_teams', 'no_teams'
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    const [teamsRes, profilesRes, membersRes, psRes] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name', { ascending: true }),
      supabase.from('team_members').select('*'),
      supabase.from('problem_statements').select('*').order('ps_code', { ascending: true })
    ]);

    const teams = teamsRes.data || [];
    const profiles = profilesRes.data || [];
    const members = membersRes.data || [];
    const ps = psRes.data || [];

    setAllTeams(teams);
    setAllProfiles(profiles);
    setAllMembers(members);
    setAllProblemStatements(ps);

    // Department distribution & splitting
    const deptTotalCounts = {};
    const deptInTeamCounts = {};
    const deptWithoutTeamCounts = {};
    const deptFemaleCounts = {};

    profiles.forEach(p => {
      const dept = p.department || 'Other';
      deptTotalCounts[dept] = (deptTotalCounts[dept] || 0) + 1;
      if (p.gender === 'Female') {
        deptFemaleCounts[dept] = (deptFemaleCounts[dept] || 0) + 1;
      }
      if (members.some(m => m.student_id === p.id)) {
        deptInTeamCounts[dept] = (deptInTeamCounts[dept] || 0) + 1;
      } else {
        deptWithoutTeamCounts[dept] = (deptWithoutTeamCounts[dept] || 0) + 1;
      }
    });

    // Gender distribution
    const genderCounts = { Male: 0, Female: 0, Other: 0 };
    profiles.forEach(p => { genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1; });

    // Team sizes
    const teamSizes = {};
    members.forEach(m => { teamSizes[m.team_id] = (teamSizes[m.team_id] || 0) + 1; });

    // PS Distribution & Domain counts
    const psTeamCountMap = {};
    const domainCounts = {};
    const categoryCounts = { Software: 0, Hardware: 0 };

    teams.forEach(t => {
      if (t.ps_id) {
        psTeamCountMap[t.ps_id] = (psTeamCountMap[t.ps_id] || 0) + 1;
      }
    });

    ps.forEach(p => {
      if (p.domain) domainCounts[p.domain] = (domainCounts[p.domain] || 0) + (psTeamCountMap[p.id] || 0);
      if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + (psTeamCountMap[p.id] || 0);
    });

    const teamsWithPs = teams.filter(t => t.ps_id).length;
    const teamsWithoutPs = teams.length - teamsWithPs;

    // Students in teams
    const studentsInTeams = new Set(members.map(m => m.student_id)).size;

    // Open slots
    const openSlots = teams
      .filter(t => !t.is_locked && t.is_open_for_recruitment)
      .reduce((sum, t) => sum + Math.max(0, 6 - (teamSizes[t.id] || 0)), 0);

    setStats({
      totalStudents: profiles.length,
      totalTeams: teams.length,
      openTeams: teams.filter(t => t.is_open_for_recruitment && !t.is_locked).length,
      lockedTeams: teams.filter(t => t.is_locked).length,
      verifiedTeams: teams.filter(t => t.is_spoc_verified).length,
      totalPS: ps.length,
      teamsWithPs,
      teamsWithoutPs,
      studentsInTeams,
      studentsWithoutTeam: profiles.length - studentsInTeams,
      openSlots,
      femaleCount: genderCounts.Female,
      femaleRatio: profiles.length > 0 ? ((genderCounts.Female / profiles.length) * 100).toFixed(1) : 0,
      deptTotalCounts,
      deptInTeamCounts,
      deptWithoutTeamCounts,
      deptFemaleCounts,
      genderCounts,
      teamSizes,
      domainCounts,
      categoryCounts,
      psTeamCountMap
    });
    setLoading(false);
  }

  // Lookups
  const profileMap = useMemo(() => {
    const map = {};
    allProfiles.forEach(p => { map[p.id] = p; });
    return map;
  }, [allProfiles]);

  const teamMembersMap = useMemo(() => {
    const map = {};
    allMembers.forEach(m => {
      if (!map[m.team_id]) map[m.team_id] = [];
      map[m.team_id].push(m);
    });
    return map;
  }, [allMembers]);

  // Group teams by PS ID
  const teamsByPsMap = useMemo(() => {
    const map = {};
    allTeams.forEach(t => {
      const key = t.ps_id || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [allTeams]);

  // Unique domains
  const domains = useMemo(() => {
    const set = new Set();
    allProblemStatements.forEach(ps => { if (ps.domain) set.add(ps.domain); });
    return Array.from(set).sort();
  }, [allProblemStatements]);

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  // Chart Data: Department-wise Splitting (Stacked: In Team vs Unassigned)
  const deptLabels = Object.keys(stats.deptTotalCounts).sort();
  const deptData = {
    labels: deptLabels,
    datasets: [
      {
        label: 'In Team',
        data: deptLabels.map(d => stats.deptInTeamCounts[d] || 0),
        backgroundColor: '#1E3A8A', // Navy
        borderRadius: 4
      },
      {
        label: 'Looking for Team (Unassigned)',
        data: deptLabels.map(d => stats.deptWithoutTeamCounts[d] || 0),
        backgroundColor: '#E85D26', // Orange
        borderRadius: 4
      },
      {
        label: 'Female Students (Diversity)',
        data: deptLabels.map(d => stats.deptFemaleCounts[d] || 0),
        backgroundColor: '#9333EA', // Purple
        borderRadius: 4
      }
    ]
  };

  // Chart Data: Domain Distribution (Big horizontal/vertical bar)
  const domainLabels = Object.keys(stats.domainCounts).filter(d => stats.domainCounts[d] > 0);
  const domainData = {
    labels: domainLabels.length > 0 ? domainLabels : ['AI/ML', 'IoT', 'Web Development', 'Healthcare', 'Cybersecurity'],
    datasets: [{
      label: 'Teams Selected',
      data: domainLabels.length > 0 ? domainLabels.map(d => stats.domainCounts[d]) : [2, 1, 1, 1, 0],
      backgroundColor: '#2563EB',
      borderRadius: 6
    }]
  };

  // Chart Data: Gender Diversity
  const genderData = {
    labels: ['Male', 'Female', 'Other'],
    datasets: [{
      data: [stats.genderCounts.Male, stats.genderCounts.Female, stats.genderCounts.Other],
      backgroundColor: ['#1E3A8A', '#9333EA', '#0D9488'],
      borderWidth: 3,
      borderColor: '#ffffff'
    }]
  };

  // Chart Data: Category (Software vs Hardware)
  const categoryData = {
    labels: ['💻 Software', '⚡ Hardware'],
    datasets: [{
      data: [stats.categoryCounts.Software || 0, stats.categoryCounts.Hardware || 0],
      backgroundColor: ['#3B82F6', '#E85D26'],
      borderWidth: 3,
      borderColor: '#ffffff'
    }]
  };

  // Chart Data: Team Status
  const teamStatusData = {
    labels: ['🔒 Locked & Submitted', '📢 Recruiting / Open'],
    datasets: [{
      data: [stats.lockedTeams, stats.openTeams],
      backgroundColor: ['#10B981', '#F59E0B'],
      borderWidth: 3,
      borderColor: '#ffffff'
    }]
  };

  // Filter Problem Statements
  const filteredProblemStatements = allProblemStatements.filter(ps => {
    const assignedTeams = teamsByPsMap[ps.id] || [];
    if (selectedPsFilter === 'with_teams' && assignedTeams.length === 0) return false;
    if (selectedPsFilter === 'no_teams' && assignedTeams.length > 0) return false;
    if (categoryFilter && ps.category !== categoryFilter) return false;
    if (domainFilter && ps.domain !== domainFilter) return false;

    if (psSearch) {
      const q = psSearch.toLowerCase().trim();
      const matchCode = ps.ps_code?.toLowerCase().includes(q);
      const matchTitle = ps.title?.toLowerCase().includes(q);
      const matchDomain = ps.domain?.toLowerCase().includes(q);
      const matchOrg = ps.organization?.toLowerCase().includes(q);
      const matchTeam = assignedTeams.some(t => t.team_name?.toLowerCase().includes(q));
      if (!matchCode && !matchTitle && !matchDomain && !matchOrg && !matchTeam) return false;
    }
    return true;
  });

  const unassignedTeams = teamsByPsMap['unassigned'] || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 Analytics & Intelligence Dashboard</h1>
        <p className="page-subtitle">Live real-time statistics, branch splitting, diversity metrics, and problem statement allocation for SAH 2026</p>
      </div>

      {/* Row 1 Stats */}
      <div className="stats-row">
        <StatCard number={stats.totalStudents} label="Registered Students" />
        <StatCard number={stats.totalTeams} label="Total Teams" />
        <StatCard number={stats.openTeams} label="Open for Recruitment" accent />
        <StatCard number={stats.lockedTeams} label="Locked Teams" />
        <StatCard number={stats.verifiedTeams} label="SPOC Verified" />
      </div>

      {/* Row 2 Stats */}
      <div className="stats-row" style={{ marginBottom: '32px' }}>
        <StatCard number={stats.teamsWithPs} label="Teams with Problem Statement" accent />
        <StatCard number={stats.teamsWithoutPs} label="Teams Without Problem" />
        <StatCard number={stats.studentsInTeams} label="Students in Teams" />
        <StatCard number={stats.studentsWithoutTeam} label="Students Without Team" accent />
        <StatCard number={`${stats.femaleRatio}%`} label="Female Participation" />
      </div>

      {/* BIG CHARTS SECTION: Department Wise Splitting & Domain Preferences */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '32px' }}>
        {/* Department Splitting Full-Width Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏛️</span> Department-Wise Student & Team Splitting
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Compare assigned vs unassigned students and female diversity across all academic departments.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="pill-badge" style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', fontSize: '0.8rem' }}>
                {deptLabels.length} Departments Registered
              </span>
            </div>
          </div>

          <div style={{ height: '380px', width: '100%', position: 'relative' }}>
            <Bar
              data={deptData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { boxWidth: 14, font: { size: 12, weight: 'bold' } }
                  },
                  tooltip: {
                    padding: 12,
                    cornerRadius: 8
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '600' } }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { size: 11 } },
                    grid: { color: '#F1F5F9' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Domain Preferences & Doughnut Trio */}
        <div className="grid-2">
          {/* Domain Chart */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span> Domain Preferences (Teams by Domain)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Distribution of teams across core technical innovation tracks.
            </p>

            <div style={{ height: '340px', width: '100%', position: 'relative' }}>
              <Bar
                data={domainData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { padding: 12, cornerRadius: 8 }
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 11, weight: '600' } }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1, font: { size: 11 } },
                      grid: { color: '#F1F5F9' }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Breakdown Doughnuts Cards (3-column layout inside card) */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> Composition & Diversity Distribution
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Breakdown of student gender diversity, software/hardware tracks, and team locks.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', alignItems: 'center' }}>
              {/* Gender Doughnut */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  ♀️ Gender Ratio
                </div>
                <div style={{ height: '170px', position: 'relative' }}>
                  <Doughnut
                    data={genderData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                    }}
                  />
                </div>
              </div>

              {/* Category Doughnut */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  💻 Track Split
                </div>
                <div style={{ height: '170px', position: 'relative' }}>
                  <Doughnut
                    data={categoryData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                    }}
                  />
                </div>
              </div>

              {/* Team Status Doughnut */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  🔒 Team Locks
                </div>
                <div style={{ height: '170px', position: 'relative' }}>
                  <Doughnut
                    data={teamStatusData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: PROBLEM STATEMENT TO TEAM ALLOCATION MATRIX */}
      <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Problem Statement Allocation Explorer
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Inspect which teams are solving which problem statements, track team competition, and spot unassigned statements.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="pill-badge" style={{ background: '#EFF6FF', color: '#1E40AF', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
              📋 {allProblemStatements.length} Total Problem Statements
            </span>
            <span className="pill-badge" style={{ background: '#ECFDF5', color: '#065F46', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
              ✅ {stats.teamsWithPs} Teams Assigned
            </span>
            {unassignedTeams.length > 0 && (
              <span className="pill-badge" style={{ background: '#FEF3C7', color: '#B45309', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                ⚠️ {unassignedTeams.length} Teams Need Problem
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #E2E8F0'
        }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search PS Code, Title, Domain, or Team Name..."
            value={psSearch}
            onChange={(e) => setPsSearch(e.target.value)}
            style={{ flex: '1 1 280px' }}
          />

          <select
            className="form-select"
            value={selectedPsFilter}
            onChange={(e) => setSelectedPsFilter(e.target.value)}
            style={{ flex: '0 1 180px' }}
          >
            <option value="all">All Statements</option>
            <option value="with_teams">Statements With Teams ({stats.teamsWithPs})</option>
            <option value="no_teams">Unassigned Statements (0 Teams)</option>
          </select>

          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ flex: '0 1 160px' }}
          >
            <option value="">All Categories</option>
            <option value="Software">💻 Software</option>
            <option value="Hardware">⚡ Hardware</option>
          </select>

          <select
            className="form-select"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            style={{ flex: '0 1 180px' }}
          >
            <option value="">All Domains</option>
            {domains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Teams with NO Problem Statement Notice */}
        {unassignedTeams.length > 0 && selectedPsFilter !== 'with_teams' && !domainFilter && !categoryFilter && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ color: '#92400E', fontSize: '0.95rem' }}>
                {unassignedTeams.length} Team(s) Have NOT Selected a Problem Statement Yet:
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {unassignedTeams.map(t => {
                const leader = profileMap[t.leader_id];
                return (
                  <div
                    key={t.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <strong>{t.team_name}</strong>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.78rem' }}>
                      Leader: {leader?.full_name} ({leader?.department})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Problem Statements List with Teams */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredProblemStatements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                No problem statements match your filter criteria.
              </p>
            </div>
          ) : (
            filteredProblemStatements.map(ps => {
              const assignedTeams = teamsByPsMap[ps.id] || [];

              return (
                <div
                  key={ps.id}
                  style={{
                    background: '#ffffff',
                    border: assignedTeams.length > 0 ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: assignedTeams.length > 0 ? '0 2px 8px rgba(59, 130, 246, 0.08)' : '0 1px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: '1 1 450px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1.1rem' }}>
                          {ps.ps_code}
                        </span>
                        <span className={`pill-badge ${ps.category === 'Hardware' ? 'domain' : 'skill'}`} style={{ fontSize: '0.72rem' }}>
                          {ps.category}
                        </span>
                        <span className="pill-badge domain" style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.72rem' }}>
                          {ps.domain}
                        </span>
                        {assignedTeams.length > 0 ? (
                          <span className="pill-badge status-verified" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            🎯 {assignedTeams.length} Team{assignedTeams.length > 1 ? 's' : ''} Competing
                          </span>
                        ) : (
                          <span className="pill-badge" style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.72rem' }}>
                            0 Teams Assigned
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 700 }}>
                        {ps.title}
                      </h3>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        🏛️ <strong>Organization:</strong> {ps.organization || 'Government of India'}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Teams Breakdown */}
                  {assignedTeams.length > 0 ? (
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                        👥 Teams Solving This Problem ({assignedTeams.length})
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                        {assignedTeams.map(team => {
                          const mList = teamMembersMap[team.id] || [];
                          const leader = profileMap[team.leader_id];

                          return (
                            <div
                              key={team.id}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '0.92rem', color: 'var(--navy)' }}>{team.team_name}</strong>
                                <span className={`pill-badge ${team.is_locked ? 'status-locked' : 'status-open'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                  {team.is_locked ? '🔒 Locked' : `📢 ${mList.length}/6`}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                Leader: <strong>{leader?.full_name || 'Unknown'}</strong> ({leader?.department})
                              </div>

                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                                {leader && (
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setViewingProfile(leader)}
                                    style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                  >
                                    👤 Leader Profile
                                  </button>
                                )}
                                {team.ppt_url && (
                                  <a
                                    href={team.ppt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.72rem', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}
                                  >
                                    📊 Pitch PPT ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No teams have picked this problem statement yet. Available for new teams!
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {viewingProfile && (
        <UserProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}

