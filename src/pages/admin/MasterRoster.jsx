import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { parseEvaluationScores } from '../../lib/evaluationHelper';

export default function MasterRoster() {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState({});
  const [problemStatements, setProblemStatements] = useState([]);
  const [panels, setPanels] = useState([]);
  const [panelJudges, setPanelJudges] = useState([]);
  const [panelPS, setPanelPS] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state & Filters: 'matrix' (Team-wise PS columns) | 'ps_wise' (Grouped by PS) | 'roster' (Member details)
  const [activeView, setActiveView] = useState('matrix');
  const [search, setSearch] = useState('');
  const [selectedPsFilter, setSelectedPsFilter] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [
        teamsRes,
        membersRes,
        psRes,
        panelsRes,
        pjRes,
        ppsRes,
        evalsRes
      ] = await Promise.all([
        supabase.from('teams').select('*, problem_statements(id, ps_code, title, category, domain)').order('team_name'),
        supabase.from('team_members').select('*, profiles(id, full_name, roll_no, gender, department, skills)'),
        supabase.from('problem_statements').select('*').order('ps_code'),
        supabase.from('judge_panels').select('*').order('name'),
        supabase.from('panel_judges').select('*, profiles(id, full_name, email, department)'),
        supabase.from('panel_problem_statements').select('*'),
        supabase.from('evaluations').select('*, profiles:judge_id(id, full_name, email)')
      ]);

      // Group members by team
      const membersByTeam = {};
      (membersRes.data || []).forEach(m => {
        if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
        membersByTeam[m.team_id].push(m);
      });

      setTeams(teamsRes.data || []);
      setMembers(membersByTeam);
      setProblemStatements(psRes.data || []);
      setPanels(panelsRes.data || []);
      setPanelJudges(pjRes.data || []);
      setPanelPS(ppsRes.data || []);
      setEvaluations(evalsRes.data || []);
    } catch (err) {
      console.error('MasterRoster fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Fast mapping structures
  const psPanelMap = useMemo(() => {
    // Map ps_id -> panel
    const map = {};
    panelPS.forEach(pps => {
      const panel = panels.find(p => p.id === pps.panel_id);
      if (panel) map[pps.ps_id] = panel;
    });
    return map;
  }, [panelPS, panels]);

  const panelJudgesMap = useMemo(() => {
    // Map panel_id -> list of judge profiles
    const map = {};
    panelJudges.forEach(pj => {
      if (!map[pj.panel_id]) map[pj.panel_id] = [];
      if (pj.profiles) map[pj.panel_id].push(pj.profiles);
    });
    return map;
  }, [panelJudges]);

  const teamEvaluationsMap = useMemo(() => {
    // Map team_id -> map of judge_id -> latest evaluation
    const map = {};
    (evaluations || []).forEach(ev => {
      if (!map[ev.team_id]) map[ev.team_id] = {};
      const existing = map[ev.team_id][ev.judge_id];
      if (
        !existing ||
        (ev.created_at && (!existing.created_at || new Date(ev.created_at) > new Date(existing.created_at)))
      ) {
        map[ev.team_id][ev.judge_id] = ev;
      }
    });

    // Convert to team_id -> Array of distinct latest evaluations
    const result = {};
    for (const [teamId, judgesMap] of Object.entries(map)) {
      result[teamId] = Object.values(judgesMap);
    }
    return result;
  }, [evaluations]);

  // Helper to compute team score details
  const getTeamScoreDetails = (team) => {
    const rawTeamEvals = teamEvaluationsMap[team.id] || [];
    const panel = team.ps_id ? psPanelMap[team.ps_id] : null;
    const judgesInPanel = panel ? (panelJudgesMap[panel.id] || []) : [];
    const panelJudgeIdSet = new Set(judgesInPanel.map(j => j.id));

    // Filter to only evaluations from judges assigned to this panel (if panel has judges assigned)
    const teamEvals = judgesInPanel.length > 0
      ? rawTeamEvals.filter(e => panelJudgeIdSet.has(e.judge_id))
      : rawTeamEvals;

    const judgeScores = teamEvals.map(ev => {
      const parsed = parseEvaluationScores(ev);
      return {
        judgeId: ev.judge_id,
        judgeName: ev.profiles?.full_name || 'Judge',
        score: parsed.total,
        remarks: parsed.remarks,
        rubricBreakdown: parsed.rubric
      };
    });

    const averageScore = judgeScores.length > 0
      ? (judgeScores.reduce((acc, curr) => acc + curr.score, 0) / judgeScores.length).toFixed(1)
      : null;

    const expectedCount = judgesInPanel.length || 3;
    const completedCount = Math.min(judgeScores.length, expectedCount);

    return {
      panel,
      judgesInPanel,
      judgeScores,
      averageScore,
      completedCount,
      expectedCount
    };
  };

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (selectedPsFilter && t.ps_id !== selectedPsFilter) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchName = t.team_name.toLowerCase().includes(term);
        const matchPS = t.problem_statements?.ps_code?.toLowerCase().includes(term) ||
          t.problem_statements?.title?.toLowerCase().includes(term);
        const teamMembers = members[t.id] || [];
        const matchMember = teamMembers.some(m =>
          m.profiles?.full_name?.toLowerCase().includes(term) ||
          m.profiles?.roll_no?.toLowerCase().includes(term)
        );
        const teamEvals = teamEvaluationsMap[t.id] || [];
        const matchJudge = teamEvals.some(e => e.profiles?.full_name?.toLowerCase().includes(term));

        if (!matchName && !matchPS && !matchMember && !matchJudge) return false;
      }

      return true;
    });
  }, [teams, selectedPsFilter, search, members, teamEvaluationsMap]);

  // Export CSV
  const handleExportCSV = () => {
    // Dynamic PS headers
    const psHeaders = problemStatements.map(ps => `"${ps.ps_code} Score"`).join(',');
    let csv = `Team Name,Assigned PS Code,Assigned PS Title,${psHeaders},Overall Panel Score (out of 50),Evaluations Done,Status,Member Name,Roll No,Gender,Department,Role\n`;

    filteredTeams.forEach(team => {
      const teamMembers = members[team.id] || [];
      const scoreDetails = getTeamScoreDetails(team);

      // Score for each PS column
      const psScoreCells = problemStatements.map(ps => {
        if (team.ps_id === ps.id) {
          return scoreDetails.averageScore ? `"${scoreDetails.averageScore}/50"` : '"Pending"';
        }
        return '"—"';
      }).join(',');

      const status = scoreDetails.completedCount >= scoreDetails.expectedCount
        ? 'Evaluated'
        : (scoreDetails.completedCount > 0 ? `In Progress (${scoreDetails.completedCount}/${scoreDetails.expectedCount})` : 'Pending');

      if (teamMembers.length === 0) {
        csv += `"${team.team_name}","${team.problem_statements?.ps_code || ''}","${team.problem_statements?.title || ''}",${psScoreCells},"${scoreDetails.averageScore ? `${scoreDetails.averageScore}/50` : '—'}","${scoreDetails.completedCount}/${scoreDetails.expectedCount}","${status}","","","","",""\n`;
      } else {
        teamMembers.forEach(m => {
          csv += `"${team.team_name}","${team.problem_statements?.ps_code || ''}","${team.problem_statements?.title || ''}",${psScoreCells},"${scoreDetails.averageScore ? `${scoreDetails.averageScore}/50` : '—'}","${scoreDetails.completedCount}/${scoreDetails.expectedCount}","${status}","${m.profiles?.full_name || ''}","${m.profiles?.roll_no || ''}","${m.profiles?.gender || ''}","${m.profiles?.department || ''}","${m.member_role}"\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAH2026_Master_Evaluation_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Master Evaluation & Team Roster</h1>
          <p className="page-subtitle">
            Telemetry: Team memberships, Problem Statement matrix, individual Judge scores & Panel scores (50 Marks)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-navy" onClick={handleExportCSV}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Complete CSV
          </button>
        </div>
      </div>

      {/* View Selector & Search Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* View Mode Segmented Controls */}
          <div style={{ display: 'flex', background: 'var(--off-white)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '4px' }}>
            <button
              className="btn btn-sm"
              style={{
                background: activeView === 'matrix' ? 'var(--navy)' : 'transparent',
                color: activeView === 'matrix' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: activeView === 'matrix' ? 700 : 500,
                border: 'none',
                boxShadow: activeView === 'matrix' ? 'var(--shadow-sm)' : 'none',
                padding: '6px 14px'
              }}
              onClick={() => setActiveView('matrix')}
            >
              📊 1. Team-Wise PS Matrix
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: activeView === 'ps_wise' ? 'var(--navy)' : 'transparent',
                color: activeView === 'ps_wise' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: activeView === 'ps_wise' ? 700 : 500,
                border: 'none',
                boxShadow: activeView === 'ps_wise' ? 'var(--shadow-sm)' : 'none',
                padding: '6px 14px'
              }}
              onClick={() => setActiveView('ps_wise')}
            >
              📑 2. Problem-Statement-Wise
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: activeView === 'roster' ? 'var(--navy)' : 'transparent',
                color: activeView === 'roster' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: activeView === 'roster' ? 700 : 500,
                border: 'none',
                boxShadow: activeView === 'roster' ? 'var(--shadow-sm)' : 'none',
                padding: '6px 14px'
              }}
              onClick={() => setActiveView('roster')}
            >
              👥 3. Member Roster
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>Total Teams: <strong style={{ color: 'var(--navy)' }}>{teams.length}</strong></span>
            <span>Problem Statements: <strong style={{ color: 'var(--navy)' }}>{problemStatements.length}</strong></span>
            <span>Evaluations Recorded: <strong style={{ color: 'var(--green)' }}>{evaluations.length}</strong></span>
          </div>
        </div>

        {/* Search and PS Filter Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '14px' }}>
          <input
            className="search-input"
            style={{ margin: 0 }}
            placeholder="Search by team, PS code, student name, or judge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="filter-select"
            value={selectedPsFilter}
            onChange={(e) => setSelectedPsFilter(e.target.value)}
          >
            <option value="">All Problem Statements ({problemStatements.length})</option>
            {problemStatements.map(ps => (
              <option key={ps.id} value={ps.id}>
                {ps.ps_code} — {ps.title.slice(0, 45)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. TEAM-WISE PANEL SCORE VIEW (DYNAMIC PS COLUMNS MATRIX)    */}
      {/* ============================================================ */}
      {activeView === 'matrix' && (
        <div>
          {filteredTeams.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h3>No teams match your search filters</h3>
              <p>Try resetting the search keywords or selecting All Problem Statements.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '20px' }}>
              <div style={{ padding: '14px 18px', background: 'var(--off-white)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--navy)' }}>
                  Team-Wise Problem Statement Score Matrix ({filteredTeams.length} Teams · {problemStatements.length} PS Columns)
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Scroll horizontally to view all Problem Statement columns ➔
                </span>
              </div>

              <table className="data-table" style={{ fontSize: '0.84rem' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px', position: 'sticky', left: 0, background: 'var(--navy)', zIndex: 2 }}>
                      Team Name
                    </th>
                    {problemStatements.map(ps => (
                      <th key={ps.id} style={{ textAlign: 'center', minWidth: '110px' }} title={`${ps.ps_code}: ${ps.title}`}>
                        {ps.ps_code}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', minWidth: '130px' }}>
                      Overall Panel Score
                    </th>
                    <th style={{ textAlign: 'center', minWidth: '110px' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map(team => {
                    const scoreDetails = getTeamScoreDetails(team);
                    const isEvaluated = scoreDetails.completedCount >= scoreDetails.expectedCount;

                    return (
                      <tr key={team.id}>
                        <td style={{ position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}>
                          <strong style={{ color: 'var(--navy)' }}>{team.team_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {members[team.id]?.length || 0}/6 Members {team.is_locked ? '· 🔒 Locked' : ''}
                          </div>
                        </td>

                        {problemStatements.map(ps => {
                          const isAssigned = team.ps_id === ps.id;
                          if (!isAssigned) {
                            return (
                              <td key={ps.id} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                —
                              </td>
                            );
                          }

                          return (
                            <td key={ps.id} style={{ textAlign: 'center' }}>
                              {scoreDetails.averageScore ? (
                                <span className="pill-badge status-verified" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                                  {scoreDetails.averageScore} / 50
                                </span>
                              ) : (
                                <span className="pill-badge status-open" style={{ fontSize: '0.72rem' }}>
                                  Pending
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ fontSize: '0.95rem', color: scoreDetails.averageScore ? 'var(--green)' : 'var(--text-secondary)' }}>
                            {scoreDetails.averageScore ? `${scoreDetails.averageScore} / 50` : '— / 50'}
                          </strong>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {scoreDetails.completedCount > 0 ? (
                            <span className={`pill-badge ${isEvaluated ? 'status-verified' : 'status-open'}`} style={{ fontSize: '0.72rem' }}>
                              {isEvaluated ? '✓ Evaluated' : `In Progress (${scoreDetails.completedCount}/${scoreDetails.expectedCount})`}
                            </span>
                          ) : (
                            <span className="pill-badge status-open" style={{ fontSize: '0.72rem' }}>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PROBLEM-STATEMENT-WISE PANEL SCORE VIEW                   */}
      {/* ============================================================ */}
      {activeView === 'ps_wise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {problemStatements
            .filter(ps => !selectedPsFilter || ps.id === selectedPsFilter)
            .map(ps => {
              const psTeams = teams.filter(t => t.ps_id === ps.id);
              const panel = psPanelMap[ps.id];
              const judgesInPanel = panel ? (panelJudgesMap[panel.id] || []) : [];

              return (
                <div key={ps.id} className="card" style={{ padding: '22px' }}>
                  {/* PS Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="pill-badge" style={{ background: 'var(--navy)', color: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem' }}>
                          {ps.ps_code}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--navy)' }}>{ps.title}</h3>
                        <span className="pill-badge" style={{ fontSize: '0.7rem' }}>{ps.category}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>· {ps.domain}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Organization: </strong>{ps.organization} | <strong>Assigned Panel: </strong>
                        {panel ? (
                          <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
                            {panel.name} ({judgesInPanel.map(j => j.full_name).join(', ') || 'No judges'})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--orange)' }}>No Panel Assigned</span>
                        )}
                      </div>
                    </div>

                    <span className="pill-badge" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                      {psTeams.length} Participating Team{psTeams.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Participating Teams Table for this Problem Statement */}
                  {psTeams.length === 0 ? (
                    <div style={{ padding: '16px', background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No teams participating in this Problem Statement yet.
                    </div>
                  ) : (
                    <table className="data-table" style={{ fontSize: '0.84rem' }}>
                      <thead>
                        <tr>
                          <th>Team Name</th>
                          <th>Leader / Members</th>
                          <th>Individual Judge Scores</th>
                          <th style={{ textAlign: 'right' }}>Panel Score</th>
                          <th style={{ textAlign: 'center' }}>Evaluation Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {psTeams.map(team => {
                          const teamMembers = members[team.id] || [];
                          const leader = teamMembers.find(m => m.member_role === 'Leader')?.profiles;
                          const scoreDetails = getTeamScoreDetails(team);
                          const isEvaluated = scoreDetails.completedCount >= scoreDetails.expectedCount;

                          return (
                            <tr key={team.id}>
                              <td>
                                <strong style={{ color: 'var(--navy)' }}>{team.team_name}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {team.is_locked ? '🔒 Locked' : '🔓 Open'} {team.is_spoc_verified && '· ✓ SPOC Verified'}
                                </div>
                              </td>

                              <td>
                                <div>{leader ? leader.full_name : 'No Leader'} ({leader?.department || 'Student'})</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {teamMembers.length}/6 Members
                                </div>
                              </td>

                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {scoreDetails.judgeScores.length === 0 ? (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                      Pending evaluation
                                    </span>
                                  ) : (
                                    scoreDetails.judgeScores.map((js, jIdx) => (
                                      <span
                                        key={jIdx}
                                        className="pill-badge status-verified"
                                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                        title={js.remarks ? `Remarks: ${js.remarks}` : undefined}
                                      >
                                        {js.judgeName}: <strong>{js.score}/50</strong>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>

                              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: scoreDetails.averageScore ? 'var(--green)' : 'var(--text-secondary)' }}>
                                {scoreDetails.averageScore ? `${scoreDetails.averageScore} / 50` : '— / 50'}
                              </td>

                              <td style={{ textAlign: 'center' }}>
                                {scoreDetails.completedCount > 0 ? (
                                  <span className={`pill-badge ${isEvaluated ? 'status-verified' : 'status-open'}`} style={{ fontSize: '0.72rem' }}>
                                    {isEvaluated ? '✓ Evaluated' : `In Progress (${scoreDetails.completedCount}/${scoreDetails.expectedCount})`}
                                  </span>
                                ) : (
                                  <span className="pill-badge status-open" style={{ fontSize: '0.72rem' }}>
                                    ⏳ Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. FULL TEAM MEMBER ROSTER VIEW                              */}
      {/* ============================================================ */}
      {activeView === 'roster' && (
        <div>
          {filteredTeams.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h3>No teams match your search filters</h3>
              <p>Try resetting the search keywords or selecting All Problem Statements.</p>
            </div>
          ) : (
            filteredTeams.map(team => {
              const teamMembers = members[team.id] || [];
              const femaleCount = teamMembers.filter(m => m.profiles?.gender === 'Female').length;
              const scoreDetails = getTeamScoreDetails(team);
              const isExpanded = expandedTeamId === team.id;

              return (
                <div key={team.id} className="card" style={{ marginBottom: '16px', padding: '18px 20px' }}>
                  {/* Top Row: Team Summary & Scores */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--navy)' }}>{team.team_name}</h3>
                        <span className={`pill-badge ${team.is_locked ? 'status-locked' : 'status-open'}`} style={{ fontSize: '0.72rem' }}>
                          {team.is_locked ? 'Locked' : 'Open'}
                        </span>
                        {team.is_spoc_verified && (
                          <span className="pill-badge status-verified" style={{ fontSize: '0.72rem' }}>✓ SPOC Verified</span>
                        )}
                        <span className={`pill-badge ${femaleCount >= 1 ? 'status-verified' : 'needs-female'}`} style={{ fontSize: '0.72rem' }}>
                          {femaleCount} Female
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Problem Statement: </strong>
                        {team.problem_statements ? (
                          <span>
                            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{team.problem_statements.ps_code}</span> — {team.problem_statements.title}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--orange)', fontStyle: 'italic' }}>No PS Selected</span>
                        )}
                      </div>
                    </div>

                    {/* Evaluation Score Pill Block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{
                        padding: '8px 14px',
                        background: scoreDetails.averageScore ? '#F0FDF4' : 'var(--off-white)',
                        border: `1px solid ${scoreDetails.averageScore ? '#BBF7D0' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'right'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Panel Score (Avg)
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: scoreDetails.averageScore ? 'var(--green)' : 'var(--text-secondary)' }}>
                          {scoreDetails.averageScore ? `${scoreDetails.averageScore} / 50` : '— / 50'}
                        </div>
                      </div>

                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      >
                        {isExpanded ? 'Hide Roster ▲' : `View Members (${teamMembers.length}) ▼`}
                      </button>
                    </div>
                  </div>

                  {/* Judge-by-Judge Evaluation Breakdown */}
                  <div style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    background: 'var(--off-white)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.84rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--navy)' }}>
                        Panel: {scoreDetails.panel?.name || 'Unassigned'} · Individual Judge Evaluations:
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {scoreDetails.completedCount} of {scoreDetails.expectedCount} Judges Evaluated
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {scoreDetails.judgeScores.length === 0 ? (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          No evaluations submitted yet for this team.
                        </span>
                      ) : (
                        scoreDetails.judgeScores.map((js, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '6px 10px',
                              background: '#FFFFFF',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{js.judgeName}:</span>
                            <span className="pill-badge status-verified" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                              {js.score} / 50
                            </span>
                            {js.remarks && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={js.remarks}>
                                "{js.remarks}"
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Expandable Member Roster Table */}
                  {isExpanded && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--navy)' }}>
                        Team Roster ({teamMembers.length} Members)
                      </h4>
                      <table className="data-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Roll No</th>
                            <th>Gender</th>
                            <th>Department</th>
                            <th>Role</th>
                            <th>Skills</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map(m => (
                            <tr key={m.id}>
                              <td><strong>{m.profiles?.full_name}</strong></td>
                              <td>{m.profiles?.roll_no || '—'}</td>
                              <td>{m.profiles?.gender}</td>
                              <td>{m.profiles?.department}</td>
                              <td>
                                <span className={`pill-badge ${m.member_role === 'Leader' ? 'role-leader' : 'role-member'}`} style={{ fontSize: '0.7rem' }}>
                                  {m.member_role}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {(m.profiles?.skills || []).slice(0, 3).map(sk => (
                                    <span key={sk} className="pill-badge skill" style={{ fontSize: '0.65rem', padding: '0 5px' }}>{sk}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
