import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function EvaluationHistory() {
  const { profile } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  async function fetchData() {
    const { data } = await supabase
      .from('evaluations')
      .select('*, teams(team_name, problem_statements(ps_code, title))')
      .eq('judge_id', profile.id)
      .order('created_at', { ascending: false });

    setEvaluations(data || []);
    setLoading(false);
  }

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📝 My Evaluations</h1>
        <p className="page-subtitle">Your submitted evaluations ({evaluations.length} teams scored)</p>
      </div>

      {evaluations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <h3>No evaluations yet</h3>
          <p>Go to "Evaluate Teams" to start scoring.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Problem Statement</th>
                <th>Understanding (25)</th>
                <th>Execution (30)</th>
                <th>Impact (25)</th>
                <th>Pitch (20)</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id}>
                  <td><strong>{ev.teams?.team_name}</strong></td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {ev.teams?.problem_statements?.ps_code || '—'}
                  </td>
                  <td>{ev.understanding_score}</td>
                  <td>{ev.execution_score}</td>
                  <td>{ev.impact_score}</td>
                  <td>{ev.pitch_score}</td>
                  <td>
                    <strong style={{ color: 'var(--orange)', fontSize: '1.05rem' }}>
                      {ev.total_raw}/100
                    </strong>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
