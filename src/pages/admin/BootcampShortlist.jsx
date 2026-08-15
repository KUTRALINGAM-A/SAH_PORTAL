import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateZScoreRankings, getTopNTeams, rankingsToCSV } from '../../utils/zscoreCalculator';

export default function BootcampShortlist() {
  const [rankings, setRankings] = useState([]);
  const [teamNames, setTeamNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [shortlistGenerated, setShortlistGenerated] = useState(false);
  const [topN, setTopN] = useState(50);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch all evaluations
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('team_id, judge_id, total_raw');

    // Fetch team names
    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name, is_locked')
      .eq('is_locked', true);

    const names = {};
    (teams || []).forEach(t => { names[t.id] = t.team_name; });
    setTeamNames(names);

    // Calculate rankings
    const ranked = calculateZScoreRankings(evaluations || []);
    setRankings(ranked);
    setLoading(false);
  }

  const handleExportCSV = () => {
    const top = shortlistGenerated ? getTopNTeams(rankings, topN) : rankings;
    const csv = rankingsToCSV(top, teamNames);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAH2026_Top${shortlistGenerated ? topN : 'All'}_Rankings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayRankings = shortlistGenerated ? getTopNTeams(rankings, topN) : rankings;

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between"style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title"> Top {topN} Bootcamp Shortlist</h1>
          <p className="page-subtitle">Z-Score normalized rankings across all judges</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Top N:</label>
          <input
            type="number"
            className="form-input"
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value) || 50)}
            style={{ width: '80px' }}
            min={1}
          />
          <button className="btn btn-orange"onClick={() => setShortlistGenerated(true)}>
             Generate Shortlist
          </button>
          <button className="btn btn-navy"onClick={handleExportCSV}>
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
              background: '#E8F5E9', border: '1px solid #A5D6A7',
              borderRadius: 'var(--radius-md)', padding: '14px 20px',
              marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span></span>
              <span><strong>Top {topN} Shortlist Generated!</strong> Showing {Math.min(topN, rankings.length)} of {rankings.length} evaluated teams.</span>
            </div>
          )}

          <div className="card"style={{ padding: 0, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Avg Z-Score</th>
                  <th>Avg Raw Score</th>
                  <th>Judges</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayRankings.map((r, i) => (
                  <tr key={r.team_id} style={i < 3 ? { background: i === 0 ? '#FFF8E1' : i === 1 ? '#F5F5F5' : '#FBE9E7' } : {}}>
                    <td>
                      <strong style={{ fontSize: '1.1rem' }}>
                        {r.rank === 1 ? '' : r.rank === 2 ? '' : r.rank === 3 ? '' : `#${r.rank}`}
                      </strong>
                    </td>
                    <td><strong>{teamNames[r.team_id] || r.team_id.slice(0, 8)}</strong></td>
                    <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: r.avg_z_score >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {r.avg_z_score > 0 ? '+' : ''}{r.avg_z_score}
                    </td>
                    <td>{r.avg_raw_score}/100</td>
                    <td>{r.judge_count}</td>
                    <td>
                      <span className={`pill-badge ${i < topN && shortlistGenerated ? 'status-verified' : 'role-member'}`}>
                        {i < topN && shortlistGenerated ? 'Shortlisted' : 'Evaluated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
