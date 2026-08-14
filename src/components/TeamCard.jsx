export default function TeamCard({ team, problemStatement, memberCount, onJoinRequest, currentUserId, hasExistingRequest }) {
  const openSlots = 6 - (memberCount || 0);
  const needsFemale = team.needed_skills?.includes('Female Member Required');

  return (
    <div className="team-card">
      <div className="team-card-header">
        <div className="team-name">{team.team_name}</div>
        <div className="team-ps">
          {problemStatement ? `${problemStatement.ps_code} — ${problemStatement.title}` : 'No Problem Statement assigned'}
        </div>
      </div>

      <div className="team-card-body">
        <div className="member-bar">
          <div className="member-dots">
            {[...Array(6)].map((_, i) => (
              <span key={i} className={`member-dot ${i >= memberCount ? 'empty' : ''}`} />
            ))}
          </div>
          <span className="member-count">{memberCount}/6 Members</span>
        </div>

        <div className="skills-row">
          {needsFemale && (
            <span className="pill-badge needs-female">♀ Female Member Needed</span>
          )}
          {team.needed_skills?.filter(s => s !== 'Female Member Required').slice(0, 4).map(skill => (
            <span key={skill} className="pill-badge skill">{skill}</span>
          ))}
          {team.needed_skills?.length > 5 && (
            <span className="pill-badge skill">+{team.needed_skills.length - 5} more</span>
          )}
        </div>
      </div>

      <div className="team-card-footer">
        <span className={`pill-badge ${team.is_locked ? 'status-locked' : 'status-open'}`}>
          {team.is_locked ? '🔒 Locked' : '🟢 Open'}
        </span>

        {!team.is_locked && team.is_open_for_recruitment && currentUserId && team.leader_id !== currentUserId && (
          <button
            className="btn btn-orange btn-sm"
            onClick={() => onJoinRequest(team.id)}
            disabled={hasExistingRequest}
          >
            {hasExistingRequest ? '⏳ Request Sent' : '📩 Request to Join'}
          </button>
        )}

        {team.leader_id === currentUserId && (
          <span className="pill-badge role-leader">👑 Your Team</span>
        )}
      </div>
    </div>
  );
}
