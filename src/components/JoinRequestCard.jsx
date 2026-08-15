export default function JoinRequestCard({ request, profile, onAccept, onDecline, showActions = true, onClickProfile }) {
  return (
    <div
      className="join-request-card"
      style={{ cursor: onClickProfile && profile ? 'pointer' : 'default' }}
      onClick={() => onClickProfile && profile && onClickProfile(profile)}
      title={onClickProfile && profile ? 'Click to view applicant profile' : undefined}
    >
      <div className="avatar"style={{
        width: '42px', height: '42px', borderRadius: '50%',
        background: profile?.gender === 'Female' ? 'var(--purple)' : 'var(--navy)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
      }}>
        {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
      </div>

      <div className="request-info"style={{ flex: 1 }}>
        <div className="request-name"style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>{profile?.full_name || 'Unknown Student'}</span>
          {profile?.gender === 'Female' && (
            <span style={{ fontSize: '0.75rem' }}></span>
          )}
          {onClickProfile && profile && (
            <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: 'auto', marginRight: '8px' }}>
               View Profile
            </span>
          )}
        </div>
        <div className="request-detail">
          {profile?.roll_no ? `${profile.roll_no} · ` : ''}{profile?.department} · {profile?.year_of_study || ''}
        </div>
        {profile?.skills?.length > 0 && (
          <div className="request-skills">
            {profile.skills.slice(0, 4).map(skill => (
              <span key={skill} className="pill-badge skill">{skill}</span>
            ))}
            {profile.skills.length > 4 && (
              <span className="pill-badge skill">+{profile.skills.length - 4}</span>
            )}
          </div>
        )}
        {request.message && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
            "{request.message}"
          </div>
        )}
      </div>

      {showActions && request.status === 'PENDING' && (
        <div className="request-actions"onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-primary btn-sm"onClick={() => onAccept(request.id)}>
            ✓ Accept
          </button>
          <button className="btn btn-danger btn-sm"onClick={() => onDecline(request.id)}>
            ✗ Decline
          </button>
        </div>
      )}

      {request.status === 'ACCEPTED' && (
        <span className="pill-badge status-verified">✓ Accepted</span>
      )}
      {request.status === 'DECLINED' && (
        <span className="pill-badge status-locked">✗ Declined</span>
      )}
    </div>
  );
}
