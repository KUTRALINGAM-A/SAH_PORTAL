import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import SkillTagSelector from '../components/SkillTagSelector';
import { validateTeamName } from '../utils/validators';

export default function CreateTeamPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [psId, setPsId] = useState('');
  const [neededSkills, setNeededSkills] = useState([]);
  const [problemStatements, setProblemStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('problem_statements').select('*').order('ps_code').then(({ data }) => {
      setProblemStatements(data || []);
    });
  }, []);

  // Check if user already has a team
  useEffect(() => {
    if (profile) {
      supabase
        .from('team_members')
        .select('team_id')
        .eq('student_id', profile.id)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            navigate('/my-team');
          }
        });
    }
  }, [profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nameValidation = validateTeamName(teamName);
    if (!nameValidation.valid) {
      setError(nameValidation.message);
      return;
    }

    setLoading(true);

    try {
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          team_name: teamName.trim(),
          leader_id: profile.id,
          ps_id: psId || null,
          needed_skills: neededSkills
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team leader member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          student_id: profile.id,
          member_role: 'Leader'
        });

      if (memberError) throw memberError;

      navigate('/my-team');
    } catch (err) {
      setError(err.message || 'Failed to create team.');
    }

    setLoading(false);
  };

  return (
    <div className="page-container"style={{ maxWidth: '640px', margin: '0 auto', padding: '30px' }}>
      <div className="page-header">
        <h1 className="page-title"> Create a Team</h1>
        <p className="page-subtitle">Start your SIH journey by forming a team. You'll be the Team Leader.</p>
      </div>

      <div className="card">
        {error && (
          <div style={{
            background: '#FFEBEE', color: 'var(--red)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem', marginBottom: '16px'
          }}>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Team Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., CodeCrafters, InnoVision, TechTitans"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
            />
            <div className="form-hint">Choose a unique, creative team name (3-50 characters)</div>
          </div>

          <div className="form-group">
            <label className="form-label">Problem Statement</label>
            <select
              className="form-select"
              value={psId}
              onChange={(e) => setPsId(e.target.value)}
            >
              <option value="">Select a Problem Statement (optional)</option>
              {problemStatements.map(ps => (
                <option key={ps.id} value={ps.id}>
                  [{ps.ps_code}] {ps.title} ({ps.category})
                </option>
              ))}
            </select>
            <div className="form-hint">You can assign a problem statement later</div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills Needed in Teammates</label>
            <SkillTagSelector
              selectedSkills={neededSkills}
              onChange={setNeededSkills}
              maxSkills={8}
            />
            <div className="form-hint">Help potential teammates find your team through skill matching</div>
          </div>

          <button
            type="submit"
            className="btn btn-orange btn-lg w-full"
            disabled={loading}
          >
            {loading ? 'Creating Team...' : 'Create Team & Become Leader'}
          </button>
        </form>
      </div>
    </div>
  );
}
