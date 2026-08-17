import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { parseEvaluationScores } from '../../lib/evaluationHelper';

export default function EvaluationHistory() {
  const { profile } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
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
        <h1 className="page-title">My Submitted Evaluations</h1>
        <p className="page-subtitle">Your evaluated teams ({evaluations.length} teams scored out of 50)</p>
      </div>

      {evaluations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
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
                <th style={{ textAlign: 'center' }}>Understanding (5)</th>
                <th style={{ textAlign: 'center' }}>Innovation (10)</th>
                <th style={{ textAlign: 'center' }}>Technical (10)</th>
                <th style={{ textAlign: 'center' }}>Prototype (15)</th>
                <th style={{ textAlign: 'center' }}>Impact (5)</th>
                <th style={{ textAlign: 'center' }}>Presentation (5)</th>
                <th style={{ textAlign: 'center' }}>Total Score (50)</th>
                <th>Remarks</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => {
                const parsed = parseEvaluationScores(ev);
                return (
                  <tr key={ev.id}>
                    <td><strong>{ev.teams?.team_name}</strong></td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {ev.teams?.problem_statements ? (
                        <span title={ev.teams?.problem_statements?.title}>
                          <strong>{ev.teams.problem_statements.ps_code}</strong>
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.understanding}</td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.innovation}</td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.technical}</td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.prototype}</td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.impact}</td>
                    <td style={{ textAlign: 'center' }}>{parsed.rubric.presentation}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill-badge status-verified" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {parsed.total} / 50
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={parsed.remarks}>
                      {parsed.remarks || '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(ev.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
