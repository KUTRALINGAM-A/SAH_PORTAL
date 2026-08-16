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

      // 4. Evaluations completed count (how many assigned teams have completed evaluation)
      const panelEvaluations = allEvaluations.filter(e => assignedTeamIdSet.has(e.team_id));
      const evaluatedTeamIds = new Set(panelEvaluations.map(e => e.team_id));
      const evaluationsCompletedCount = evaluatedTeamIds.size;

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
  const judgeEvaluatedCount = useMemo(() => {
    if (!profile) return 0;
    return allEvaluations.filter(e => e.judge_id === profile.id).length;
  }, [allEvaluations, profile]);

  const judgePendingCount = useMemo(() => {
    return Math.max(0, stats.lockedTeams - judgeEvaluatedCount);
  }, [stats.lockedTeams, judgeEvaluatedCount]);

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
  const unassignedList = allProfiles.filter(p => !assignedStudentIdSet.has(p.id));

  const teamMemberCountMap = {};
  allMembers.forEach(m => {
    teamMemberCountMap[m.team_id] = (teamMemberCountMap[m.team_id] || 0) + 1;
  });
  const recruitingList = allTeams.filter(t => (t.is_open_for_recruitment || (teamMemberCountMap[t.id] || 0) < 6) && !t.is_locked);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          Welcome back, {profile?.full_name?.split(' ')[0]}! 
        </h1>
        <p className="page-subtitle">
          {isAdmin ? 'Organizing Committee Dashboard' :
           isJudge ? 'Judge Evaluation Dashboard' :
           isSpoc ? 'SPOC Verification Dashboard' :
           myTeam ? `Team: ${myTeam.team_name} (${myTeam.role})` :
           'Find or create a team to get started'}
        </p>
      </div>

      {/* ADMIN & SPOC: Live Judge Panel Details Section (Above Stats Cards) */}
      {(isAdmin || isSpoc) && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Live Judge Panel Details</span>
                <span className="pill-badge" style={{ background: '#E8F5E9', color: 'var(--green)', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Live Updates
                </span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Real-time panel tracking: judges, assigned teams, and completed evaluations
              </p>
            </div>

            {isAdmin && (
              <Link to="/admin/judge-panels" className="btn btn-outline btn-sm" style={{ fontSize: '0.78rem' }}>
                Manage Panels ➔
              </Link>
            )}
          </div>

          {livePanelDetails.length === 0 ? (
            <div style={{
              padding: '24px',
              background: 'var(--off-white)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem'
            }}>
              No judge panels created yet.{' '}
              {isAdmin && (
                <Link to="/admin/judge-panels" style={{ color: 'var(--orange)', fontWeight: 600 }}>
                  Create your first panel
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {livePanelDetails.map(panel => {
                return (
                  <div
                    key={panel.id}
                    onClick={() => setSelectedPanelDetailId(panel.id)}
                    style={{
                      padding: '16px 18px',
                      background: 'var(--off-white)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      e.currentTarget.style.borderColor = 'var(--navy-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }}
                  >
                    <div>
                      {/* Panel Name */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--navy)' }}>
                          {panel.name}
                        </strong>
                        <span
                          className="pill-badge"
                          style={{
                            fontSize: '0.72rem',
                            background: panel.evaluationsCompletedCount === panel.assignedTeamsCount && panel.assignedTeamsCount > 0 ? '#E8F5E9' : '#FFFBEB',
                            color: panel.evaluationsCompletedCount === panel.assignedTeamsCount && panel.assignedTeamsCount > 0 ? 'var(--green)' : '#B45309'
                          }}
                        >
                          {panel.evaluationsCompletedCount} / {panel.assignedTeamsCount} Teams Evaluated
                        </span>
                      </div>

                      {/* Judges */}
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Judges: </span>
                        {panel.judgeNames}
                      </div>
                    </div>

                    <div>
                      {/* Stats */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-light)',
                        fontSize: '0.82rem',
                        marginBottom: '10px'
                      }}>
                        <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            Assigned Teams
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-heading)' }}>
                            {panel.assignedTeamsCount}
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            Evaluations Done
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--orange)', fontFamily: 'var(--font-heading)' }}>
                            {panel.evaluationsCompletedCount}
                          </div>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: '100%', fontSize: '0.78rem', justifyContent: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPanelDetailId(panel.id);
                        }}
                      >
                        View Details →
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
          {/* Row 1: Total Teams | Recruiting */}
          <StatCard
            number={stats.totalTeams}
            label="Total Teams"
            onClick={() => setDetailsModalTab('all_teams')}
            active={detailsModalTab === 'all_teams'}
            hint="Click to view all registered teams & members"
          />
          <StatCard
            number={stats.openTeams}
            label="Recruiting"
            accent
            onClick={() => setDetailsModalTab('recruiting')}
            active={detailsModalTab === 'recruiting'}
            hint="Click to see teams looking for members"
          />

          {/* Row 2: Locked Teams | Evaluated Teams */}
          <StatCard
            number={stats.lockedTeams}
            label="Locked Teams"
            onClick={() => setDetailsModalTab('locked')}
            active={detailsModalTab === 'locked'}
            hint="Click to see finalized teams ready for verification"
          />
          <StatCard
            number={judgeEvaluatedCount}
            label="Evaluated Teams"
            hint="Teams evaluated by you"
          />

          {/* Row 3: Pending Evaluations | Registered Students */}
          <StatCard
            number={judgePendingCount}
            label="Pending Evaluations"
            accent={judgePendingCount > 0}
            hint="Locked teams awaiting your evaluation"
          />
          <StatCard
            number={stats.totalStudents}
            label="Registered Students"
            onClick={() => setDetailsModalTab('all_students')}
            active={detailsModalTab === 'all_students'}
            hint="Click to view all registered students"
          />
        </div>
      ) : (
        <div className="stats-row">
          <StatCard
            number={stats.totalTeams}
            label="Total Teams"
            onClick={() => setDetailsModalTab('all_teams')}
            active={detailsModalTab === 'all_teams'}
            hint="Click to view all registered teams & members"
          />
          <StatCard
            number={stats.openTeams}
            label="Recruiting (Needs People)"
            accent
            onClick={() => setDetailsModalTab('recruiting')}
            active={detailsModalTab === 'recruiting'}
            hint="Click to see teams looking for members"
          />
          <StatCard
            number={stats.lockedTeams}
            label="Locked Teams"
            onClick={() => setDetailsModalTab('locked')}
            active={detailsModalTab === 'locked'}
            hint="Click to see finalized teams ready for verification"
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
              You have not been assigned to a Judge Panel yet. Please contact an Admin.
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}>
          {/* Teams Looking for People */}
          <div className="card"style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span></span> Teams Needing Members ({recruitingList.length})
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
                          <span className="pill-badge"style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', padding: '1px 6px' }}>
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
                              <span key={sk} className="pill-badge skill"style={{ fontSize: '0.65rem', padding: '0 6px' }}>{sk}</span>
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
          <div className="card"style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span></span> Students Without a Team ({unassignedList.length})
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
                          {student.gender === 'Female' && <span title="Female Candidate"></span>}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {student.roll_no ? `${student.roll_no} · ` : ''}{student.department || 'Student'}
                        </div>
                        {student.skills && student.skills.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {student.skills.slice(0, 2).map(sk => (
                              <span key={sk} className="pill-badge skill"style={{ fontSize: '0.65rem', padding: '0 6px' }}>{sk}</span>
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
      )}

      {/* Quick Actions */}
      <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
      <div className="quick-actions">
        {!isAdmin && !isJudge && !isSpoc && !myTeam && (
          <>
            <Link to="/create-team"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Create a Team</div>
              <div className="action-desc">Start your own team and become the leader</div>
            </Link>
            <Link to="/marketplace"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Join a Team</div>
              <div className="action-desc">Browse open teams and send join requests</div>
            </Link>
          </>
        )}

        {!isAdmin && !isJudge && !isSpoc && myTeam && (
          <Link to="/my-team"className="quick-action-card">
            <div className="action-icon">{myTeam.is_locked ? '' : ''}</div>
            <div className="action-title">{myTeam.team_name}</div>
            <div className="action-desc">
              {myTeam.is_locked ? 'Team is locked — awaiting SPOC verification' : 'Manage your team and submit pitch'}
            </div>
          </Link>
        )}

        <Link to="/problem-statements"className="quick-action-card">
          <div className="action-icon"></div>
          <div className="action-title">Problem Statements</div>
          <div className="action-desc">Browse all available problem statements</div>
        </Link>

        {(isAdmin || isSpoc) && (
          <>
            <Link to="/admin/roster"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Master Roster</div>
              <div className="action-desc">View and export all teams, students & members data</div>
            </Link>
            <Link to="/spoc/verify"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Verification Queue</div>
              <div className="action-desc">Verify locked teams and review compliance</div>
            </Link>
            <Link to="/admin/analytics"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Analytics Dashboard</div>
              <div className="action-desc">Live statistics and department participation</div>
            </Link>
            <Link to="/admin/bootcamp"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Top 50 Shortlist</div>
              <div className="action-desc">Z-Score rankings and bootcamp selection</div>
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin/judge-panels" className="quick-action-card">
                  <div className="action-icon">⚖️</div>
                  <div className="action-title">Judge Panels</div>
                  <div className="action-desc">Create panels & assign problem statements</div>
                </Link>
                <Link to="/admin/problem-statements" className="quick-action-card">
                  <div className="action-icon"></div>
                  <div className="action-title">Upload Problem Statements</div>
                  <div className="action-desc">Manage & import problem statements</div>
                </Link>
              </>
            )}
          </>
        )}

        {isJudge && (
          <>
            <Link to="/judge/evaluate"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">Evaluate Teams</div>
              <div className="action-desc">Score teams on the 100-point SIH rubric</div>
            </Link>
            <Link to="/judge/history"className="quick-action-card">
              <div className="action-icon"></div>
              <div className="action-title">My Evaluations</div>
              <div className="action-desc">View and edit your submitted scores</div>
            </Link>
          </>
        )}

        <Link to="/profile"className="quick-action-card">
          <div className="action-icon"></div>
          <div className="action-title">My Profile</div>
          <div className="action-desc">View and edit your account details & skills</div>
        </Link>
      </div>

      {/* Deadlines Timeline */}
      <div className="card"style={{ marginTop: '24px' }}>
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
