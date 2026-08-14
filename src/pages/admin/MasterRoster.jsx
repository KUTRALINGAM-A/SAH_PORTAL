import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function MasterRoster() {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState({});
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*, problem_statements(ps_code, title)')
      .order('team_name');

    const { data: membersData } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, roll_no, gender, department, skills)');

    // Group members by team
    const membersByTeam = {};
    (membersData || []).forEach(m => {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(m);
    });

    setTeams(teamsData || []);
    setMembers(membersByTeam);
    setLoading(false);
  }

  const handleExportCSV = () => {
    let csv = 'Team Name,PS Code,Status,Member Name,Roll No,Gender,Department,Role\n';

    teams.forEach(team => {
      const teamMembers = members[team.id] || [];
      if (teamMembers.length === 0) {
        csv += `"${team.team_name}","${team.problem_statements?.ps_code || ''}","${team.is_locked ? 'Locked' : 'Open'}","","","","",""\n`;
      } else {
        teamMembers.forEach(m => {
          csv += `"${team.team_name}","${team.problem_statements?.ps_code || ''}","${team.is_locked ? 'Locked' : 'Open'}","${m.profiles?.full_name || ''}","${m.profiles?.roll_no || ''}","${m.profiles?.gender || ''}","${m.profiles?.department || ''}","${m.member_role}"\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SAH2026_Master_Roster.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = teams.filter(t => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (t.team_name.toLowerCase().includes(term)) return true;
    if (t.problem_statements?.ps_code?.toLowerCase().includes(term)) return true;
    const teamMembers = members[t.id] || [];
    return teamMembers.some(m => m.profiles?.full_name?.toLowerCase().includes(term) || m.profiles?.roll_no?.toLowerCase().includes(term));
  });

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">📑 Master Team Roster</h1>
          <p className="page-subtitle">{teams.length} teams registered</p>
        </div>
        <button className="btn btn-navy" onClick={handleExportCSV}>📥 Export CSV</button>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by team name, PS code, or member name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.map(team => {
        const teamMembers = members[team.id] || [];
        const femaleCount = teamMembers.filter(m => m.profiles?.gender === 'Female').length;

        return (
          <div key={team.id} className="card" style={{ marginBottom: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ marginBottom: '2px' }}>{team.team_name}</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {team.problem_statements ? `${team.problem_statements.ps_code} — ${team.problem_statements.title}` : 'No PS assigned'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className={`pill-badge ${team.is_locked ? 'status-locked' : 'status-open'}`}>
                  {team.is_locked ? '🔒 Locked' : '🟢 Open'}
                </span>
                {team.is_spoc_verified && <span className="pill-badge status-verified">✅ Verified</span>}
                <span className="pill-badge role-member">{teamMembers.length}/6 Members</span>
                <span className={`pill-badge ${femaleCount >= 1 ? 'status-verified' : 'needs-female'}`}>
                  {femaleCount}♀
                </span>
              </div>
            </div>

            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Gender</th>
                  <th>Department</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(m => (
                  <tr key={m.id}>
                    <td>{m.profiles?.full_name}</td>
                    <td>{m.profiles?.roll_no || '—'}</td>
                    <td>{m.profiles?.gender}</td>
                    <td>{m.profiles?.department}</td>
                    <td>
                      <span className={`pill-badge ${m.member_role === 'Leader' ? 'role-leader' : 'role-member'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        {m.member_role}
                      </span>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No members yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
