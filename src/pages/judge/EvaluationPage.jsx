import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import RubricSlider from '../../components/RubricSlider';

export default function EvaluationPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [evaluatedTeams, setEvaluatedTeams] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Rubric scores
  const [understanding, setUnderstanding] = useState(0);
  const [execution, setExecution] = useState(0);
  const [impact, setImpact] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [remarks, setRemarks] = useState('');

  const total = understanding + execution + impact + pitch;

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    // Fetch locked teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*, problem_statements(ps_code, title)')
      .eq('is_locked', true)
      .order('team_name');

    // Fetch judge's existing evaluations
    if (profile) {
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('team_id')
        .eq('judge_id', profile.id);

      setEvaluatedTeams(new Set((evalData || []).map(e => e.team_id)));
    }

    setTeams(teamsData || []);
    setLoading(false);
  }

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setUnderstanding(0);
    setExecution(0);
    setImpact(0);
    setPitch(0);
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !profile) return;
    setSubmitting(true);

    const { error } = await supabase.from('evaluations').insert({
      team_id: selectedTeam.id,
      judge_id: profile.id,
      understanding_score: understanding,
      execution_score: execution,
      impact_score: impact,
      pitch_score: pitch,
      remarks
    });

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', `Evaluation submitted for "${selectedTeam.team_name}" — Score: ${total}/100`);
      setEvaluatedTeams(prev => new Set([...prev, selectedTeam.id]));
      setSelectedTeam(null);
    }
    setSubmitting(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title"> Evaluate Teams</h1>
        <p className="page-subtitle">Score teams on the standardized 100-point SIH rubric</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTeam ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Team List */}
        <div>
          <h3 style={{ marginBottom: '12px' }}>Locked Teams ({teams.length})</h3>
          {teams.map(team => (
            <div
              key={team.id}
              className="card"
              style={{
                marginBottom: '10px', padding: '14px 18px', cursor: 'pointer',
                border: selectedTeam?.id === team.id ? '2px solid var(--orange)' : undefined,
                opacity: evaluatedTeams.has(team.id) ? 0.6 : 1
              }}
              onClick={() => !evaluatedTeams.has(team.id) && handleSelectTeam(team)}
            >
              <div className="flex-between">
                <div>
                  <strong>{team.team_name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {team.problem_statements?.ps_code} — {team.problem_statements?.title || 'N/A'}
                  </div>
                </div>
                {evaluatedTeams.has(team.id) ? (
                  <span className="pill-badge status-verified"> Scored</span>
                ) : (
                  <span className="pill-badge status-open"> Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rubric Form */}
        {selectedTeam && (
          <div className="card card-elevated"style={{ position: 'sticky', top: '140px', alignSelf: 'start' }}>
            <h3 style={{ marginBottom: '6px' }}>Evaluating: {selectedTeam.team_name}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {selectedTeam.problem_statements?.ps_code} — {selectedTeam.problem_statements?.title}
            </p>

            <RubricSlider
              label="Problem Understanding"
              value={understanding}
              max={25}
              onChange={setUnderstanding}
            />

            <RubricSlider
              label="Prototype / Execution"
              value={execution}
              max={30}
              onChange={setExecution}
            />

            <RubricSlider
              label="Real-World Impact"
              value={impact}
              max={25}
              onChange={setImpact}
            />

            <RubricSlider
              label="Pitch & UI/UX"
              value={pitch}
              max={20}
              onChange={setPitch}
            />

            {/* Total */}
            <div style={{
              background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
              color: 'white', borderRadius: 'var(--radius-lg)', padding: '20px',
              textAlign: 'center', marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>TOTAL SCORE</div>
              <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 900 }}>
                {total}<span style={{ fontSize: '1.2rem', opacity: 0.6 }}>/100</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remarks / Feedback</label>
              <textarea
                className="form-textarea"
                placeholder="Optional: Add detailed feedback for the team..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleSubmit}
              disabled={submitting || total === 0}
            >
              {submitting ? 'Submitting...' : `Submit Evaluation (${total}/100)`}
            </button>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
