import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import RubricRadioGroup from '../../components/RubricRadioGroup';
import { prepareEvaluationPayload, parseEvaluationScores } from '../../lib/evaluationHelper';

export default function EvaluationPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [evaluationsMap, setEvaluationsMap] = useState({});
  const [evaluatedTeams, setEvaluatedTeams] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [judgePanelName, setJudgePanelName] = useState(null);
  const [judgePanelAssigned, setJudgePanelAssigned] = useState(true);

  // 6 Official Rubric scoring parameters (initially null - no option selected)
  const [understanding, setUnderstanding] = useState(null); // Max 5
  const [innovation, setInnovation] = useState(null);       // Max 10
  const [technical, setTechnical] = useState(null);         // Max 10
  const [prototype, setPrototype] = useState(null);         // Max 15
  const [impact, setImpact] = useState(null);               // Max 5
  const [presentation, setPresentation] = useState(null);   // Max 5
  const [remarks, setRemarks] = useState('');

  // Check if all 6 parameters have a selected score
  const isAllSelected =
    understanding !== null &&
    innovation !== null &&
    technical !== null &&
    prototype !== null &&
    impact !== null &&
    presentation !== null;

  // Total Score (Max 50)
  const total =
    (understanding ?? 0) +
    (innovation ?? 0) +
    (technical ?? 0) +
    (prototype ?? 0) +
    (impact ?? 0) +
    (presentation ?? 0);

  const selectedCount = [
    understanding,
    innovation,
    technical,
    prototype,
    impact,
    presentation
  ].filter(v => v !== null).length;

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      let allowedPsIds = null;

      if (profile?.role === 'judge') {
        // Fetch judge's assigned panel
        const { data: pjData } = await supabase
          .from('panel_judges')
          .select('panel_id, judge_panels(name)')
          .eq('judge_id', profile.id)
          .limit(1)
          .single();

        if (pjData?.panel_id) {
          setJudgePanelName(pjData.judge_panels?.name || 'Assigned Panel');
          setJudgePanelAssigned(true);

          const { data: panelPsData } = await supabase
            .from('panel_problem_statements')
            .select('ps_id')
            .eq('panel_id', pjData.panel_id);

          allowedPsIds = (panelPsData || []).map(pps => pps.ps_id);
        } else {
          setJudgePanelAssigned(false);
          setTeams([]);
          setLoading(false);
          return;
        }
      }

      // Query all teams registered under the panel's problem statements
      let query = supabase
        .from('teams')
        .select('*, problem_statements(ps_code, title)')
        .not('ps_id', 'is', null)
        .order('team_name');

      if (allowedPsIds !== null) {
        if (allowedPsIds.length === 0) {
          // Panel has no problem statements assigned yet
          setTeams([]);
          setLoading(false);
          return;
        }
        query = query.in('ps_id', allowedPsIds);
      }

      const { data: teamsData } = await query;

      // Fetch judge's existing evaluations
      if (profile) {
        const { data: evalData } = await supabase
          .from('evaluations')
          .select('*')
          .eq('judge_id', profile.id);

        const evalMap = {};
        (evalData || []).forEach(e => {
          const parsed = parseEvaluationScores(e);
          evalMap[e.team_id] = { ...e, parsed };
        });
        setEvaluationsMap(evalMap);
        setEvaluatedTeams(new Set(Object.keys(evalMap)));
      }

      setTeams(teamsData || []);
    } catch (err) {
      console.error('Error in EvaluationPage fetchData:', err);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    const existing = evaluationsMap[team.id];
    if (existing?.parsed) {
      // Pre-fill existing submitted evaluation for this judge
      const { rubric, remarks: parsedRemarks } = existing.parsed;
      setUnderstanding(rubric.understanding ?? null);
      setInnovation(rubric.innovation ?? null);
      setTechnical(rubric.technical ?? null);
      setPrototype(rubric.prototype ?? null);
      setImpact(rubric.impact ?? null);
      setPresentation(rubric.presentation ?? null);
      setRemarks(parsedRemarks || '');
    } else {
      // Reset all 6 parameters to null (unselected)
      setUnderstanding(null);
      setInnovation(null);
      setTechnical(null);
      setPrototype(null);
      setImpact(null);
      setPresentation(null);
      setRemarks('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !profile) return;

    // Strict validation: all 6 parameters must have a selected radio score
    const missing = [];
    if (understanding === null) missing.push('Understanding (0-5)');
    if (innovation === null) missing.push('Innovation (0-10)');
    if (technical === null) missing.push('Technical (0-10)');
    if (prototype === null) missing.push('Prototype (0-15)');
    if (impact === null) missing.push('Impact (0-5)');
    if (presentation === null) missing.push('Presentation (0-5)');

    if (missing.length > 0) {
      showToast('error', `Please select scores for all 6 parameters. Missing: ${missing.join(', ')}`);
      return;
    }

    // Strict range verification
    if (
      understanding < 0 || understanding > 5 ||
      innovation < 0 || innovation > 10 ||
      technical < 0 || technical > 10 ||
      prototype < 0 || prototype > 15 ||
      impact < 0 || impact > 5 ||
      presentation < 0 || presentation > 5
    ) {
      showToast('error', 'Invalid score selected. Please stay within the official rubric ranges.');
      return;
    }

    setSubmitting(true);

    const payload = prepareEvaluationPayload({
      teamId: selectedTeam.id,
      judgeId: profile.id,
      understanding,
      innovation,
      technical,
      prototype,
      impact,
      presentation,
      remarks
    });

    try {
      // Check if existing evaluation row exists
      const { data: existingRow } = await supabase
        .from('evaluations')
        .select('id')
        .eq('team_id', selectedTeam.id)
        .eq('judge_id', profile.id)
        .maybeSingle();

      let saveError = null;
      let savedData = null;

      if (existingRow?.id) {
        // UPDATE existing evaluation
        const res = await supabase
          .from('evaluations')
          .update(payload)
          .eq('id', existingRow.id)
          .select();
        saveError = res.error;
        savedData = res.data?.[0];
      } else {
        // INSERT new evaluation
        const res = await supabase
          .from('evaluations')
          .insert(payload)
          .select();
        saveError = res.error;
        savedData = res.data?.[0];
      }

      if (saveError) {
        console.error('Evaluation save error:', saveError);
        showToast('error', saveError.message);
      } else {
        showToast('success', `✓ Evaluation saved for "${selectedTeam.team_name}" — Score: ${total}/50`);
        const parsed = parseEvaluationScores(savedData || payload);
        setEvaluationsMap(prev => ({
          ...prev,
          [selectedTeam.id]: { ...(savedData || payload), parsed }
        }));
        setEvaluatedTeams(prev => new Set([...prev, selectedTeam.id]));
        setSelectedTeam(null);
      }
    } catch (err) {
      console.error('Unexpected save error:', err);
      showToast('error', err.message || 'Failed to save evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Evaluate Teams</h1>
        <p className="page-subtitle">
          {profile?.role === 'judge'
            ? judgePanelAssigned
              ? `Panel Scope: ${judgePanelName} — Official SAH Evaluation Rubric (50 Marks)`
              : 'You have not been assigned to a Judge Panel yet'
            : 'Official SAH Evaluation Rubric (50 Marks)'}
        </p>
      </div>

      {profile?.role === 'judge' && !judgePanelAssigned && (
        <div style={{
          padding: '16px 20px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 'var(--radius-md)',
          color: '#92400E',
          marginBottom: '24px',
          fontSize: '0.92rem'
        }}>
          You have not been assigned to a Judge Panel yet. Please contact an Admin to be assigned to a panel and receive problem statements for evaluation.
        </div>
      )}

      {(!judgePanelAssigned && profile?.role === 'judge') ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTeam ? '1fr 1.3fr' : '1fr', gap: '24px', alignItems: 'start' }}>
          {/* Team List */}
          <div>
            <h3 style={{ marginBottom: '12px' }}>
              Assigned Teams for Evaluation ({teams.length})
            </h3>

            {teams.length === 0 ? (
              <div className="card" style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {profile?.role === 'judge'
                    ? 'No teams have registered under your panel\'s assigned problem statements yet.'
                    : 'No teams available for evaluation.'}
                </p>
              </div>
            ) : (
              teams.map(team => {
                const isScored = evaluatedTeams.has(team.id);
                const isCurrent = selectedTeam?.id === team.id;
                const existingScore = evaluationsMap[team.id]?.total_raw;

                return (
                  <div
                    key={team.id}
                    className="card"
                    style={{
                      marginBottom: '10px',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      border: isCurrent ? '2px solid var(--orange)' : '1px solid var(--border-light)',
                      background: isCurrent ? '#FFFBF7' : '#ffffff',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                    onClick={() => handleSelectTeam(team)}
                  >
                    <div className="flex-between">
                      <div>
                        <strong>{team.team_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {team.problem_statements?.ps_code} — {team.problem_statements?.title || 'N/A'}
                        </div>
                      </div>
                      <div>
                        {isScored ? (
                          <span className="pill-badge status-verified">
                            ✓ Scored ({existingScore ?? '—'}/50)
                          </span>
                        ) : (
                          <span className="pill-badge status-open">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Official Rubric Radio Form */}
          {selectedTeam && (
            <div className="card card-elevated" style={{ position: 'sticky', top: '90px', alignSelf: 'start' }}>
              {/* Team & Judge Metadata Header */}
              <div style={{
                background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
                color: '#ffffff',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                  Team Evaluation Form
                </div>
                <h3 style={{ margin: '4px 0 8px', color: '#ffffff', fontSize: '1.25rem' }}>
                  {selectedTeam.team_name}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '0.78rem', color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '6px' }}>
                  <div>
                    <strong style={{ color: '#ffffff' }}>Problem Statement:</strong><br />
                    {selectedTeam.problem_statements?.ps_code || 'N/A'}
                  </div>
                  <div>
                    <strong style={{ color: '#ffffff' }}>Panel:</strong><br />
                    {judgePanelName || 'Assigned Panel'}
                  </div>
                  <div>
                    <strong style={{ color: '#ffffff' }}>Evaluator:</strong><br />
                    {profile?.full_name || 'Judge'}
                  </div>
                </div>
              </div>

              {/* 1. Understanding of the Problem (0-5) */}
              <RubricRadioGroup
                name="understanding"
                label="1. Understanding of the Problem"
                max={5}
                value={understanding}
                onChange={setUnderstanding}
              />

              {/* 2. Innovation & Originality (0-10) */}
              <RubricRadioGroup
                name="innovation"
                label="2. Innovation & Originality"
                max={10}
                value={innovation}
                onChange={setInnovation}
              />

              {/* 3. Technical Solution (0-10) */}
              <RubricRadioGroup
                name="technical"
                label="3. Technical Solution"
                max={10}
                value={technical}
                onChange={setTechnical}
              />

              {/* 4. Prototype / Demo (0-15) */}
              <RubricRadioGroup
                name="prototype"
                label="4. Prototype / Demo"
                max={15}
                value={prototype}
                onChange={setPrototype}
              />

              {/* 5. Impact & Future Scope (0-5) */}
              <RubricRadioGroup
                name="impact"
                label="5. Impact & Future Scope"
                max={5}
                value={impact}
                onChange={setImpact}
              />

              {/* 6. Presentation & Template (0-5) */}
              <RubricRadioGroup
                name="presentation"
                label="6. Presentation & Template"
                max={5}
                value={presentation}
                onChange={setPresentation}
              />

              {/* Total Score Display (Max 50) */}
              <div style={{
                background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '20px',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  TOTAL SCORE
                </div>
                <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1.1, margin: '4px 0' }}>
                  {total}<span style={{ fontSize: '1.3rem', opacity: 0.6 }}> / 50</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: isAllSelected ? '#86efac' : '#fed7aa', fontWeight: 600 }}>
                  {isAllSelected ? '✓ All 6 parameters scored' : `${selectedCount} of 6 parameters selected`}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Remarks / Feedback (Optional)
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Optional: Add specific feedback or notes for this team's prototype and presentation..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleSubmit}
                disabled={submitting || !isAllSelected}
                style={{
                  padding: '14px 20px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  opacity: !isAllSelected ? 0.6 : 1,
                  cursor: !isAllSelected ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting
                  ? 'Submitting Evaluation...'
                  : isAllSelected
                    ? `Submit Evaluation (${total}/50)`
                    : 'Select Scores for All 6 Parameters to Submit'}
              </button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999 }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

