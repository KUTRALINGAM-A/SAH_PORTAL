import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import TeamInvitationsCard from '../components/TeamInvitationsCard';
import AdminDashboardDetailsModal from '../components/AdminDashboardDetailsModal';
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
  const [loading, setLoading] = useState(true);

  // Full datasets for drilldown
  const [allTeams, setAllTeams] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allProblemStatements, setAllProblemStatements] = useState([]);

  // Active details modal tab ('recruiting', 'unassigned', 'all_teams', 'locked', 'all_students', 'gender', or null)
  const [detailsModalTab, setDetailsModalTab] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  async function fetchDashboardData() {
    // Fetch all relevant data concurrently
    const [teamsRes, profilesRes, membersRes, psRes] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name', { ascending: true }),
      supabase.from('team_members').select('*'),
      supabase.from('problem_statements').select('*')
    ]);

    const teams = teamsRes.data || [];
    const profiles = profilesRes.data || [];
    const members = membersRes.data || [];
    const psList = psRes.data || [];

    setAllTeams(teams);
    setAllProfiles(profiles);
    setAllMembers(members);
    setAllProblemStatements(psList);

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
    if (profile) {
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

    setLoading(false);
  }

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

      {/* Stats Cards */}
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

      {/* Pending Team Invitations for Student */}
      {!isAdmin && !isJudge && !isSpoc && (
        <TeamInvitationsCard onUpdate={fetchDashboardData} />
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
              <Link to="/admin/problem-statements"className="quick-action-card">
                <div className="action-icon"></div>
                <div className="action-title">Upload Problem Statements</div>
                <div className="action-desc">Manage & import problem statements</div>
              </Link>
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
