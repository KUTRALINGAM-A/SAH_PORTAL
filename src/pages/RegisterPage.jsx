import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkillTagSelector from '../components/SkillTagSelector';
import { DEPARTMENTS, YEARS_OF_STUDY } from '../data/departments';
import { validateRollNo, validateEmail, validateCollegeEmail, validatePassword, validatePhone } from '../utils/validators';
import sahLogo from '../assets/Logo.png';

export default function RegisterPage() {
  const { sendRegistrationOtp, verifyRegistrationOtpAndCreateAccount } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Registration Details, 2 = Verify College Email OTP
  const [form, setForm] = useState({
    email: '',
    collegeEmail: '',
    password: '',
    confirmPassword: '',
    rollNo: '',
    fullName: '',
    gender: '',
    department: '',
    skills: [],
    phone: '',
    yearOfStudy: '',
    githubUrl: '',
    linkedinUrl: ''
  });

  const [dispatchedCollegeEmail, setDispatchedCollegeEmail] = useState('');
  const [serverOtpCode, setServerOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};

    const rollResult = validateRollNo(form.rollNo);
    if (!rollResult.valid) errs.rollNo = rollResult.message;

    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) errs.email = emailResult.message;

    const collegeEmailResult = validateCollegeEmail(form.collegeEmail);
    if (!collegeEmailResult.valid) errs.collegeEmail = collegeEmailResult.message;

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

  // Step 1: Send OTP to College Mail ID
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { data: otpData, error: sendErr } = await sendRegistrationOtp(form);

    if (sendErr) {
      setErrors({ submit: sendErr.message || 'Failed to send OTP to College Mail ID. Please try again.' });
    } else {
      setDispatchedCollegeEmail(otpData?.collegeEmail || form.collegeEmail);
      setServerOtpCode(otpData?.otpCode || '');
      setStep(2);
    }
    setLoading(false);
  };

  // Step 2: Verify OTP and complete account creation
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setErrors({});

    if (otpToken.trim().length < 6) {
      setErrors({ otp: 'Please enter the full 6-digit OTP code sent to your College Mail ID.' });
      return;
    }

    setLoading(true);

    const { error: verifyErr } = await verifyRegistrationOtpAndCreateAccount({
      collegeEmail: dispatchedCollegeEmail || form.collegeEmail,
      otpToken,
      formData: form,
      serverOtpCode
    });

    if (verifyErr) {
      setErrors({ submit: verifyErr.message || 'Invalid or expired OTP code. Please check your College Mail ID or request a new OTP.' });
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
            Account verified and created for <strong>{form.collegeEmail}</strong>.
            You can now log in to the SAH Portal using either your Personal Email or College Mail ID.
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
      <div className="login-card" style={{ maxWidth: '580px' }}>
        <div className="login-logo">
          <img src={sahLogo} alt="SAH 2026 Logo" style={{ display: 'block', margin: '0 auto 16px', maxHeight: '80px', width: 'auto' }} />
        </div>

        <h2 className="login-heading" style={{ fontSize: '1.3rem' }}>
          {step === 1 ? 'Student Registration' : 'Verify College Mail ID'}
        </h2>

        <p className="login-subheading">
          {step === 1
            ? 'Amrita Chennai Campus — SAH 2026'
            : `A 6-digit OTP security code has been sent to ${dispatchedCollegeEmail || form.collegeEmail}.`}
        </p>

        {errors.submit && (
          <div style={{
            background: '#FFEBEE', color: 'var(--red)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem', marginBottom: '16px',
            borderLeft: '4px solid #D32F2F'
          }}>
             {errors.submit}
          </div>
        )}

        {step === 1 ? (
          /* STEP 1: Registration Form */
          <form onSubmit={handleSendOtp}>
            {/* Roll Number */}
            <div className="form-group">
              <label className="form-label">Student Roll Number <span className="required">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.rollNo ? 'error' : ''}`}
                placeholder="CH.EN.U4CSE23008"
                value={form.rollNo}
                onChange={(e) => updateField('rollNo', e.target.value.toUpperCase())}
              />
              {errors.rollNo && <div className="form-error">{errors.rollNo}</div>}
              <div className="form-hint">Format: CH.EN.U4[DEPT][YEAR][NUMBER] or CH.SC.U4[DEPT][YEAR][NUMBER]</div>
            </div>

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

            {/* Personal Email & College Mail ID */}
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Personal Email <span className="required">*</span></label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">College Mail ID <span className="required">*</span></label>
                <input
                  type="email"
                  className={`form-input ${errors.collegeEmail ? 'error' : ''}`}
                  placeholder="name@ch.amrita.edu"
                  value={form.collegeEmail}
                  onChange={(e) => updateField('collegeEmail', e.target.value)}
                />
                {errors.collegeEmail && <div className="form-error">{errors.collegeEmail}</div>}
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="form-row-2col">
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
            <div className="form-row-2col">
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

            {/* Year of Study & Mandatory Phone */}
            <div className="form-row-2col">
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

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp <span className="required">*</span></label>
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
            <div className="form-row-2col">
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
              {loading ? 'Sending OTP to College Mail...' : 'Register & Send OTP'}
            </button>
          </form>
        ) : (
          /* STEP 2: Verify OTP Sent to College Mail ID */
          <form onSubmit={handleVerifyOtpAndRegister}>
            <div
              style={{
                background: '#E3F2FD',
                color: '#1565C0',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                marginBottom: '20px',
                borderLeft: '4px solid #1976D2'
              }}
            >
              ℹ️ A 6-digit OTP verification code has been dispatched to <strong>{dispatchedCollegeEmail}</strong>. Please check your College Mail ID inbox to confirm registration.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                6-Digit College Email OTP Code <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.otp ? 'error' : ''}`}
                placeholder="e.g. 123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                style={{ letterSpacing: '4px', fontSize: '1.3rem', fontWeight: 'bold', textAlign: 'center' }}
              />
              {errors.otp && <div className="form-error">{errors.otp}</div>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Verifying OTP & Registering...' : 'Verify OTP & Complete Registration'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.85rem' }}>
              <button
                type="button"
                className="btn-text"
                style={{ background: 'none', border: 'none', color: 'var(--orange-primary)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                onClick={() => setStep(1)}
              >
                ← Edit Registration Details
              </button>
              <button
                type="button"
                className="btn-text"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                onClick={handleSendOtp}
                disabled={loading}
              >
                Resend OTP Code
              </button>
            </div>
          </form>
        )}

        <div className="auth-link">
          Already have an account?{' '}
          <Link to="/login">Login Here</Link>
        </div>
      </div>
    </div>
  );
}
