import { useEffect } from 'react';

export default function UserProfileModal({ profile, memberRole, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  if (!profile) return null;

  return (
    <div className="modal-overlay modal-overlay-top" onClick={onClose} style={{ zIndex: 15000 }}>
      <div
        className="modal-card modal-card-top user-profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="upm-header">
          <button
            className="upm-close-btn"
            onClick={onClose}
          >
            ✕
          </button>

          <div className="upm-header-content">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="upm-name-row">
                <h2 className="upm-name">
                  {profile.full_name}
                </h2>
                {memberRole === 'Leader' ? (
                  <span className="pill-badge role-leader" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    ⭐ Team Leader
                  </span>
                ) : memberRole ? (
                  <span className="pill-badge status-open" style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                    👤 {memberRole}
                  </span>
                ) : (
                  <span className="pill-badge skill" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    🎓 Student
                  </span>
                )}
              </div>
              <p className="upm-subtitle">
                {profile.roll_no ? `${profile.roll_no} · ` : ''}{profile.department || 'Student'}
                {profile.year_of_study && ` (${profile.year_of_study})`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="upm-body">
          {/* Academic & Personal Details */}
          <div>
            <h4 className="upm-section-title">
              📋 Academic & Profile Details
            </h4>
            <div className="upm-detail-grid">
              <div>
                <span className="upm-detail-label">Department / Branch</span>
                <strong className="upm-detail-value">{profile.department || '—'}</strong>
              </div>
              <div>
                <span className="upm-detail-label">Roll Number</span>
                <strong className="upm-detail-value">{profile.roll_no || '—'}</strong>
              </div>
              <div>
                <span className="upm-detail-label">Year of Study</span>
                <strong className="upm-detail-value">{profile.year_of_study || '—'}</strong>
              </div>
              <div>
                <span className="upm-detail-label">Gender</span>
                <strong className="upm-detail-value">
                  {profile.gender || '—'} {profile.gender === 'Female' ? '♀' : profile.gender === 'Male' ? '♂' : ''}
                </strong>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="upm-section-title">
              📞 Contact Information
            </h4>
            <div className="upm-contact-box">
              {profile.email && (
                <div className="upm-contact-row">
                  <span style={{ fontSize: '1.1rem' }}>✉️</span>
                  <a
                    href={`mailto:${profile.email}`}
                    style={{ color: 'var(--blue-link)', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' }}
                  >
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.phone ? (
                <div className="upm-contact-row">
                  <span style={{ fontSize: '1.1rem' }}>📱</span>
                  <a
                    href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#25D366', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {profile.phone} (WhatsApp / Call) ↗
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  📵 Phone / WhatsApp: Not provided
                </div>
              )}
            </div>
          </div>

          {/* Social & Portfolio Links */}
          {(profile.github_url || profile.linkedin_url) && (
            <div>
              <h4 className="upm-section-title">
                🔗 Portfolio & Social Profiles
              </h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {profile.github_url && (
                  <a
                    href={profile.github_url.startsWith('http') ? profile.github_url : `https://${profile.github_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    <span>🐙</span> GitHub Profile ↗
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://${profile.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0077B5', borderColor: '#0077B5', fontWeight: 600 }}
                  >
                    <span>🔵</span> LinkedIn Profile ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Skills & Technical Expertise */}
          <div>
            <h4 className="upm-section-title">
              🛠️ Skills & Technical Expertise
            </h4>
            {profile.skills && profile.skills.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="pill-badge skill"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', fontWeight: 600 }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No technical skills listed yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="upm-footer">
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ minWidth: '100px', padding: '8px 20px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
