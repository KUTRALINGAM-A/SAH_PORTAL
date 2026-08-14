import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../context/NotificationContext';

export default function VerificationQueue() {
  const { sendNotification } = useNotifications();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch locked but not yet verified teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*, problem_statements(ps_code, title, category)')
      .eq('is_locked', true)
      .order('created_at');

    // Fetch members with profiles
    const { data: membersData } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, roll_no, gender, department)');

    const membersByTeam = {};
    (membersData || []).forEach(m => {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(m);
    });

    setTeams(teamsData || []);
    setMembers(membersByTeam);
    setLoading(false);
  }

  const getCompliance = (team) => {
    const teamMembers = members[team.id] || [];
    const femaleCount = teamMembers.filter(m => m.profiles?.gender === 'Female').length;

    return {
      hasSixMembers: teamMembers.length === 6,
      hasFemale: femaleCount >= 1,
      hasPS: !!team.ps_id,
      hasPPT: !!team.ppt_url,
      hasGithub: !!team.github_url,
      isLocked: team.is_locked,
      allPass: teamMembers.length === 6 && femaleCount >= 1 && !!team.ps_id && team.is_locked
    };
  };

  const handleVerify = async (team) => {
    const { error } = await supabase
      .from('teams')
      .update({ is_spoc_verified: true })
      .eq('id', team.id);

    if (error) {
      showToast('error', error.message);
      return;
    }

    // Notify all team members
    const teamMembers = members[team.id] || [];
    for (const m of teamMembers) {
      await sendNotification({
        userId: m.student_id,
        type: 'team_verified',
        title: 'Team Verified by SPOC! 🏆',
        message: `Your team "${team.team_name}" has been verified and authorized for SIH National Portal submission.`,
        metadata: { team_id: team.id }
      });
    }

    showToast('success', `Team "${team.team_name}" verified and authorized for SIH submission!`);
    fetchData();
  };

  const handleReject = async (team) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    const { error } = await supabase
      .from('teams')
      .update({ is_locked: false, is_open_for_recruitment: true })
      .eq('id', team.id);

    if (error) {
      showToast('error', error.message);
      return;
    }

    // Notify leader
    await sendNotification({
      userId: team.leader_id,
      type: 'request_declined',
      title: 'Team Verification Rejected',
      message: `Your team "${team.team_name}" was rejected by SPOC. Reason: ${reason}. Team has been unlocked for modification.`,
      metadata: { team_id: team.id }
    });

    showToast('info', `Team "${team.team_name}" rejected and unlocked.`);
    fetchData();
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  const pendingTeams = teams.filter(t => !t.is_spoc_verified);
  const verifiedTeams = teams.filter(t => t.is_spoc_verified);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">✅ SPOC Verification Queue</h1>
        <p className="page-subtitle">
          Verify locked teams for SIH National Portal submission (Deadline: Sept 10, 2026)
        </p>
      </div>

      {/* Summary */}
      <div className="stats-row" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-number">{pendingTeams.length}</div>
          <div className="stat-label">Pending Verification</div>
        </div>
        <div className="stat-card orange-accent">
          <div className="stat-number">{verifiedTeams.length}</div>
          <div className="stat-label">Verified ✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{teams.length}</div>
          <div className="stat-label">Total Locked Teams</div>
        </div>
      </div>

      {/* Pending Teams */}
      <h3 style={{ marginBottom: '12px' }}>⏳ Pending Verification ({pendingTeams.length})</h3>
      {pendingTeams.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px' }}>
          <h3>No teams pending verification</h3>
          <p>All locked teams have been verified, or no teams are locked yet.</p>
        </div>
      ) : (
        pendingTeams.map(team => {
          const compliance = getCompliance(team);
          const teamMembers = members[team.id] || [];

          return (
            <div key={team.id} className="card" style={{ marginBottom: '16px' }}>
              <div className="flex-between" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ marginBottom: '2px' }}>{team.team_name}</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {team.problem_statements?.ps_code} — {team.problem_statements?.title} ({team.problem_statements?.category})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleVerify(team)}
                    disabled={!compliance.allPass}
                  >
                    ✅ Authorize for SIH
                  </button>
                  <button className="btn btn-danger" onClick={() => handleReject(team)}>
                    ✗ Reject
                  </button>
                </div>
              </div>

              {/* Compliance Checklist */}
              <ul className="compliance-checklist" style={{ marginBottom: '14px' }}>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.hasSixMembers ? 'pass' : 'fail'}`}>
                    {compliance.hasSixMembers ? '✓' : '✗'}
                  </span>
                  6 Members ({teamMembers.length}/6)
                </li>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.hasFemale ? 'pass' : 'fail'}`}>
                    {compliance.hasFemale ? '✓' : '✗'}
                  </span>
                  At least 1 Female Member
                </li>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.hasPS ? 'pass' : 'fail'}`}>
                    {compliance.hasPS ? '✓' : '✗'}
                  </span>
                  Problem Statement Assigned
                </li>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.hasPPT ? 'pass' : 'fail'}`}>
                    {compliance.hasPPT ? '✓' : '✗'}
                  </span>
                  PPT/Presentation Uploaded
                </li>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.hasGithub ? 'pass' : 'fail'}`}>
                    {compliance.hasGithub ? '✓' : '✗'}
                  </span>
                  GitHub Repository Linked
                </li>
                <li className="compliance-item">
                  <span className={`check-icon ${compliance.isLocked ? 'pass' : 'fail'}`}>
                    {compliance.isLocked ? '✓' : '✗'}
                  </span>
                  Team Locked
                </li>
              </ul>

              {/* Member Table */}
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead><tr><th>Name</th><th>Roll No</th><th>Gender</th><th>Dept</th><th>Role</th></tr></thead>
                <tbody>
                  {teamMembers.map(m => (
                    <tr key={m.id}>
                      <td>{m.profiles?.full_name}</td>
                      <td>{m.profiles?.roll_no || '—'}</td>
                      <td>{m.profiles?.gender}</td>
                      <td>{m.profiles?.department}</td>
                      <td><span className={`pill-badge ${m.member_role === 'Leader' ? 'role-leader' : 'role-member'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{m.member_role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Solution Links */}
              {(team.ppt_url || team.github_url || team.video_url) && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {team.ppt_url && <a href={team.ppt_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">📊 PPT</a>}
                  {team.github_url && <a href={team.github_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">💻 GitHub</a>}
                  {team.video_url && <a href={team.video_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🎥 Video</a>}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Verified Teams */}
      {verifiedTeams.length > 0 && (
        <>
          <h3 style={{ marginTop: '30px', marginBottom: '12px' }}>✅ Verified Teams ({verifiedTeams.length})</h3>
          {verifiedTeams.map(team => (
            <div key={team.id} className="card" style={{ marginBottom: '10px', padding: '14px 18px', opacity: 0.8 }}>
              <div className="flex-between">
                <div>
                  <strong>{team.team_name}</strong>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {team.problem_statements?.ps_code}
                  </span>
                </div>
                <span className="pill-badge status-verified">✅ Authorized for SIH</span>
              </div>
            </div>
          ))}
        </>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
