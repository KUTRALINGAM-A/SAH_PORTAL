import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import TeamInvitationsCard from '../components/TeamInvitationsCard';
import AdminDashboardDetailsModal from '../components/AdminDashboardDetailsModal';
import JudgePanelDetailModal from '../components/JudgePanelDetailModal';
import UserProfileModal from '../components/UserProfileModal';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalTeams: 0,
    openTeams: 0,
    lockedTeams: 0,
    totalStudents: 0,
    unassignedStudents: 0,
    femaleRatio: '0%'
  });
  const [myTeam, setMyTeam] = useState(null);
  const [judgePanelInfo, setJudgePanelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [allPanels, setAllPanels] = useState([]);
  const [allPanelJudges, setAllPanelJudges] = useState([]);
  const [allPanelPS, setAllPanelPS] = useState([]);
  const [allEvaluations, setAllEvaluations] = useState([]);

  // Full datasets for drilldown
  const [allTeams, setAllTeams] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allProblemStatements, setAllProblemStatements] = useState([]);

  // Active details modal tab ('recruiting', 'unassigned', 'all_teams', 'locked', 'all_students', 'gender', or null)
  const [detailsModalTab, setDetailsModalTab] = useState(null);
  const [selectedPanelDetailId, setSelectedPanelDetailId] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  // Realtime subscription for live panel updates and stats
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('live-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_panels' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_judges' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_problem_statements' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // Fallback heartbeat poll every 10 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [profile]);

  async function fetchDashboardData() {
    try {
      // Fetch all relevant data concurrently
      const [
        teamsRes,
        profilesRes,
        membersRes,
        psRes,
        panelsRes,
        panelJudgesRes,
        panelPsRes,
        evalsRes
      ] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'student').order('full_name', { ascending: true }),
        supabase.from('team_members').select('*'),
        supabase.from('problem_statements').select('*'),
        supabase.from('judge_panels').select('*').order('created_at', { ascending: true }),
        supabase.from('panel_judges').select('panel_id, judge_id, profiles(id, full_name, email, department)'),
        supabase.from('panel_problem_statements').select('*'),
        supabase.from('evaluations').select('*')
      ]);

      const teams = teamsRes.data || [];
      const profiles = profilesRes.data || [];
      const members = membersRes.data || [];
      const psList = psRes.data || [];

      setAllTeams(teams);
      setAllProfiles(profiles);
      setAllMembers(members);
      setAllProblemStatements(psList);
      setAllPanels(panelsRes.data || []);
      setAllPanelJudges(panelJudgesRes.data || []);
      setAllPanelPS(panelPsRes.data || []);
      setAllEvaluations(evalsRes.data || []);

      // Compute student-in-team set
      const assignedStudentIds = new Set(members.map(m => m.student_id));
      const unassignedCount = profiles.filter(p => !assignedStudentIds.has(p.id)).length;
      const femaleCount = profiles.filter(p => p.gender === 'Female').length;

      // Compute team member counts
      const teamMemberCounts = {};
      members.forEach(m => {
        teamMemberCounts[m.team_id] = (teamMemberCounts[m.team_id] || 0) + 1;
      });

      const recruitingCount = teams.filter(t => (t.is_open_for_recruitment || (teamMemberCounts[t.id] || 0) < 6) && !t.is_locked).length;

      setStats({
        totalTeams: teams.length,
        openTeams: recruitingCount,
        lockedTeams: teams.filter(t => t.is_locked).length,
        totalStudents: profiles.length,
        unassignedStudents: unassignedCount,
        femaleRatio: profiles.length > 0 ? `${Math.round((femaleCount / profiles.length) * 100)}%` : '0%'
      });

      // Fetch user's team if student
      if (profile && profile.role === 'student') {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('team_id, member_role, teams(id, team_name, is_locked, is_open_for_recruitment)')
          .eq('student_id', profile.id)
          .limit(1)
          .single();

        if (memberData?.teams) {
          setMyTeam({ ...memberData.teams, role: memberData.member_role });
        }
      }

      // Fetch judge panel info if judge
      if (profile?.role === 'judge') {
        try {
          const { data: pjData } = await supabase
            .from('panel_judges')
            .select('panel_id, judge_panels(id, name)')
            .eq('judge_id', profile.id)
            .limit(1)
            .single();

          if (pjData?.panel_id) {
            const [coJudgesRes, panelPsRes] = await Promise.all([
              supabase
                .from('panel_judges')
                .select('judge_id, profiles(id, full_name, email, department)')
                .eq('panel_id', pjData.panel_id),
              supabase
                .from('panel_problem_statements')
                .select('ps_id, problem_statements(id, ps_code, title, category, domain)')
                .eq('panel_id', pjData.panel_id)
            ]);

            setJudgePanelInfo({
              panel: pjData.judge_panels,
              coJudges: (coJudgesRes.data || []).map(r => r.profiles).filter(Boolean),
              problemStatements: (panelPsRes.data || []).map(r => r.problem_statements).filter(Boolean)
            });
          } else {
            setJudgePanelInfo(null);
          }
        } catch (err) {
          console.error('Error fetching judge panel:', err);
          setJudgePanelInfo(null);
        }
      }
    } catch (error) {
      console.error('fetchDashboardData error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate live panel details for Admin & SPOC (hook must be called unconditionally before early returns)
  const livePanelDetails = useMemo(() => {
    return allPanels.map(panel => {
      // 1. Judge names
      const panelJudgesList = allPanelJudges
        .filter(pj => pj.panel_id === panel.id)
        .map(pj => pj.profiles?.full_name || pj.judge_id)
        .filter(Boolean);

      const judgeNames = panelJudgesList.length > 0
        ? panelJudgesList.join(', ')
        : 'No judges assigned';

      // 2. Assigned problem statements
      const assignedPsIds = allPanelPS
        .filter(pps => pps.panel_id === panel.id)
        .map(pps => pps.ps_id);

      const assignedPsSet = new Set(assignedPsIds);

      // 3. Assigned teams count
      const assignedTeams = allTeams.filter(t => t.ps_id && assignedPsSet.has(t.ps_id));
      const assignedTeamsCount = assignedTeams.length;
      const assignedTeamIdSet = new Set(assignedTeams.map(t => t.id));

      // 4. Get this panel's judge IDs
      const panelJudgeIds = new Set(
        allPanelJudges
          .filter(pj => pj.panel_id === panel.id)
          .map(pj => pj.judge_id)
      );
      const panelJudgeCount = panelJudgeIds.size;

      // 5. Evaluations completed — only count evals from THIS panel's judges for assigned teams
      const panelEvaluations = allEvaluations.filter(
        e => assignedTeamIdSet.has(e.team_id) && panelJudgeIds.has(e.judge_id)
      );

      // A team is "fully evaluated" only when ALL judges in this panel have submitted
      let evaluationsCompletedCount = 0;
      if (panelJudgeCount > 0) {
        assignedTeams.forEach(team => {
          const judgesWhoEvaluated = new Set(
            panelEvaluations.filter(e => e.team_id === team.id).map(e => e.judge_id)
          );
          if (judgesWhoEvaluated.size >= panelJudgeCount) {
            evaluationsCompletedCount++;
          }
        });
      }

      return {
        id: panel.id,
        name: panel.name,
        judgesCount: panelJudgesList.length,
        judgeNames,
        assignedTeamsCount,
        evaluationsCompletedCount,
        totalSubmissions: panelEvaluations.length
      };
    });
  }, [allPanels, allPanelJudges, allPanelPS, allTeams, allEvaluations]);

  // Judge specific evaluation stats
  const judgeAssignedTeamsCount = useMemo(() => {
    if (!judgePanelInfo?.problemStatements?.length) return 0;
    const assignedPsSet = new Set(judgePanelInfo.problemStatements.map(ps => ps.id));
    return allTeams.filter(t => t.ps_id && assignedPsSet.has(t.ps_id)).length;
  }, [allTeams, judgePanelInfo]);

  const judgeEvaluatedCount = useMemo(() => {
    if (!profile) return 0;
    const evaluatedTeamsSet = new Set(
      allEvaluations.filter(e => e.judge_id === profile.id).map(e => e.team_id)
    );
    return evaluatedTeamsSet.size;
  }, [allEvaluations, profile]);

  const judgePendingCount = useMemo(() => {
    return Math.max(0, judgeAssignedTeamsCount - judgeEvaluatedCount);
  }, [judgeAssignedTeamsCount, judgeEvaluatedCount]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  const isAdmin = profile?.role === 'admin';
  const isJudge = profile?.role === 'judge';
  const isSpoc = profile?.role === 'spoc';

  // Fast mapping for dashboard preview widgets
  const studentMap = {};
  allProfiles.forEach(p => { studentMap[p.id] = p; });
  const psMap = {};
  allProblemStatements.forEach(ps => { psMap[ps.id] = ps; });

  const assignedStudentIdSet = new Set(allMembers.map(m => m.student_id));
  const unassignedList = allProfiles.filter(p => p.role === 'student' && !assignedStudentIdSet.has(p.id));

  const teamMemberCountMap = {};
  allMembers.forEach(m => {
    teamMemberCountMap[m.team_id] = (teamMemberCountMap[m.team_id] || 0) + 1;
  });
  const recruitingList = allTeams.filter(t => (t.is_open_for_recruitment || (teamMemberCountMap[t.id] || 0) < 6) && !t.is_locked);

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="hero-banner">
        <h1>Welcome back, {profile?.full_name || 'Innovator'}!</h1>
        <p>
          {isAdmin && 'Admin Portal — Live system telemetry, judge panels, verification queue & analytics.'}
          {isJudge && (judgePanelInfo ? `Judge Dashboard — Assigned to ${judgePanelInfo.panel?.name || 'Panel'} · Official 50-Mark Rubric Evaluation.` : 'Judge Dashboard — Evaluate assigned teams on the official 50-mark SAH rubric.')}
          {isSpoc && 'SPOC Dashboard — Team verification, member compliance & SIH guardrails.'}
          {!isAdmin && !isJudge && !isSpoc && (
            myTeam
              ? `You are a ${myTeam.role} in "${myTeam.team_name}". Check your team status below.`
              : 'Smart Amrita Hackathon 2026 Internal Portal. Form your team of 6 and select a Problem Statement.'
          )}
        </p>
      </div>

      {/* ADMIN & SPOC: Live Panel Details Section (placed above the stats cards) */}
      {(isAdmin || isSpoc) && (
        <div className="live-sync-section">
          <div className="live-sync-header">
            <div>
              <h3>
                <span>Live Judge Panel Details</span>
                <span className="live-pill">
                  <span className="live-dot"></span>
                  Live Sync
                </span>
              </h3>
              <p>Real-time panel evaluation telemetry and judge status</p>
            </div>
            {isAdmin && (
              <Link to="/admin/judge-panels" className="btn-manage-panels">
                Manage Panels ➔
              </Link>
            )}
          </div>

          {livePanelDetails.length === 0 ? (
            <div className="live-sync-empty">
              <p style={{ margin: 0 }}>
                No judge panels created yet.{' '}
                {isAdmin && <Link to="/admin/judge-panels">Create your first panel</Link>}
              </p>
            </div>
          ) : (
            <div className="live-sync-grid">
              {livePanelDetails.map(panel => {
                const isFullyEvaluated = panel.assignedTeamsCount > 0 && panel.evaluationsCompletedCount >= panel.assignedTeamsCount;
                const pendingCount = Math.max(0, panel.assignedTeamsCount - panel.evaluationsCompletedCount);

                return (
                  <div
                    key={panel.id}
                    className={`live-panel-card ${isFullyEvaluated ? 'fully-evaluated' : ''}`}
                  >
                    <div>
                      <div className="flex-between" style={{ marginBottom: '4px' }}>
                        <h4>{panel.name}</h4>
                        <span className={`pill-badge ${isFullyEvaluated ? 'status-verified' : 'status-open'}`} style={{ fontSize: '0.72rem' }}>
                          {isFullyEvaluated ? '✓ All Evaluated' : `${panel.evaluationsCompletedCount}/${panel.assignedTeamsCount} Teams`}
                        </span>
                      </div>

                      <div className="panel-judges-text">
                        <strong>Judges: </strong>
                        {panel.judgeNames}
                      </div>
                    </div>

                    <div className="panel-stats-row">
                      <div className="panel-stats">
                        <div className="panel-stat">
                          <span className="panel-stat-label">Assigned</span>
                          <span className="panel-stat-value">{panel.assignedTeamsCount}</span>
                        </div>
                        <div className="panel-stat">
                          <span className="panel-stat-label">Completed</span>
                          <span className="panel-stat-value green">{panel.evaluationsCompletedCount}</span>
                        </div>
                        <div className="panel-stat">
                          <span className="panel-stat-label">Pending</span>
                          <span className={`panel-stat-value ${pendingCount > 0 ? 'orange' : 'muted'}`}>
                            {pendingCount}
                          </span>
                        </div>
                      </div>

                      <button
                        className="btn-view-panel"
                        onClick={() => setSelectedPanelDetailId(panel.id)}
                      >
                        View Details ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Stats Cards */}
      {isJudge ? (
        <div className="stats-row-2col">
          {/* Row 1: Assigned Teams | Evaluated Teams */}
          <StatCard
            number={judgeAssignedTeamsCount}
            label="Assigned Teams"
            hint="Teams registered under your panel's problem statements"
          />
          <StatCard
            number={judgeEvaluatedCount}
            label="Evaluated Teams"
            hint="Teams evaluated by you"
          />

          {/* Row 2: Pending Evaluations | Assigned PS */}
          <StatCard
            number={judgePendingCount}
            label="Pending Evaluations"
            accent={judgePendingCount > 0}
            hint="Teams awaiting your evaluation"
          />
          <StatCard
            number={judgePanelInfo?.problemStatements?.length || 0}
            label="Assigned Problem Statements"
            hint="Problem statements assigned to your panel"
          />
        </div>
      ) : (isAdmin || isSpoc) ? (
        null
      ) : (
        /* Student Stats Row — Recruiting and Locked Teams removed */
        <div className="stats-row">
          <StatCard
            number={stats.totalTeams}
            label="Total Teams"
            onClick={() => setDetailsModalTab('all_teams')}
            active={detailsModalTab === 'all_teams'}
            hint="Click to view all registered teams & members"
          />
          <StatCard
            number={stats.totalStudents}
            label="Registered Students"
            onClick={() => setDetailsModalTab('all_students')}
            active={detailsModalTab === 'all_students'}
            hint="Click to view all registered students"
          />
          <StatCard
            number={stats.unassignedStudents}
            label="Students Without Team"
            accent
            onClick={() => setDetailsModalTab('unassigned')}
            active={detailsModalTab === 'unassigned'}
            hint="Click to view students not in any team yet"
          />
          <StatCard
            number={stats.femaleRatio}
            label="Female Participation"
            onClick={() => setDetailsModalTab('gender')}
            active={detailsModalTab === 'gender'}
            hint="Click to check SIH female member compliance"
          />
        </div>
      )}

      {/* Pending Team Invitations for Student */}
      {!isAdmin && !isJudge && !isSpoc && (
        <TeamInvitationsCard onUpdate={fetchDashboardData} />
      )}

      {/* JUDGE: My Panel & Assigned Problem Statements Widget */}
      {isJudge && (
        <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ marginBottom: '14px', fontSize: '1.1rem', color: 'var(--navy)' }}>
            My Panel & Assigned Problem Statements
          </h3>

          {!judgePanelInfo ? (
            <div style={{
              padding: '16px 20px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-md)',
              color: '#92400E',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              You have not been assigned to a Judge Panel yet. Please contact an Admin to receive problem statement assignments.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Panel & Judges Info */}
              <div style={{ padding: '16px', background: 'var(--off-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Assigned Panel
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
                  {judgePanelInfo.panel?.name}
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Panel Judges ({judgePanelInfo.coJudges.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {judgePanelInfo.coJudges.map(j => (
                    <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: j.id === profile.id ? 'var(--orange)' : 'var(--navy)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        {j.full_name?.slice(0, 2).toUpperCase() || 'JD'}
                      </div>
                      <span style={{ fontWeight: j.id === profile.id ? 700 : 500 }}>
                        {j.full_name} {j.id === profile.id && '(You)'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                        · {j.department || 'Judge'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Problem Statements */}
              <div style={{ padding: '16px', background: 'var(--off-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Assigned Problem Statements ({judgePanelInfo.problemStatements.length})
                </div>
                {judgePanelInfo.problemStatements.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                    No problem statements assigned to this panel yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {judgePanelInfo.problemStatements.map(ps => (
                      <div key={ps.id} style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <strong style={{ color: 'var(--navy)' }}>{ps.ps_code}</strong>
                          <span className="pill-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{ps.category}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>· {ps.domain}</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>{ps.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN & SPOC: Live Team Formation & Recruitment Matching Widget */}
      {(isAdmin || isSpoc) && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Team Formation Overview</h3>
            <span className="section-count">{recruitingList.length + unassignedList.length}</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px'
          }}>
          {/* Teams Looking for People */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Teams Needing Members ({recruitingList.length})</span>
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Teams with open slots seeking teammates
                </p>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setDetailsModalTab('recruiting')}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                View All ({recruitingList.length}) ➔
              </button>
            </div>

            {recruitingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                All teams currently have full 6/6 rosters!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recruitingList.slice(0, 4).map(team => {
                  const mCount = teamMemberCountMap[team.id] || 0;
                  const slotsOpen = Math.max(0, 6 - mCount);
                  const leader = studentMap[team.leader_id];
                  const ps = psMap[team.ps_id];

                  return (
                    <div
                      key={team.id}
                      style={{
                        padding: '12px 14px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '0.92rem', color: 'var(--navy)' }}>{team.team_name}</strong>
                          <span className="pill-badge" style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', padding: '1px 6px' }}>
                            {slotsOpen} slot{slotsOpen > 1 ? 's' : ''} open
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Leader: {leader?.full_name || 'Unknown'} ({leader?.department || 'Student'})
                          {ps && ` · PS: ${ps.title?.slice(0, 24)}...`}
                        </div>
                        {team.skills_needed && team.skills_needed.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {team.skills_needed.slice(0, 3).map(sk => (
                              <span key={sk} className="pill-badge skill" style={{ fontSize: '0.65rem', padding: '0 6px' }}>{sk}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {leader?.phone && (
                          <a
                            href={`https://wa.me/${leader.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-ghost"
                            style={{ color: '#25D366', fontSize: '0.75rem', padding: '4px 8px' }}
                            title="Chat with team leader on WhatsApp"
                          >
                            WhatsApp
                          </a>
                        )}
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setDetailsModalTab('recruiting')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          Details ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Students Looking for Teams */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Students Without a Team ({unassignedList.length})</span>
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Registered candidates available to be matched
                </p>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setDetailsModalTab('unassigned')}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                View All ({unassignedList.length}) ➔
              </button>
            </div>

            {unassignedList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--green)', fontSize: '0.85rem' }}>
                Every registered student is currently in a team!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {unassignedList.slice(0, 4).map(student => (
                  <div
                    key={student.id}
                    style={{
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: student.gender === 'Female' ? 'var(--purple)' : 'var(--navy)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}>
                        {student.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{student.full_name}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {student.roll_no ? `${student.roll_no} · ` : ''}{student.department || 'Student'}
                        </div>
                        {student.skills && student.skills.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {student.skills.slice(0, 2).map(sk => (
                              <span key={sk} className="pill-badge skill" style={{ fontSize: '0.65rem', padding: '0 6px' }}>{sk}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setViewingProfile(student)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Profile
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="admin-section-header" style={{ marginTop: '8px' }}>
        <h3>Quick Actions</h3>
      </div>
      <div className="quick-actions">
        {/* STUDENT ACTIONS */}
        {!isAdmin && !isJudge && !isSpoc && (
          <>
            {!myTeam ? (
              <>
                <Link to="/create-team" className="quick-action-card">
                  <div className="action-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <div className="action-title">Create a Team</div>
                  <div className="action-desc">Start your team, invite members & register for a problem statement</div>
                </Link>
                <Link to="/marketplace" className="quick-action-card">
                  <div className="action-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="action-title">Join a Team</div>
                  <div className="action-desc">Browse recruiting teams and send join requests</div>
                </Link>
              </>
            ) : (
              <Link to="/my-team" className="quick-action-card">
                <div className="action-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="action-title">My Team: {myTeam.team_name}</div>
                <div className="action-desc">
                  {myTeam.is_locked ? 'Team is locked — awaiting SPOC review & evaluation' : 'Manage your team members and submit solution pitch'}
                </div>
              </Link>
            )}

            <Link to="/problem-statements" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="action-title">Problem Statements</div>
              <div className="action-desc">Explore official Smart Amrita Hackathon challenge statements</div>
            </Link>
          </>
        )}

        {/* JUDGE ACTIONS */}
        {isJudge && (
          <>
            <Link to="/judge/evaluate" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div className="action-title">Evaluate Teams</div>
              <div className="action-desc">Score assigned teams on the official 50-mark rubric</div>
            </Link>
            <Link to="/judge/history" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="action-title">My Evaluation History</div>
              <div className="action-desc">Review and inspect your submitted scores</div>
            </Link>
            <Link to="/problem-statements" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="action-title">Problem Statements</div>
              <div className="action-desc">View challenge details and evaluation guidelines</div>
            </Link>
          </>
        )}

        {/* ADMIN & SPOC ACTIONS */}
        {(isAdmin || isSpoc) && (
          <>
            <Link to="/admin/roster" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div className="action-title">Master Roster</div>
              <div className="action-desc">Team-wise & Problem-Statement-wise evaluation scores matrix</div>
            </Link>
            <Link to="/spoc/verify" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="action-title">Verification Queue</div>
              <div className="action-desc">Verify locked teams and review compliance</div>
            </Link>
            <Link to="/admin/analytics" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="action-title">Analytics Dashboard</div>
              <div className="action-desc">Live statistics and department participation</div>
            </Link>
            <Link to="/admin/bootcamp" className="quick-action-card">
              <div className="action-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="action-title">Top 50 Shortlist</div>
              <div className="action-desc">Z-Score rankings and bootcamp selection</div>
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin/judge-panels" className="quick-action-card">
                  <div className="action-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                      <line x1="18" y1="8" x2="23" y2="13" />
                      <line x1="23" y1="8" x2="18" y2="13" />
                    </svg>
                  </div>
                  <div className="action-title">Judge Panels</div>
                  <div className="action-desc">Create panels & assign problem statements</div>
                </Link>
                <Link to="/admin/problem-statements" className="quick-action-card">
                  <div className="action-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="action-title">Upload Problem Statements</div>
                  <div className="action-desc">Manage & import problem statements</div>
                </Link>
              </>
            )}
          </>
        )}

        {/* PROFILE ACTION FOR EVERYONE */}
        <Link to="/profile" className="quick-action-card">
          <div className="action-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="action-title">My Profile</div>
          <div className="action-desc">View and edit your account details & skills</div>
        </Link>
      </div>

      {/* Deadlines Timeline */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}> SAH 2026 Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { date: 'Aug 13, 2026', event: 'Portal Opens — Team Formation Begins', status: 'active' },
            { date: 'Aug 21, 2026', event: 'Internal Registration Deadline', status: 'upcoming' },
            { date: 'Aug 25–28, 2026', event: 'Top 50 Bootcamp', status: 'upcoming' },
            { date: 'Sept 10, 2026', event: 'SIH National Portal Submission Deadline', status: 'upcoming' },
            { date: 'Dec 2026', event: 'SIH Grand Finale', status: 'upcoming' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: item.status === 'active' ? '#E8F5E9' : 'var(--off-white)',
              border: item.status === 'active' ? '1px solid #A5D6A7' : '1px solid var(--border-light)'
            }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                background: item.status === 'active' ? 'var(--green)' : 'var(--border)'
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>{item.date}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.event}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin / SPOC Live Intelligence Drill-Down Modal */}
      {detailsModalTab && (
        <AdminDashboardDetailsModal
          initialTab={detailsModalTab}
          teams={allTeams}
          members={allMembers}
          profiles={allProfiles}
          problemStatements={allProblemStatements}
          onClose={() => setDetailsModalTab(null)}
        />
      )}

      {/* Judge Panel Live Detail View Modal */}
      {selectedPanelDetailId && (
        <JudgePanelDetailModal
          panelId={selectedPanelDetailId}
          panels={allPanels}
          panelJudges={allPanelJudges}
          panelPS={allPanelPS}
          teams={allTeams}
          evaluations={allEvaluations}
          problemStatements={allProblemStatements}
          profiles={allProfiles}
          onClose={() => setSelectedPanelDetailId(null)}
        />
      )}

      {/* Student / User Profile Modal */}
      {viewingProfile && (
        <UserProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}
