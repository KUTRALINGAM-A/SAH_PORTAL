import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateZScoreRankings, getTopNTeams, rankingsToCSV } from '../../utils/zscoreCalculator';

export default function BootcampShortlist() {
  const [rankings, setRankings] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [shortlistGenerated, setShortlistGenerated] = useState(false);
  const [topN, setTopN] = useState(50);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [
        evaluationsRes,
        teamsRes,
        panelPsRes,
        panelJudgesRes
      ] = await Promise.all([
        supabase.from('evaluations').select('team_id, judge_id, total_raw, remarks, understanding_score, execution_score, impact_score, pitch_score'),
        supabase.from('teams').select('id, team_name, is_locked, ps_id, problem_statements(id, ps_code, title)'),
        supabase.from('panel_problem_statements').select('panel_id, ps_id'),
        supabase.from('panel_judges').select('panel_id, judge_id')
      ]);

      // Map Problem Statement ID -> Panel ID
      const psToPanelId = {};
      (panelPsRes.data || []).forEach(pps => {
        psToPanelId[pps.ps_id] = pps.panel_id;
      });

      // Map Panel ID -> Judge Count (expected judges in panel)
      const panelJudgeCounts = {};
      (panelJudgesRes.data || []).forEach(pj => {
        panelJudgeCounts[pj.panel_id] = (panelJudgeCounts[pj.panel_id] || 0) + 1;
      });

      // Build expected judges map and team lookup map
      const expectedJudgesMap = {};
      const tMap = {};
      (teamsRes.data || []).forEach(t => {
        tMap[t.id] = t;
        const panelId = t.ps_id ? psToPanelId[t.ps_id] : null;
        const exp = panelId ? (panelJudgeCounts[panelId] || 3) : 3;
        expectedJudgesMap[t.id] = exp;
      });

      setTeamsMap(tMap);

      // Calculate Z-Score normalized rankings
      const ranked = calculateZScoreRankings(evaluationsRes.data || [], expectedJudgesMap);
      setRankings(ranked);
    } catch (err) {
      console.error('Error fetching Bootcamp shortlist data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = () => {
    const top = (shortlistGenerated ? getTopNTeams(rankings, topN) : rankings).map((r, i) => ({
      ...r,
      is_shortlisted: shortlistGenerated && i < topN
    }));
    const csv = rankingsToCSV(top, teamsMap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAH2026_Top_${shortlistGenerated ? topN : 'All'}_Bootcamp_Shortlist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayRankings = shortlistGenerated ? getTopNTeams(rankings, topN) : rankings;

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Top {topN} Bootcamp Shortlist</h1>
          <p className="page-subtitle">Z-Score normalized rankings across all judges (50 Marks Rubric)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Top N:</label>
          <input
            type="number"
            className="form-input"
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value) || 50)}
            style={{ width: '80px' }}
            min={1}
          />
          <button className="btn btn-orange" onClick={() => setShortlistGenerated(true)}>
            Generate Shortlist
          </button>
          <button className="btn btn-navy" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h3>No evaluations yet</h3>
          <p>Judges need to evaluate teams before rankings can be generated.</p>
        </div>
      ) : (
        <>
          {shortlistGenerated && (
            <div style={{
              background: '#E8F5E9',
              border: '1px solid #A5D6A7',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>✓</span>
              <span>
                <strong>Top {topN} Shortlist Generated!</strong> Showing {Math.min(topN, rankings.length)} of {rankings.length} evaluated teams.
              </span>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Rank</th>
                  <th>Team</th>
                  <th>Avg Z-Score</th>
                  <th>Avg Raw Score</th>
                  <th>Evaluations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayRankings.map((r, i) => {
                  const team = teamsMap[r.team_id];
                  const expJudges = r.expected_judges || 3;
                  const isShortlisted = shortlistGenerated && i < topN;

                  return (
                    <tr
                      key={r.team_id}
                      style={i < 3 ? { background: i === 0 ? '#FFFBEB' : i === 1 ? '#F8FAFC' : '#FFF7ED' } : {}}
                    >
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--navy)' }}>
                          {r.rank === 1 ? '🥇 #1' : r.rank === 2 ? '🥈 #2' : r.rank === 3 ? '🥉 #3' : `#${r.rank}`}
                        </strong>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>
                          {team?.team_name || r.team_id.slice(0, 8)}
                        </div>
                        {team?.problem_statements && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{team.problem_statements.ps_code}</span> — {team.problem_statements.title}
                          </div>
                        )}
                      </td>

                      <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: r.avg_z_score >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {r.avg_z_score > 0 ? `+${r.avg_z_score.toFixed(3)}` : r.avg_z_score.toFixed(3)}
                      </td>

                      <td>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {r.avg_raw_score} / 50
                        </strong>
                      </td>

                      <td>
                        <span
                          className="pill-badge"
                          style={{
                            background: 'var(--off-white)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--navy)'
                          }}
                        >
                          {r.judge_count} / {expJudges} Evaluations
                        </span>
                      </td>

                      <td>
                        {isShortlisted ? (
                          <span className="pill-badge status-verified">
                            ✓ Shortlisted
                          </span>
                        ) : r.judge_count >= expJudges ? (
                          <span className="pill-badge status-verified">
                            Evaluated
                          </span>
                        ) : r.judge_count > 0 ? (
                          <span className="pill-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                            In Progress ({r.judge_count}/{expJudges})
                          </span>
                        ) : (
                          <span className="pill-badge status-open">
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
        </>
      )}
    </div>
  );
}
