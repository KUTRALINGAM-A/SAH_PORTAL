import { useState, useMemo, useEffect } from 'react';
import UserProfileModal from './UserProfileModal';

export default function AdminDashboardDetailsModal({
  initialTab = 'recruiting',
  teams = [],
  members = [],
  profiles = [],
  problemStatements = [],
  onClose
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !viewingProfile) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, viewingProfile]);

  // Build lookup maps
  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach(p => { map[p.id] = p; });
    return map;
  }, [profiles]);

  const psMap = useMemo(() => {
    const map = {};
    problemStatements.forEach(ps => { map[ps.id] = ps; });
    return map;
  }, [problemStatements]);

  // Team members grouped by team_id
  const teamMembersMap = useMemo(() => {
    const map = {};
    members.forEach(m => {
      if (!map[m.team_id]) map[m.team_id] = [];
      map[m.team_id].push(m);
    });
    return map;
  }, [members]);

  // Student assigned team mapping
  const studentTeamMap = useMemo(() => {
    const map = {};
    members.forEach(m => {
      const team = teams.find(t => t.id === m.team_id);
      if (team) {
        map[m.student_id] = {
          teamId: team.id,
          teamName: team.team_name,
          role: m.member_role
        };
      }
    });
    return map;
  }, [members, teams]);

  // Derived lists
  const recruitingTeams = useMemo(() => {
    return teams.filter(t => {
      const mList = teamMembersMap[t.id] || [];
      return (t.is_open_for_recruitment || mList.length < 6) && !t.is_locked;
    });
  }, [teams, teamMembersMap]);

  const lockedTeams = useMemo(() => {
    return teams.filter(t => t.is_locked);
  }, [teams]);

  const unassignedStudents = useMemo(() => {
    return profiles.filter(p => !studentTeamMap[p.id]);
  }, [profiles, studentTeamMap]);

  const femaleStudents = useMemo(() => {
    return profiles.filter(p => p.gender === 'Female');
  }, [profiles]);

  // SIH compliance for teams
  const teamComplianceList = useMemo(() => {
    return teams.map(team => {
      const mList = teamMembersMap[team.id] || [];
      const hasFemale = mList.some(m => profileMap[m.student_id]?.gender === 'Female');
      return {
        ...team,
        memberCount: mList.length,
        hasFemale,
        isCompliant: mList.length === 6 && hasFemale
      };
    });
  }, [teams, teamMembersMap, profileMap]);

  // Department list for dropdown
  const departments = useMemo(() => {
    const set = new Set();
    profiles.forEach(p => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [profiles]);

  // Group teams by PS ID
  const teamsByPsMap = useMemo(() => {
    const map = {};
    teams.forEach(t => {
      const key = t.ps_id || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [teams]);

  // Tab definitions
  const tabs = [
    { id: 'recruiting', label: 'Recruiting Teams', count: recruitingTeams.length, accent: true },
    { id: 'unassigned', label: 'Students Without Team', count: unassignedStudents.length, accent: true },
    { id: 'ps_mapping', label: 'Problem Statements & Teams', count: problemStatements.length, accent: true },
    { id: 'all_teams', label: 'All Teams', count: teams.length },
    { id: 'locked', label: 'Locked Teams', count: lockedTeams.length },
    { id: 'all_students', label: 'All Students', count: profiles.length },
    { id: 'gender', label: 'Female & SIH Rule', count: `${Math.round((femaleStudents.length / Math.max(1, profiles.length)) * 100)}%` }
  ];

  return (
    <div className="modal-overlay"onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '960px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a8a 100%)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
                 Hackathon Live Intelligence & Team Directory
              </h2>
              <span className="pill-badge"style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '0.75rem' }}>
                Admin / SPOC Access
              </span>
            </div>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.85rem', color: '#e2e8f0' }}>
              Monitor team formation, inspect recruiting teams needing members, and match unassigned students.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                border: activeTab === tab.id ? '1px solid var(--navy)' : '1px solid #CBD5E1',
                background: activeTab === tab.id ? 'var(--navy)' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: activeTab === tab.id ? (tab.accent ? 'var(--orange)' : 'rgba(255,255,255,0.25)') : (tab.accent ? '#FFF3E0' : '#E2E8F0'),
                color: activeTab === tab.id ? '#ffffff' : (tab.accent ? '#E65100' : 'var(--navy)'),
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter / Search Bar */}
        <div style={{
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            className="form-input"
            placeholder={
              activeTab.includes('student') || activeTab === 'unassigned'
                ? "Search student name, roll number, department, skills..."
                : "Search team name, problem statement, leader, skills..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '1 1 260px' }}
          />

          <select
            className="form-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ flex: '0 1 180px' }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {(activeTab === 'unassigned' || activeTab === 'all_students') && (
            <select
              className="form-select"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={{ flex: '0 1 140px' }}
            >
              <option value="">All Genders</option>
              <option value="Female">Female Only</option>
              <option value="Male">Male Only</option>
            </select>
          )}
        </div>

        {/* Modal Body / Tab Content */}
        <div style={{
          padding: '20px 24px',
          background: '#F8FAFC'
        }}>
          {/* TAB 1: RECRUITING TEAMS */}
          {activeTab === 'recruiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.88rem',
                color: '#1E40AF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <strong> {recruitingTeams.length} Open Teams Looking for Members</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.85 }}>
                    These teams have open member slots (&lt; 6 members) or are actively recruiting.
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setActiveTab('unassigned')}
                  style={{ background: '#ffffff', borderColor: '#3B82F6', color: '#1D4ED8', fontWeight: 600 }}
                >
                   View Unassigned Students to Match ➔
                </button>
              </div>

              {recruitingTeams.filter(team => {
                const s = search.toLowerCase();
                const leader = profileMap[team.leader_id];
                const ps = psMap[team.ps_id];
                const matchesSearch = !search ||
                  team.team_name?.toLowerCase().includes(s) ||
                  leader?.full_name?.toLowerCase().includes(s) ||
                  ps?.title?.toLowerCase().includes(s) ||
                  ps?.ps_id?.toLowerCase().includes(s) ||
                  (team.skills_needed && team.skills_needed.some(sk => sk.toLowerCase().includes(s)));
                const matchesDept = !selectedDept || leader?.department === selectedDept;
                return matchesSearch && matchesDept;
              }).map(team => {
                const mList = teamMembersMap[team.id] || [];
                const leader = profileMap[team.leader_id];
                const ps = psMap[team.ps_id];
                const slotsOpen = Math.max(0, 6 - mList.length);
                const hasFemale = mList.some(m => profileMap[m.student_id]?.gender === 'Female');
                const isExpanded = expandedTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '18px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>
                            {team.team_name}
                          </h3>
                          <span className="pill-badge"style={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.75rem' }}>
                             {slotsOpen} Slot{slotsOpen > 1 ? 's' : ''} Open ({mList.length}/6)
                          </span>
                          {!hasFemale && (
                            <span className="pill-badge"style={{ background: '#FCE7F3', color: '#BE185D', fontSize: '0.72rem', fontWeight: 600 }}>
                               Needs Female Member (SIH Rule)
                            </span>
                          )}
                        </div>

                        {ps && (
                          <div style={{ margin: '6px 0 4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <strong>PS #{ps.ps_id || ps.id}:</strong> {ps.title}
                          </div>
                        )}

                        <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                           Leader: <strong>{leader?.full_name || 'Unknown'}</strong> ({leader?.department || 'Student'}{leader?.year_of_study ? ` · ${leader.year_of_study}` : ''})
                        </div>
                      </div>

                      {/* Leader Contact & Expand */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {leader?.phone && (
                          <a
                            href={`https://wa.me/${leader.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline"
                            style={{ color: '#25D366', borderColor: '#25D366', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span></span> WhatsApp Leader
                          </a>
                        )}
                        {leader && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setViewingProfile(leader)}
                            style={{ fontSize: '0.78rem' }}
                          >
                             Leader Profile
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                          style={{ fontSize: '0.78rem' }}
                        >
                          {isExpanded ? 'Hide Members ▲' : `View Roster (${mList.length}) ▼`}
                        </button>
                      </div>
                    </div>

                    {/* Skills Needed */}
                    {team.skills_needed && team.skills_needed.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                           Desired Skills:
                        </span>
                        {team.skills_needed.map(sk => (
                          <span key={sk} className="pill-badge skill"style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expanded Members Roster */}
                    {isExpanded && (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Team Members Roster ({mList.length}/6)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                          {mList.map(m => {
                            const p = profileMap[m.student_id];
                            return (
                              <div
                                key={m.id}
                                onClick={() => p && setViewingProfile(p)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 12px',
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
                                title="Click to view member profile"
                              >
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: p?.gender === 'Female' ? 'var(--purple)' : 'var(--navy)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}>
                                  {p?.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                                </div>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {p?.full_name || 'Loading...'} {m.member_role === 'Leader' && ''}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {p?.department || 'Student'} · {p?.gender || ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: UNASSIGNED STUDENTS */}
          {activeTab === 'unassigned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.88rem',
                color: '#92400E',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <strong> {unassignedStudents.length} Students Not in Any Team Yet</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.9 }}>
                    These students are registered on the portal and looking for teams to join.
                  </span>
                </div>
                <span className="pill-badge"style={{ background: '#B45309', color: 'white', fontWeight: 700 }}>
                  Ready to Match
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {unassignedStudents.filter(p => {
                  const s = search.toLowerCase();
                  const matchesSearch = !search ||
                    p.full_name?.toLowerCase().includes(s) ||
                    p.roll_no?.toLowerCase().includes(s) ||
                    p.department?.toLowerCase().includes(s) ||
                    (p.skills && p.skills.some(sk => sk.toLowerCase().includes(s)));
                  const matchesDept = !selectedDept || p.department === selectedDept;
                  const matchesGender = !genderFilter || p.gender === genderFilter;
                  return matchesSearch && matchesDept && matchesGender;
                }).map(student => (
                  <div
                    key={student.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: student.gender === 'Female' ? 'var(--purple)' : 'var(--navy)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          {student.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{student.full_name}</span>
                            {student.gender === 'Female' && <span title="Female Candidate"></span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {student.roll_no ? `${student.roll_no} · ` : ''}{student.department || 'Student'}
                            {student.year_of_study ? ` · ${student.year_of_study}` : ''}
                          </div>
                        </div>
                      </div>

                      {student.skills && student.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {student.skills.slice(0, 4).map(sk => (
                            <span key={sk} className="pill-badge skill"style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {sk}
                            </span>
                          ))}
                          {student.skills.length > 4 && (
                            <span className="pill-badge skill"style={{ fontSize: '0.68rem', padding: '1px 4px' }}>
                              +{student.skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', justifyContent: 'space-between', alignItems: 'center' }}>
                      {student.phone ? (
                        <a
                          href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-ghost"
                          style={{ color: '#25D366', fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                           WhatsApp
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No Phone</span>
                      )}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setViewingProfile(student)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                         View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROBLEM STATEMENT ALLOCATION */}
          {activeTab === 'ps_mapping' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.88rem',
                color: '#1E40AF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <strong> Problem Statement Allocation & Team Competition</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.85 }}>
                    See which teams have selected each problem statement and which statements have 0 teams.
                  </span>
                </div>
              </div>

              {problemStatements.filter(ps => {
                const s = search.toLowerCase().trim();
                const assignedTeams = teamsByPsMap[ps.id] || [];
                const matchSearch = !search ||
                  ps.ps_code?.toLowerCase().includes(s) ||
                  ps.title?.toLowerCase().includes(s) ||
                  ps.domain?.toLowerCase().includes(s) ||
                  assignedTeams.some(t => t.team_name?.toLowerCase().includes(s));
                const matchDomain = !selectedDept || ps.domain === selectedDept;
                return matchSearch && matchDomain;
              }).map(ps => {
                const assignedTeams = teamsByPsMap[ps.id] || [];

                return (
                  <div
                    key={ps.id}
                    style={{
                      background: '#ffffff',
                      border: assignedTeams.length > 0 ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--navy)', fontSize: '1rem' }}>{ps.ps_code}</strong>
                          <span className={`pill-badge ${ps.category === 'Hardware' ? 'domain' : 'skill'}`} style={{ fontSize: '0.72rem' }}>
                            {ps.category}
                          </span>
                          <span className="pill-badge domain"style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.72rem' }}>
                            {ps.domain}
                          </span>
                          {assignedTeams.length > 0 ? (
                            <span className="pill-badge status-verified"style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                               {assignedTeams.length} Team{assignedTeams.length > 1 ? 's' : ''} Competing
                            </span>
                          ) : (
                            <span className="pill-badge"style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.72rem' }}>
                              0 Teams Assigned
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: '6px 0 4px', fontSize: '0.98rem', color: 'var(--navy)' }}>
                          {ps.title}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                           {ps.organization || 'Government of India'}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Teams */}
                    {assignedTeams.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {assignedTeams.map(t => {
                          const leader = profileMap[t.leader_id];
                          const mList = teamMembersMap[t.id] || [];

                          return (
                            <div
                              key={t.id}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.83rem'
                              }}
                            >
                              <div>
                                <strong>{t.team_name}</strong> ({mList.length}/6 members)
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Leader: {leader?.full_name}
                                </span>
                              </div>
                              {leader && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => setViewingProfile(leader)}
                                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                >
                                   Profile
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: ALL TEAMS */}
          {activeTab === 'all_teams' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {teams.filter(team => {
                const s = search.toLowerCase();
                const leader = profileMap[team.leader_id];
                const ps = psMap[team.ps_id];
                const matchesSearch = !search ||
                  team.team_name?.toLowerCase().includes(s) ||
                  leader?.full_name?.toLowerCase().includes(s) ||
                  ps?.title?.toLowerCase().includes(s) ||
                  ps?.ps_id?.toLowerCase().includes(s);
                const matchesDept = !selectedDept || leader?.department === selectedDept;
                return matchesSearch && matchesDept;
              }).map(team => {
                const mList = teamMembersMap[team.id] || [];
                const leader = profileMap[team.leader_id];
                const ps = psMap[team.ps_id];
                const hasFemale = mList.some(m => profileMap[m.student_id]?.gender === 'Female');
                const isExpanded = expandedTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>
                            {team.team_name}
                          </span>
                          {team.is_locked ? (
                            <span className="pill-badge status-locked"style={{ fontSize: '0.72rem' }}> Locked</span>
                          ) : (
                            <span className="pill-badge status-open"style={{ fontSize: '0.72rem' }}> Recruiting ({mList.length}/6)</span>
                          )}
                          {hasFemale ? (
                            <span className="pill-badge status-verified"style={{ fontSize: '0.72rem' }}> 1+ Female</span>
                          ) : (
                            <span className="pill-badge"style={{ background: '#FCE7F3', color: '#BE185D', fontSize: '0.72rem' }}>0 Female</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Leader: <strong>{leader?.full_name || 'Unknown'}</strong> ({leader?.department || 'Student'})
                          {ps && ` · PS #${ps.ps_id || ps.id}: ${ps.title}`}
                        </div>
                      </div>

                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {isExpanded ? 'Hide Members ▲' : `Roster (${mList.length}/6) ▼`}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {mList.map(m => {
                          const p = profileMap[m.student_id];
                          return (
                            <button
                              key={m.id}
                              onClick={() => p && setViewingProfile(p)}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                            >
                              {m.member_role === 'Leader' ? '' : ''} {p?.full_name || 'Member'} ({p?.department || 'Student'})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: LOCKED TEAMS */}
          {activeTab === 'locked' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.88rem',
                color: '#065F46',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <strong> {lockedTeams.length} Finalized & Locked Teams</strong>
                <span style={{ fontSize: '0.8rem' }}>Ready for Verification Queue & Judge Evaluation</span>
              </div>

              {lockedTeams.map(team => {
                const mList = teamMembersMap[team.id] || [];
                const leader = profileMap[team.leader_id];
                const ps = psMap[team.ps_id];
                const hasFemale = mList.some(m => profileMap[m.student_id]?.gender === 'Female');

                return (
                  <div
                    key={team.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>
                          {team.team_name}
                        </span>
                        <span className="pill-badge status-locked"style={{ fontSize: '0.72rem' }}> 6/6 Members</span>
                        {hasFemale ? (
                          <span className="pill-badge status-verified"style={{ fontSize: '0.72rem' }}> SIH Rule Compliant ()</span>
                        ) : (
                          <span className="pill-badge"style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.72rem' }}> 0 Female Members</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Leader: <strong>{leader?.full_name}</strong> ({leader?.department})
                        {ps && ` · PS #${ps.ps_id || ps.id}: ${ps.title}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {leader && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setViewingProfile(leader)}
                          style={{ fontSize: '0.78rem' }}
                        >
                           Leader Profile
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: ALL REGISTERED STUDENTS */}
          {activeTab === 'all_students' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {profiles.filter(p => {
                const s = search.toLowerCase();
                const matchesSearch = !search ||
                  p.full_name?.toLowerCase().includes(s) ||
                  p.roll_no?.toLowerCase().includes(s) ||
                  p.department?.toLowerCase().includes(s);
                const matchesDept = !selectedDept || p.department === selectedDept;
                const matchesGender = !genderFilter || p.gender === genderFilter;
                return matchesSearch && matchesDept && matchesGender;
              }).map(student => {
                const teamInfo = studentTeamMap[student.id];

                return (
                  <div
                    key={student.id}
                    onClick={() => setViewingProfile(student)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: student.gender === 'Female' ? 'var(--purple)' : 'var(--navy)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}>
                        {student.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.full_name} {student.gender === 'Female' && ''}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {student.roll_no ? `${student.roll_no} · ` : ''}{student.department || 'Student'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {teamInfo ? (
                        <span className="pill-badge status-verified"style={{ fontSize: '0.7rem' }}>
                           {teamInfo.teamName} ({teamInfo.role})
                        </span>
                      ) : (
                        <span className="pill-badge status-open"style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#B45309' }}>
                           Looking for Team
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 600 }}>
                        View 
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 6: GENDER & SIH RULE */}
          {activeTab === 'gender' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--purple)' }}>
                    {femaleStudents.length}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Total Female Students
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--orange)' }}>
                    {Math.round((femaleStudents.length / Math.max(1, profiles.length)) * 100)}%
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Female Ratio
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green)' }}>
                    {teamComplianceList.filter(t => t.hasFemale).length} / {teams.length}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Teams with 1+ Female
                  </div>
                </div>
              </div>

              {/* Non-compliant teams */}
              <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span></span> Teams Missing Female Member (SIH Rule Requirement)
                </h4>
                {teamComplianceList.filter(t => !t.hasFemale).length === 0 ? (
                  <div style={{ color: 'var(--green)', fontSize: '0.88rem' }}>
                     All teams currently comply with the female member requirement!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {teamComplianceList.filter(t => !t.hasFemale).map(team => {
                      const leader = profileMap[team.leader_id];
                      return (
                        <div
                          key={team.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            background: '#FFF5F5',
                            border: '1px solid #FED7D7',
                            borderRadius: '8px',
                            fontSize: '0.88rem'
                          }}
                        >
                          <div>
                            <strong>{team.team_name}</strong> ({team.memberCount}/6 members)
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                              Leader: {leader?.full_name} ({leader?.department})
                            </span>
                          </div>
                          {leader?.phone && (
                            <a
                              href={`https://wa.me/${leader.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline"
                              style={{ color: '#25D366', borderColor: '#25D366', fontSize: '0.75rem' }}
                            >
                               Alert Leader
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          background: '#F1F5F9',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
             Tip: Click on any student or team member to inspect their full profile, contact info, and skills.
          </span>
          <button className="btn btn-primary btn-sm"onClick={onClose} style={{ minWidth: '90px' }}>
            Close
          </button>
        </div>
      </div>

      {/* User Profile Modal on top if clicking any user */}
      {viewingProfile && (
        <UserProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}
