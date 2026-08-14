import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkillTagSelector from '../components/SkillTagSelector';
import { DEPARTMENTS, YEARS_OF_STUDY } from '../data/departments';
import { validateRollNo, validateEmail, validatePassword, validatePhone } from '../utils/validators';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rollNo: '',
    fullName: '',
    gender: '',
    department: '',
    role: 'student',
    skills: [],
    phone: '',
    yearOfStudy: '',
    githubUrl: '',
    linkedinUrl: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};

    if (form.role === 'student') {
      const rollResult = validateRollNo(form.rollNo);
      if (!rollResult.valid) errs.rollNo = rollResult.message;
    }

    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) errs.email = emailResult.message;

    const passwordResult = validatePassword(form.password);
    if (!passwordResult.valid) errs.password = passwordResult.message;

    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.gender) errs.gender = 'Please select your gender.';
    if (!form.department) errs.department = 'Please select your department.';

    const phoneResult = validatePhone(form.phone);
    if (!phoneResult.valid) errs.phone = phoneResult.message;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      rollNo: form.role === 'student' ? form.rollNo : null,
      fullName: form.fullName,
      gender: form.gender,
      department: form.department,
      role: form.role,
      skills: form.skills,
      phone: form.phone,
      yearOfStudy: form.role === 'student' ? form.yearOfStudy : 'Faculty / Staff',
      githubUrl: form.githubUrl,
      linkedinUrl: form.linkedinUrl
    });

    if (error) {
      setErrors({ submit: error.message });
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: 'var(--green)', marginBottom: '12px' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Account created for <strong>{form.email}</strong> ({form.role}).
            You can now log in to the SAH Portal.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <div className="login-card" style={{ maxWidth: '560px' }}>
        <div className="login-logo">
          <img src="/Logo.png" alt="SAH 2026" />
        </div>

        <h2 className="login-heading" style={{ fontSize: '1.3rem' }}>
          {form.role === 'student' ? '🎓 Student Registration' :
           form.role === 'admin' ? '⚙️ Admin Registration' :
           form.role === 'judge' ? '⚖️ Judge Registration' : '🏛️ SPOC Registration'}
        </h2>

        <p className="login-subheading">
          Amrita Chennai Campus — SAH 2026
        </p>

        {errors.submit && (
          <div style={{
            background: '#FFEBEE', color: 'var(--red)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem', marginBottom: '16px'
          }}>
            ⚠️ {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Type / Role */}
          <div className="form-group">
            <label className="form-label">User Type / Portal Role <span className="required">*</span></label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
            >
              <option value="student">🎓 Student / Team Leader</option>
              <option value="admin">⚙️ Organizing Committee (Admin)</option>
              <option value="judge">⚖️ Judge / Evaluator</option>
              <option value="spoc">🏛️ SPOC / Institute Leader</option>
            </select>
          </div>

          {/* Roll Number (Students only) */}
          {form.role === 'student' && (
            <div className="form-group">
              <label className="form-label">Student Roll Number <span className="required">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.rollNo ? 'error' : ''}`}
                placeholder="AM.CH.U4CSE22001"
                value={form.rollNo}
                onChange={(e) => updateField('rollNo', e.target.value.toUpperCase())}
              />
              {errors.rollNo && <div className="form-error">{errors.rollNo}</div>}
              <div className="form-hint">Format: AM.CH.U4[DEPT][YEAR][NUMBER]</div>
            </div>
          )}

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-input ${errors.fullName ? 'error' : ''}`}
              placeholder="Your full name"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
            {errors.fullName && <div className="form-error">{errors.fullName}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="your.email@example.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          {/* Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <input
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
              />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
          </div>

          {/* Gender & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Gender <span className="required">*</span></label>
              <select
                className={`form-select ${errors.gender ? 'error' : ''}`}
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <div className="form-error">{errors.gender}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <select
                className={`form-select ${errors.department ? 'error' : ''}`}
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && <div className="form-error">{errors.department}</div>}
            </div>
          </div>

          {/* Year (Students only) & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: form.role === 'student' ? '1fr 1fr' : '1fr', gap: '14px' }}>
            {form.role === 'student' && (
              <div className="form-group">
                <label className="form-label">Year of Study</label>
                <select
                  className="form-select"
                  value={form.yearOfStudy}
                  onChange={(e) => updateField('yearOfStudy', e.target.value)}
                >
                  <option value="">Select Year</option>
                  {YEARS_OF_STUDY.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Phone / WhatsApp</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>
          </div>

          {/* GitHub & LinkedIn */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">GitHub Profile URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://github.com/username"
                value={form.githubUrl}
                onChange={(e) => updateField('githubUrl', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn Profile URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://linkedin.com/in/username"
                value={form.linkedinUrl}
                onChange={(e) => updateField('linkedinUrl', e.target.value)}
              />
            </div>
          </div>

          {/* Skills */}
          <div className="form-group">
            <label className="form-label">Technical / Design Skills</label>
            <SkillTagSelector
              selectedSkills={form.skills}
              onChange={(skills) => updateField('skills', skills)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{' '}
          <Link to="/login">Login Here</Link>
        </div>
      </div>
    </div>
  );
}
