import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function TeamInvitationsCard({ onUpdate }) {
  const { profile } = useAuth();
  const { sendNotification } = useNotifications();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      fetchInvitations();
    }
  }, [profile]);

  async function fetchInvitations() {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          team_id,
          student_id,
          status,
          created_at,
          teams:team_id (
            id,
            team_name,
            is_locked,
            leader_id,
            problem_statements (
              ps_code,
              title,
              category,
              domain
            ),
            leader:leader_id (
              id,
              full_name,
              department,
              email
            )
          )
        `)
        .eq('student_id', profile.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvitations(data.filter(inv => inv.teams && !inv.teams.is_locked));
      }
    } catch (err) {
      console.warn('Invitations fetch note:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (invitation) => {
    setActionLoadingId(invitation.id);
    try {
      // 1. Verify student is not already in any team
      const { data: existingTeam } = await supabase
        .from('team_members')
        .select('id, teams(team_name)')
        .eq('student_id', profile.id)
        .limit(1);

      if (existingTeam && existingTeam.length > 0) {
        alert('You are already a member of a team. You must leave your current team before joining another.');
        setActionLoadingId(null);
        return;
      }

      // 2. Check team capacity
      const { data: currentMembers } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invitation.team_id);

      if (currentMembers && currentMembers.length >= 6) {
        alert('This team is already at full capacity (6/6 members).');
        await supabase
          .from('team_invitations')
          .update({ status: 'DECLINED' })
          .eq('id', invitation.id);
        fetchInvitations();
        setActionLoadingId(null);
        return;
      }

      // 3. Add to team_members
      const { error: joinErr } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          student_id: profile.id,
          member_role: 'Member'
        });

      if (joinErr) throw joinErr;

      // 4. Update this invitation to ACCEPTED
      await supabase
        .from('team_invitations')
        .update({ status: 'ACCEPTED' })
        .eq('id', invitation.id);

      // 5. Decline all other pending invitations for this student (SIH single-team policy)
      await supabase
        .from('team_invitations')
        .update({ status: 'DECLINED' })
        .eq('student_id', profile.id)
        .eq('status', 'PENDING');

      // 6. Notify Team Leader
      if (invitation.teams?.leader_id) {
        await sendNotification({
          userId: invitation.teams.leader_id,
          type: 'invite_accepted',
          title: 'Invitation Accepted! ',
          message: `${profile.full_name} accepted your team invitation and joined "${invitation.teams.team_name}"!`,
          metadata: { team_id: invitation.team_id }
        });
      }

      setToastMsg(`You have joined "${invitation.teams.team_name}"! `);
      if (onUpdate) onUpdate();
      setTimeout(() => navigate('/my-team'), 1200);
    } catch (err) {
      alert(`Error accepting invitation: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (invitation) => {
    setActionLoadingId(invitation.id);
    try {
      await supabase
        .from('team_invitations')
        .update({ status: 'DECLINED' })
        .eq('id', invitation.id);

      if (invitation.teams?.leader_id) {
        await sendNotification({
          userId: invitation.teams.leader_id,
          type: 'invite_declined',
          title: 'Invitation Declined',
          message: `${profile.full_name} declined the invitation to join team "${invitation.teams.team_name}".`,
          metadata: { team_id: invitation.team_id }
        });
      }

      fetchInvitations();
    } catch (err) {
      console.error('Error declining invitation:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="card"style={{
      marginBottom: '24px',
      border: '2px solid var(--orange)',
      background: 'linear-gradient(135deg, rgba(255,107,53,0.04) 0%, rgba(255,255,255,1) 100%)'
    }}>
      <div className="flex-between"style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '1.4rem',
            background: 'rgba(255,107,53,0.15)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--navy)' }}>Team Invitations ({invitations.length})</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              You have been invited by team leaders to join their SIH teams.
            </p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div style={{
          padding: '10px 14px',
          background: '#E8F5E9',
          color: '#2E7D32',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '14px',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {invitations.map(inv => (
          <div
            key={inv.id}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy)' }}>
                  {inv.teams?.team_name}
                </span>
                <span className="pill-badge status-open"style={{ fontSize: '0.72rem' }}>
                  Invited You
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                 Leader: <strong>{inv.teams?.leader?.full_name || 'Team Leader'}</strong>
                {inv.teams?.leader?.department && ` (${inv.teams.leader.department})`}
              </div>

              {inv.teams?.problem_statements ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--navy)', marginTop: '4px' }}>
                   <strong>[{inv.teams.problem_statements.ps_code}]</strong> {inv.teams.problem_statements.title}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                   Problem Statement: Not selected yet
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleDecline(inv)}
                disabled={actionLoadingId === inv.id}
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕ Decline
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleAccept(inv)}
                disabled={actionLoadingId === inv.id}
                style={{ minWidth: '140px', background: 'var(--green)', borderColor: 'var(--green)' }}
              >
                {actionLoadingId === inv.id ? 'Joining...' : 'Accept & Join'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
