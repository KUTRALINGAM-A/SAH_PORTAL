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

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const genderClass = profile.gender === 'Female' ? 'female' : profile.gender === 'Other' ? 'other' : 'male';

  return (
    <div className="modal-overlay modal-overlay-top"onClick={onClose} style={{ zIndex: 15000 }}>
      <div
        className="modal-card modal-card-top"
        style={{
          maxWidth: '580px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.55)',
          zIndex: 15001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a8a 100%)',
          padding: '24px 24px 20px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          >
            ✕
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className={`avatar ${genderClass}`} style={{
              width: '64px',
              height: '64px',
              fontSize: '1.4rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              border: '3px solid rgba(255,255,255,0.35)',
              flexShrink: 0
            }}>
              {getInitials(profile.full_name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
                  {profile.full_name}
                </h2>
                {memberRole === 'Leader' ? (
                  <span className="pill-badge role-leader"style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                     Team Leader
                  </span>
                ) : memberRole ? (
                  <span className="pill-badge status-open"style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                     {memberRole}
                  </span>
                ) : (
                  <span className="pill-badge skill"style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                     Student
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.88rem', color: '#e2e8f0' }}>
                {profile.roll_no ? `${profile.roll_no} · ` : ''}{profile.department || 'Student'}
                {profile.year_of_study && ` (${profile.year_of_study})`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '65vh',
          overflowY: 'auto'
        }}>
          {/* Academic & Personal Details */}
          <div>
            <h4 style={{
              margin: '0 0 10px',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
              fontWeight: 700
            }}>
               Academic & Profile Details
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>Department / Branch</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile.department || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>Roll Number</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile.roll_no || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>Year of Study</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile.year_of_study || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>Gender</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {profile.gender || '—'} {profile.gender === 'Female' ? '' : profile.gender === 'Male' ? '' : ''}
                </strong>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 style={{
              margin: '0 0 10px',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
              fontWeight: 700
            }}>
               Contact Information
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)'
            }}>
              {profile.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <span style={{ fontSize: '1.1rem' }}></span>
                  <a
                    href={`mailto:${profile.email}`}
                    style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.phone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <span style={{ fontSize: '1.1rem' }}></span>
                  <a
                    href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#25D366', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {profile.phone} (WhatsApp / Call) 
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                   Phone / WhatsApp: Not provided
                </div>
              )}
            </div>
          </div>

          {/* Social & Portfolio Links */}
          {(profile.github_url || profile.linkedin_url) && (
            <div>
              <h4 style={{
                margin: '0 0 10px',
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
                fontWeight: 700
              }}>
                 Portfolio & Social Profiles
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
                    <span></span> GitHub Profile 
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
                    <span></span> LinkedIn Profile 
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Skills & Technical Expertise */}
          <div>
            <h4 style={{
              margin: '0 0 10px',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
              fontWeight: 700
            }}>
               Skills & Technical Expertise
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
        <div style={{
          padding: '16px 24px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
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
