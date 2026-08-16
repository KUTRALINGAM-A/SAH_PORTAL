import { useState, useMemo, useEffect } from 'react';

export default function JudgePanelDetailModal({
  panelId,
  panels = [],
  panelJudges = [],
  panelPS = [],
  teams = [],
  evaluations = [],
  problemStatements = [],
  profiles = [],
  onClose
}) {
  const [activeView, setActiveView] = useState('teams'); // 'teams' | 'judges'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'evaluated' | 'pending'
  const [judgeFilter, setJudgeFilter] = useState('');
  const [psFilter, setPsFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find target panel
  const panel = useMemo(() => {
    return panels.find(p => p.id === panelId) || { id: panelId, name: 'Panel Details' };
  }, [panels, panelId]);

  // Lookup map for PS
  const psMap = useMemo(() => {
    const map = {};
    problemStatements.forEach(ps => { map[ps.id] = ps; });
    return map;
  }, [problemStatements]);

  // Lookup map for profiles
  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach(p => { map[p.id] = p; });
    return map;
  }, [profiles]);

  // Judges in this panel
  const panelJudgesList = useMemo(() => {
    return panelJudges
      .filter(pj => pj.panel_id === panelId)
      .map(pj => pj.profiles || profileMap[pj.judge_id] || { id: pj.judge_id, full_name: 'Judge', email: '' })
      .filter(Boolean);
  }, [panelJudges, panelId, profileMap]);

  // Assigned PS IDs for this panel
  const assignedPsIds = useMemo(() => {
    return new Set(panelPS.filter(pps => pps.panel_id === panelId).map(pps => pps.ps_id));
  }, [panelPS, panelId]);

  // Assigned PS objects
  const assignedProblemStatements = useMemo(() => {
    return problemStatements.filter(ps => assignedPsIds.has(ps.id));
  }, [problemStatements, assignedPsIds]);

  // Assigned teams for this panel
  const assignedTeams = useMemo(() => {
    return teams.filter(t => t.ps_id && assignedPsIds.has(t.ps_id));
  }, [teams, assignedPsIds]);

  // Detailed Team Evaluation Data for this panel
  const teamEvaluationDetails = useMemo(() => {
    return assignedTeams.map(team => {
      const ps = psMap[team.ps_id];
      const teamEvals = evaluations.filter(e => e.team_id === team.id);

      // Judge-by-judge status
      const judgeBreakdown = panelJudgesList.map(judge => {
        const ev = teamEvals.find(e => e.judge_id === judge.id);
        return {
          judgeId: judge.id,
          judgeName: judge.full_name,
          judgeEmail: judge.email,
          judgeDepartment: judge.department,
          isEvaluated: !!ev,
          score: ev ? ev.total_raw : null,
          understandingScore: ev ? ev.understanding_score : null,
          innovationScore: ev ? (ev.innovation_score ?? '—') : null,
          technicalScore: ev ? (ev.technical_score ?? '—') : null,
          prototypeScore: ev ? (ev.prototype_score ?? ev.execution_score) : null,
          impactScore: ev ? ev.impact_score : null,
          presentationScore: ev ? (ev.presentation_score ?? ev.pitch_score) : null,
          remarks: ev ? ev.remarks : null,
          evaluatedAt: ev ? ev.created_at : null
        };
      });

      const completedJudgesCount = judgeBreakdown.filter(j => j.isEvaluated).length;
      const isFullyEvaluated = panelJudgesList.length > 0 && completedJudgesCount === panelJudgesList.length;
      const hasAtLeastOneEvaluation = completedJudgesCount > 0;

      const totalScoreSum = teamEvals.reduce((sum, e) => sum + (e.total_raw || 0), 0);
      const avgScore = teamEvals.length > 0 ? Math.round(totalScoreSum / teamEvals.length) : null;

      return {
        ...team,
        ps,
        evaluations: teamEvals,
        judgeBreakdown,
        completedJudgesCount,
        totalJudgesCount: panelJudgesList.length,
        isFullyEvaluated,
        hasAtLeastOneEvaluation,
        avgScore,
        latestEvaluationTime: teamEvals.length > 0
          ? teamEvals.reduce((latest, e) => (!latest || new Date(e.created_at) > new Date(latest)) ? e.created_at : latest, null)
          : null
      };
    });
  }, [assignedTeams, psMap, evaluations, panelJudgesList]);

  // Overall metrics
  const totalAssignedTeams = teamEvaluationDetails.length;
  const evaluatedTeamsCount = teamEvaluationDetails.filter(t => t.hasAtLeastOneEvaluation).length;
  const pendingTeamsCount = totalAssignedTeams - evaluatedTeamsCount;
  const fullyEvaluatedTeamsCount = teamEvaluationDetails.filter(t => t.isFullyEvaluated).length;

  const totalPossibleJudgeEvaluations = totalAssignedTeams * Math.max(1, panelJudgesList.length);
  const totalCompletedJudgeEvaluations = teamEvaluationDetails.reduce((sum, t) => sum + t.completedJudgesCount, 0);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teamEvaluationDetails.filter(team => {
      // Status filter
      if (statusFilter === 'evaluated' && !team.hasAtLeastOneEvaluation) return false;
      if (statusFilter === 'pending' && team.hasAtLeastOneEvaluation) return false;

      // Judge filter (e.g. show teams evaluated by specific judge or pending for that judge)
      if (judgeFilter) {
        const jInfo = team.judgeBreakdown.find(j => j.judgeId === judgeFilter);
        if (statusFilter === 'evaluated' && !jInfo?.isEvaluated) return false;
        if (statusFilter === 'pending' && jInfo?.isEvaluated) return false;
      }

      // PS filter
      if (psFilter && team.ps_id !== psFilter) return false;

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = team.team_name?.toLowerCase().includes(query);
        const matchesId = team.id?.toLowerCase().includes(query);
        const matchesPsCode = team.ps?.ps_code?.toLowerCase().includes(query);
        const matchesPsTitle = team.ps?.title?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesPsCode && !matchesPsTitle) return false;
      }

      return true;
    });
  }, [teamEvaluationDetails, statusFilter, judgeFilter, psFilter, search]);

  // Judge-wise breakdown list
  const judgeWiseDetails = useMemo(() => {
    return panelJudgesList.map(judge => {
      const judgeEvaluatedTeams = teamEvaluationDetails.filter(t => {
        const jInfo = t.judgeBreakdown.find(j => j.judgeId === judge.id);
        return jInfo?.isEvaluated;
      });

      const judgePendingTeams = teamEvaluationDetails.filter(t => {
        const jInfo = t.judgeBreakdown.find(j => j.judgeId === judge.id);
        return !jInfo?.isEvaluated;
      });

      return {
        judge,
        evaluatedTeams: judgeEvaluatedTeams,
        pendingTeams: judgePendingTeams,
        completedCount: judgeEvaluatedTeams.length,
        pendingCount: judgePendingTeams.length,
        totalAssigned: totalAssignedTeams,
        progressPct: totalAssignedTeams > 0 ? Math.round((judgeEvaluatedTeams.length / totalAssignedTeams) * 100) : 0
      };
    });
  }, [panelJudgesList, teamEvaluationDetails, totalAssignedTeams]);

  // Helper formatting for timestamps
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '1020px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a8a 100%)',
          padding: '22px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                {panel.name}
              </h2>
              <span className="pill-badge" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', fontSize: '0.75rem' }}>
                Live Panel Details
              </span>
            </div>

            {/* Judges row */}
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>Judges:</span>
              {panelJudgesList.length === 0 ? (
                <span style={{ fontSize: '0.82rem', color: '#fca5a5' }}>No judges assigned yet</span>
              ) : (
                panelJudgesList.map(j => (
                  <span
                    key={j.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    👤 {j.full_name} {j.department ? `(${j.department})` : ''}
                  </span>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'background 0.2s'
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* 4 Summary Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          padding: '18px 28px',
          background: 'var(--off-white)',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Assigned Teams
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              {totalAssignedTeams}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Across {assignedProblemStatements.length} problem statements
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Evaluations Completed
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              {evaluatedTeamsCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {totalAssignedTeams > 0 ? Math.round((evaluatedTeamsCount / totalAssignedTeams) * 100) : 0}% of assigned teams
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Evaluations Pending
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: pendingTeamsCount > 0 ? 'var(--orange)' : 'var(--text-secondary)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              {pendingTeamsCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Awaiting judge assessment
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Judge Submissions
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              {totalCompletedJudgeEvaluations} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ {totalPossibleJudgeEvaluations}</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {fullyEvaluatedTeamsCount} / {totalAssignedTeams} fully evaluated
            </div>
          </div>
        </div>

        {/* Navigation View Switcher (Team-Wise vs Judge-Wise) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 28px',
          background: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveView('teams')}
              className={`btn btn-sm ${activeView === 'teams' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.82rem', padding: '6px 16px' }}
            >
              👥 Team-Wise Status ({totalAssignedTeams})
            </button>
            <button
              onClick={() => setActiveView('judges')}
              className={`btn btn-sm ${activeView === 'judges' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.82rem', padding: '6px 16px' }}
            >
              ⚖️ Judge-Wise Breakdown ({panelJudgesList.length})
            </button>
          </div>

          {activeView === 'teams' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Status Filter Tabs */}
              <div style={{ display: 'inline-flex', background: 'var(--light-gray)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    border: 'none',
                    background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'all' ? 'var(--navy)' : 'var(--text-secondary)',
                    fontWeight: statusFilter === 'all' ? 700 : 500,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: statusFilter === 'all' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  All ({totalAssignedTeams})
                </button>
                <button
                  onClick={() => setStatusFilter('evaluated')}
                  style={{
                    border: 'none',
                    background: statusFilter === 'evaluated' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'evaluated' ? 'var(--green)' : 'var(--text-secondary)',
                    fontWeight: statusFilter === 'evaluated' ? 700 : 500,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: statusFilter === 'evaluated' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  ✅ Evaluated ({evaluatedTeamsCount})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  style={{
                    border: 'none',
                    background: statusFilter === 'pending' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'pending' ? 'var(--orange)' : 'var(--text-secondary)',
                    fontWeight: statusFilter === 'pending' ? 700 : 500,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: statusFilter === 'pending' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  ⏳ Pending ({pendingTeamsCount})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter / Search Bar (in Teams view) */}
        {activeView === 'teams' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 28px',
            background: 'var(--off-white)',
            borderBottom: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: '36px' }}
                placeholder="🔍 Search teams by name or problem statement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Judge Filter Dropdown */}
            {panelJudgesList.length > 0 && (
              <select
                className="form-select"
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: '36px', minWidth: '160px' }}
                value={judgeFilter}
                onChange={(e) => setJudgeFilter(e.target.value)}
              >
                <option value="">All Judges</option>
                {panelJudgesList.map(j => (
                  <option key={j.id} value={j.id}>Judge: {j.full_name}</option>
                ))}
              </select>
            )}

            {/* Problem Statement Filter */}
            {assignedProblemStatements.length > 0 && (
              <select
                className="form-select"
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: '36px', minWidth: '180px' }}
                value={psFilter}
                onChange={(e) => setPsFilter(e.target.value)}
              >
                <option value="">All Problem Statements</option>
                {assignedProblemStatements.map(ps => (
                  <option key={ps.id} value={ps.id}>{ps.ps_code} — {ps.title?.slice(0, 24)}...</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          {activeView === 'teams' ? (
            /* =================== VIEW 1: TEAM-WISE EVALUATION STATUS =================== */
            <div>
              {filteredTeams.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'var(--off-white)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📋</div>
                  <h4 style={{ margin: 0, color: 'var(--navy)' }}>No teams found matching your filter</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
                    {search || judgeFilter || psFilter || statusFilter !== 'all'
                      ? 'Try clearing your filters or search keywords.'
                      : 'No teams have selected problem statements assigned to this panel yet.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTeams.map(team => {
                    const isExpanded = expandedTeamId === team.id;

                    return (
                      <div
                        key={team.id}
                        style={{
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          background: team.hasAtLeastOneEvaluation ? '#ffffff' : '#FAFAFA',
                          boxShadow: 'var(--shadow-sm)',
                          overflow: 'hidden',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Team Card Main Row */}
                        <div
                          style={{
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        >
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '1rem', color: 'var(--navy)' }}>
                                {team.team_name}
                              </strong>
                              {team.is_locked && (
                                <span className="pill-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.68rem' }}>
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--navy-light)' }}>
                                {team.ps?.ps_code || 'No PS'}:
                              </span>{' '}
                              {team.ps?.title || 'Unassigned Problem Statement'}
                            </div>
                          </div>

                          {/* Evaluation Status Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            {team.hasAtLeastOneEvaluation ? (
                              <div style={{ textAlign: 'right' }}>
                                <span
                                  className="pill-badge"
                                  style={{
                                    background: team.isFullyEvaluated ? '#E8F5E9' : '#FFFBEB',
                                    color: team.isFullyEvaluated ? 'var(--green)' : '#B45309',
                                    fontSize: '0.78rem',
                                    fontWeight: 700
                                  }}
                                >
                                  {team.isFullyEvaluated ? '✅ Evaluated' : '⏳ Partially Evaluated'} (
                                  {team.completedJudgesCount}/{team.totalJudgesCount} Judges)
                                </span>
                                {team.avgScore !== null && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--navy)', fontWeight: 700, marginTop: '3px' }}>
                                    Score: <span style={{ color: 'var(--orange)', fontSize: '0.95rem' }}>{team.avgScore}</span>/50
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span
                                className="pill-badge"
                                style={{
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  fontSize: '0.78rem',
                                  fontWeight: 600
                                }}
                              >
                                ⏳ Evaluation Pending
                              </span>
                            )}

                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTeamId(isExpanded ? null : team.id);
                              }}
                            >
                              {isExpanded ? 'Hide Judges ▲' : 'Judge Breakdown ▼'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Judge-by-Judge breakdown for this team */}
                        {isExpanded && (
                          <div style={{
                            background: 'var(--off-white)',
                            padding: '14px 18px',
                            borderTop: '1px solid var(--border-light)',
                            fontSize: '0.82rem'
                          }}>
                            <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '8px', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                              Judge Evaluation Details for "{team.team_name}"
                            </div>

                            {team.judgeBreakdown.length === 0 ? (
                              <div style={{ color: 'var(--text-secondary)' }}>No judges configured in panel.</div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                {team.judgeBreakdown.map((jb) => (
                                  <div
                                    key={jb.judgeId}
                                    style={{
                                      background: '#ffffff',
                                      padding: '10px 14px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: `1px solid ${jb.isEvaluated ? '#86efac' : 'var(--border-light)'}`
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <strong style={{ color: 'var(--navy)' }}>{jb.judgeName}</strong>
                                      {jb.isEvaluated ? (
                                        <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.75rem' }}>
                                          ✓ Completed
                                        </span>
                                      ) : (
                                        <span style={{ color: '#B45309', fontWeight: 600, fontSize: '0.75rem' }}>
                                          ○ Pending
                                        </span>
                                      )}
                                    </div>

                                    {jb.isEvaluated ? (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '4px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>Total Score:</span>
                                          <strong style={{ color: 'var(--orange)' }}>{jb.score} / 50</strong>
                                        </div>

                                        {/* Rubric Details */}
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: '4px',
                                          marginTop: '6px',
                                          padding: '6px',
                                          background: 'var(--off-white)',
                                          borderRadius: 'var(--radius-xs)',
                                          fontSize: '0.72rem',
                                          color: 'var(--text-secondary)'
                                        }}>
                                          <div>Understanding: <strong>{jb.understandingScore}/5</strong></div>
                                          <div>Innovation: <strong>{jb.innovationScore}/10</strong></div>
                                          <div>Technical: <strong>{jb.technicalScore}/10</strong></div>
                                          <div>Prototype: <strong>{jb.prototypeScore}/15</strong></div>
                                          <div>Impact: <strong>{jb.impactScore}/5</strong></div>
                                          <div>Presentation: <strong>{jb.presentationScore}/5</strong></div>
                                        </div>

                                        {jb.evaluatedAt && (
                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Completed at: {formatTime(jb.evaluatedAt)}
                                          </div>
                                        )}

                                        {jb.remarks && (
                                          <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', marginTop: '4px', fontStyle: 'italic' }}>
                                            "{jb.remarks}"
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                                        Awaiting evaluation by this judge
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =================== VIEW 2: JUDGE-WISE EVALUATION BREAKDOWN =================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {judgeWiseDetails.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  background: 'var(--off-white)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)'
                }}>
                  No judges currently assigned to this panel.
                </div>
              ) : (
                judgeWiseDetails.map(({ judge, evaluatedTeams, pendingTeams, completedCount, pendingCount, progressPct }) => (
                  <div
                    key={judge.id}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                      padding: '20px'
                    }}
                  >
                    {/* Judge Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>👤 {judge.full_name}</span>
                          {judge.department && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              ({judge.department})
                            </span>
                          )}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {judge.email}
                        </div>
                      </div>

                      {/* Judge Completion Stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--green)' }}>
                          ✓ Completed: {completedCount}
                        </span>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: pendingCount > 0 ? 'var(--orange)' : 'var(--text-secondary)' }}>
                          ○ Pending: {pendingCount}
                        </span>
                        <span className="pill-badge" style={{ background: progressPct === 100 ? '#E8F5E9' : '#FFFBEB', color: progressPct === 100 ? 'var(--green)' : '#B45309', fontSize: '0.74rem' }}>
                          {progressPct}% Done
                        </span>
                      </div>
                    </div>

                    {/* Judge 2-Column Split: Evaluated vs Pending */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                      {/* Left: Evaluated Teams */}
                      <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid #DCFCE7' }}>
                        <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>✓ Evaluated by {judge.full_name}</span>
                          <span style={{ background: '#DCFCE7', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem' }}>
                            {evaluatedTeams.length}
                          </span>
                        </div>

                        {evaluatedTeams.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#15803d', fontStyle: 'italic' }}>
                            No teams evaluated yet by this judge.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {evaluatedTeams.map(t => {
                              const jInfo = t.judgeBreakdown.find(j => j.judgeId === judge.id);

                              return (
                                <div
                                  key={t.id}
                                  style={{
                                    background: '#ffffff',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid #BBF7D0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: 'var(--navy)' }}>{t.team_name}</strong>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                      {t.ps?.ps_code}
                                      {jInfo?.evaluatedAt && ` • ${formatTime(jInfo.evaluatedAt)}`}
                                    </div>
                                  </div>
                                  <div style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '0.9rem' }}>
                                    {jInfo?.score} pts
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right: Pending Teams */}
                      <div style={{ background: '#FFFBEB', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid #FEF3C7' }}>
                        <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>○ Pending Evaluation</span>
                          <span style={{ background: '#FEF3C7', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem' }}>
                            {pendingTeams.length}
                          </span>
                        </div>

                        {pendingTeams.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#B45309', fontStyle: 'italic' }}>
                            🎉 All assigned teams evaluated!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {pendingTeams.map(t => (
                              <div
                                key={t.id}
                                style={{
                                  background: '#ffffff',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid #FDE68A',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div>
                                  <strong style={{ color: 'var(--navy)' }}>{t.team_name}</strong>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {t.ps?.ps_code} — {t.ps?.title?.slice(0, 26)}...
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600 }}>
                                  ⏳ Awaiting Score
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 28px',
          background: 'var(--off-white)',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{activeView === 'teams' ? filteredTeams.length : judgeWiseDetails.length}</strong> items • Live synced with Supabase
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
