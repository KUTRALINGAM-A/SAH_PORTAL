export default function MemberSlot({ member, profile, isLeader, onRemove, canRemove, onInviteClick, onClickProfile }) {
  if (!member) {
    return (
      <div
        className="member-slot empty"
        onClick={onInviteClick}
        style={onInviteClick ? { cursor: 'pointer', borderStyle: 'dashed' } : {}}
      >
        <span>
           Empty Slot {onInviteClick ? '— Click to Invite / Add Member ' : '— Waiting for a member'}
        </span>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const genderClass = profile?.gender === 'Female' ? 'female' : profile?.gender === 'Other' ? 'other' : 'male';

  const handleClick = () => {
    if (onClickProfile && profile) {
      onClickProfile(profile, member.member_role);
    }
  };

  return (
    <div
      className="member-slot"
      onClick={handleClick}
      style={{
        cursor: onClickProfile && profile ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
      }}
      title={onClickProfile && profile ? 'Click to view full profile details' : undefined}
      onMouseOver={(e) => {
        if (onClickProfile && profile) {
          e.currentTarget.style.borderColor = 'var(--blue)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
        }
      }}
      onMouseOut={(e) => {
        if (onClickProfile && profile) {
          e.currentTarget.style.borderColor = 'var(--border-light)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div className={`avatar ${genderClass}`}>
        {getInitials(profile?.full_name)}
      </div>

      <div className="member-info"style={{ flex: 1 }}>
        <div className="member-name"style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>{profile?.full_name || 'Loading...'}</span>
          {member.member_role === 'Leader' && (
            <span className="pill-badge role-leader"style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
               Leader
            </span>
          )}
          {onClickProfile && profile && (
            <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: 'auto', marginRight: '8px' }}>
               View Profile
            </span>
          )}
        </div>
        <div className="member-detail">
          {profile?.roll_no ? `${profile.roll_no} · ` : ''}{profile?.department || 'Student'}
          {profile?.gender === 'Female' && ' · Female'}
          {profile?.year_of_study && ` · ${profile.year_of_study}`}
        </div>
        {profile?.skills?.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            {profile.skills.slice(0, 4).map(s => (
              <span key={s} className="pill-badge skill"style={{ fontSize: '0.7rem', padding: '1px 8px' }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {canRemove && member.member_role !== 'Leader' && (
        <div className="member-actions"style={{ marginLeft: '8px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(member.id, member.student_id);
            }}
            title="Remove member from team"
            style={{ color: 'var(--red)', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
