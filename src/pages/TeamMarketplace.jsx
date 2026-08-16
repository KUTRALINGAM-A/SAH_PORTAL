import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import TeamCard from '../components/TeamCard';
import TeamInvitationsCard from '../components/TeamInvitationsCard';

export default function TeamMarketplace() {
  const { profile } = useAuth();
  const { sendNotification } = useNotifications();
  const [teams, setTeams] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [problemStatements, setProblemStatements] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [myCurrentTeam, setMyCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [needsFemale, setNeedsFemale] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);

    // Fetch open teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('is_open_for_recruitment', true)
      .eq('is_locked', false)
      .order('created_at', { ascending: false });

    // Fetch all problem statements for lookup
    const { data: psData } = await supabase
      .from('problem_statements')
      .select('*');

    // Fetch member counts
    const { data: membersData } = await supabase
      .from('team_members')
      .select('team_id');

    // Fetch user's current team membership and existing join requests
    if (profile) {
      const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id, member_role, teams(id, team_name, is_locked)')
        .eq('student_id', profile.id)
        .limit(1)
        .maybeSingle();

      if (membershipData?.teams) {
        setMyCurrentTeam({
          id: membershipData.team_id,
          name: membershipData.teams.team_name,
          role: membershipData.member_role,
          is_locked: membershipData.teams.is_locked
        });
      } else {
        setMyCurrentTeam(null);
      }

      const { data: requestsData } = await supabase
        .from('join_requests')
        .select('team_id, status')
        .eq('student_id', profile.id)
        .in('status', ['PENDING', 'ACCEPTED']);

      setMyRequests(requestsData || []);
    }

    // Process data
    const psMap = {};
    (psData || []).forEach(ps => { psMap[ps.id] = ps; });
    setProblemStatements(psMap);

    const counts = {};
    (membersData || []).forEach(m => {
      counts[m.team_id] = (counts[m.team_id] || 0) + 1;
    });
    setMemberCounts(counts);

    setTeams(teamsData || []);
    setLoading(false);
  }

  // Get unique domains for filter
  const domains = useMemo(() => {
    const set = new Set();
    Object.values(problemStatements).forEach(ps => set.add(ps.domain));
    return [...set].sort();
  }, [problemStatements]);

  // Filter teams
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const ps = team.ps_id ? problemStatements[team.ps_id] : null;

      // Search filter
      if (search) {
        const term = search.toLowerCase();
        const matchName = team.team_name.toLowerCase().includes(term);
        const matchPS = ps?.title?.toLowerCase().includes(term);
        const matchSkills = team.needed_skills?.some(s => s.toLowerCase().includes(term));
        if (!matchName && !matchPS && !matchSkills) return false;
      }

      // Domain filter
      if (domainFilter && ps?.domain !== domainFilter) return false;

      // Skill filter
      if (skillFilter && !team.needed_skills?.some(s => s.toLowerCase().includes(skillFilter.toLowerCase()))) return false;

      // Female member filter
      if (needsFemale && !team.needed_skills?.includes('Female Member Required')) return false;

      // Has open slots
      if ((memberCounts[team.id] || 0) >= 6) return false;

      return true;
    });
  }, [teams, search, domainFilter, skillFilter, needsFemale, problemStatements, memberCounts]);

  // Handle join request
  const handleJoinRequest = async (teamId) => {
    if (!profile) return;

    // Strict backend/frontend validation: if student is already in a team, prevent request
    if (myCurrentTeam) {
      setToast({
        type: 'error',
        message: `You are already a member of "${myCurrentTeam.name}". Students can only belong to one team at a time.`
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    const { error } = await supabase
      .from('join_requests')
      .insert({
        team_id: teamId,
        student_id: profile.id,
        message: `Hi! I'd like to join your team. My skills: ${profile.skills?.join(', ') || 'N/A'}`
      });

    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      // Send notification to team leader
      const team = teams.find(t => t.id === teamId);
      if (team) {
        await sendNotification({
          userId: team.leader_id,
          type: 'join_request',
          title: 'New Join Request',
          message: `${profile.full_name} (${profile.department}) wants to join your team "${team.team_name}"`,
          metadata: { team_id: teamId, student_id: profile.id }
        });
      }

      setMyRequests(prev => [...prev, { team_id: teamId, status: 'PENDING' }]);
      setToast({ type: 'success', message: 'Join request sent successfully!' });
    }

    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  }

  return (
    <div className="page-container">
      <div className="hero-banner">
        <h1>Team Recruitment Marketplace</h1>
        <p>Find your dream team or let them find you. Filter by skills, domain, or requirements.</p>
      </div>

      {/* Warning/Info if user is already in a team */}
      {myCurrentTeam && (
        <div style={{
          padding: '16px 20px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-md)',
          color: '#1E40AF',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong>You are already a member of "{myCurrentTeam.name}" ({myCurrentTeam.role}).</strong>
            <div style={{ fontSize: '0.84rem', marginTop: '2px', color: '#3B82F6' }}>
              Per Smart Amrita Hackathon rules, students can only belong to one team at a time.
            </div>
          </div>
          <Link to="/my-team" className="btn btn-navy btn-sm" style={{ fontSize: '0.78rem' }}>
            Go to My Team ➔
          </Link>
        </div>
      )}

      {/* Pending Team Invitations */}
      <TeamInvitationsCard onUpdate={fetchData} />

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search teams, problem statements, or skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="">All Domains</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <input
          type="text"
          className="filter-select"
          placeholder="Filter by skill..."
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          style={{ minWidth: '150px' }}
        />

        <button
          className={`filter-toggle ${needsFemale ? 'active' : ''}`}
          onClick={() => setNeedsFemale(!needsFemale)}
        >
          Needs Female Member
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Showing {filteredTeams.length} of {teams.length} teams
      </p>

      {/* Team Grid */}
      {filteredTeams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h3>No teams match your filters</h3>
          <p>Try adjusting your search or create your own team!</p>
        </div>
      ) : (
        <div className="grid-3">
          {filteredTeams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              problemStatement={team.ps_id ? problemStatements[team.ps_id] : null}
              memberCount={memberCounts[team.id] || 0}
              currentUserId={profile?.id}
              onJoinRequest={handleJoinRequest}
              hasExistingRequest={myRequests.some(r => r.team_id === team.id)}
              isAlreadyInTeam={Boolean(myCurrentTeam)}
              isMyTeam={myCurrentTeam?.id === team.id}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠️'} {toast.message}
        </div>
      )}
    </div>
  );
}
