import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SkillTagSelector from '../components/SkillTagSelector';
import { DEPARTMENTS, YEARS_OF_STUDY } from '../data/departments';

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({ ...profile });
    }
  }, [profile]);

  if (!profile) return <div className="loading-spinner"><div className="spinner" /></div>;

  const handleSave = async () => {
    setLoading(true);
    const { error } = await updateProfile({
      full_name: form.full_name?.trim(),
      gender: form.gender,
      department: form.department,
      skills: form.skills || [],
      phone: form.phone?.trim() || null,
      year_of_study: profile.role === 'student' ? form.year_of_study : 'Faculty / Staff',
      github_url: form.github_url?.trim() || null,
      linkedin_url: form.linkedin_url?.trim() || null
    });

    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setEditing(false);
    }
    setLoading(false);
    setTimeout(() => setToast(null), 4000);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const genderColor = profile.gender === 'Female' ? 'var(--purple)' : profile.gender === 'Other' ? 'var(--teal)' : 'var(--navy)';

  const roleLabel = 
    profile.role === 'admin' ? 'Organizing Committee (Admin)' :
    profile.role === 'judge' ? 'Evaluator / Judge' :
    profile.role === 'spoc' ? 'Institute SPOC' :
    'Student / Team Leader';

  return (
    <div className="page-container"style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View and update your SAH 2026 account details</p>
        </div>
        {!editing ? (
          <button className="btn btn-outline"onClick={() => { setForm({ ...profile }); setEditing(true); }}>
             Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost"onClick={() => { setEditing(false); setForm({ ...profile }); }}>
              Cancel
            </button>
            <button className="btn btn-primary"onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar & Header Card */}
      <div className="card"style={{ textAlign: 'center', marginBottom: '20px', padding: '32px' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%', background: genderColor,
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', fontWeight: 800, margin: '0 auto 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {getInitials(profile.full_name)}
        </div>
        <h2 style={{ marginBottom: '4px' }}>{profile.full_name}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>
          {profile.roll_no ? `${profile.roll_no} · ` : ''}{profile.department} · {profile.gender}
        </p>
        <div>
          <span className={`pill-badge ${profile.role === 'admin' ? 'role-leader' : 'role-member'}`} style={{ fontSize: '0.85rem', padding: '4px 14px' }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Profile Information</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            {editing ? (
              <input
                className="form-input"
                value={form.full_name || ''}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your full name"
              />
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem', fontWeight: 600 }}>{profile.full_name || '—'}</div>
            )}
          </div>

          {/* Roll Number or Role */}
          {profile.role === 'student' ? (
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <div style={{ padding: '10px 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                {profile.roll_no || '—'}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Portal Role</label>
              <div style={{ padding: '10px 0', fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {roleLabel}
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ padding: '10px 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              {profile.email}
            </div>
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">Gender <span className="required">*</span></label>
            {editing ? (
              <select
                className="form-select"
                value={form.gender || ''}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>
                {profile.gender === 'Female' ? 'Female' : profile.gender === 'Male' ? 'Male' : profile.gender || '—'}
              </div>
            )}
          </div>

          {/* Department */}
          <div className="form-group">
            <label className="form-label">Department / Branch <span className="required">*</span></label>
            {editing ? (
              <select
                className="form-select"
                value={form.department || ''}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>{profile.department || '—'}</div>
            )}
          </div>

          {/* Year of Study (Students) */}
          {profile.role === 'student' && (
            <div className="form-group">
              <label className="form-label">Year of Study</label>
              {editing ? (
                <select
                  className="form-select"
                  value={form.year_of_study || ''}
                  onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}
                >
                  <option value="">Select Year</option>
                  {YEARS_OF_STUDY.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              ) : (
                <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>{profile.year_of_study || '—'}</div>
              )}
            </div>
          )}

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Phone / WhatsApp</label>
            {editing ? (
              <input
                type="tel"
                className="form-input"
                placeholder="+91 9876543210"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>{profile.phone || '—'}</div>
            )}
          </div>

          {/* GitHub URL */}
          <div className="form-group">
            <label className="form-label">GitHub Profile URL</label>
            {editing ? (
              <input
                type="url"
                className="form-input"
                placeholder="https://github.com/username"
                value={form.github_url || ''}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              />
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>
                {profile.github_url ? (
                  <a href={profile.github_url} target="_blank"rel="noreferrer"style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>
                     {profile.github_url}
                  </a>
                ) : '—'}
              </div>
            )}
          </div>

          {/* LinkedIn URL */}
          <div className="form-group"style={{ gridColumn: 'span 2' }}>
            <label className="form-label">LinkedIn Profile URL</label>
            {editing ? (
              <input
                type="url"
                className="form-input"
                placeholder="https://linkedin.com/in/username"
                value={form.linkedin_url || ''}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              />
            ) : (
              <div style={{ padding: '10px 0', fontSize: '0.92rem' }}>
                {profile.linkedin_url ? (
                  <a href={profile.linkedin_url} target="_blank"rel="noreferrer"style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>
                     {profile.linkedin_url}
                  </a>
                ) : '—'}
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="form-group"style={{ marginTop: '16px' }}>
          <label className="form-label">Skills & Technical Expertise</label>
          {editing ? (
            <SkillTagSelector
              selectedSkills={form.skills || []}
              onChange={(skills) => setForm({ ...form, skills })}
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map(s => <span key={s} className="pill-badge skill">{s}</span>)
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No skills added yet. Click "Edit Profile"to add your skills and tech stack.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '' : ''} {toast.message}
        </div>
      )}
    </div>
  );
}
