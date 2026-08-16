import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function JudgePanelsAdmin() {
  const { profile } = useAuth();
  const [panels, setPanels] = useState([]);
  const [judges, setJudges] = useState([]);
  const [problemStatements, setProblemStatements] = useState([]);
  const [panelJudges, setPanelJudges] = useState([]); // { panel_id, judge_id }
  const [panelPS, setPanelPS] = useState([]); // { panel_id, ps_id }
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [psModalPanel, setPsModalPanel] = useState(null);
  const [deletingPanel, setDeletingPanel] = useState(null);

  // Form State for Create / Edit
  const [formName, setFormName] = useState('');
  const [formJudgeIds, setFormJudgeIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Form State for PS Assignment Modal
  const [assignedPsIds, setAssignedPsIds] = useState(new Set());
  const [psSearch, setPsSearch] = useState('');
  const [psCategoryFilter, setPsCategoryFilter] = useState('');
  const [savingPs, setSavingPs] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [
        panelsRes,
        judgesRes,
        psRes,
        panelJudgesRes,
        panelPsRes
      ] = await Promise.all([
        supabase.from('judge_panels').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('role', 'judge').order('full_name', { ascending: true }),
        supabase.from('problem_statements').select('*').order('ps_code', { ascending: true }),
        supabase.from('panel_judges').select('*'),
        supabase.from('panel_problem_statements').select('*')
      ]);

      if (panelsRes.error) {
        if (
          panelsRes.error.code === 'PGRST205' ||
          panelsRes.error.code === '42P01' ||
          panelsRes.error.message?.toLowerCase().includes('schema cache') ||
          panelsRes.error.message?.toLowerCase().includes('not find the table')
        ) {
          setSchemaMissing(true);
        } else {
          showToast('error', panelsRes.error.message);
        }
      } else {
        setSchemaMissing(false);
      }

      setPanels(panelsRes.data || []);
      setJudges(judgesRes.data || []);
      setProblemStatements(psRes.data || []);
      setPanelJudges(panelJudgesRes.data || []);
      setPanelPS(panelPsRes.data || []);
    } catch (err) {
      console.error('Error fetching panel data:', err);
      if (err.message?.includes('schema cache') || err.message?.includes('not find the table')) {
        setSchemaMissing(true);
      } else {
        showToast('error', 'Failed to load judge panels data.');
      }
    } finally {
      setLoading(false);
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Helper mappings
  const judgesMap = useMemo(() => {
    const map = {};
    judges.forEach(j => { map[j.id] = j; });
    return map;
  }, [judges]);

  const psMap = useMemo(() => {
    const map = {};
    problemStatements.forEach(ps => { map[ps.id] = ps; });
    return map;
  }, [problemStatements]);

  // Map each problem statement to which panel it is currently assigned to
  const psToPanelMap = useMemo(() => {
    const map = {};
    panelPS.forEach(item => {
      map[item.ps_id] = item.panel_id;
    });
    return map;
  }, [panelPS]);

  // Aggregate panels with their judges and PS
  const aggregatedPanels = useMemo(() => {
    return panels.map(panel => {
      const pJudges = panelJudges
        .filter(pj => pj.panel_id === panel.id)
        .map(pj => judgesMap[pj.judge_id])
        .filter(Boolean);

      const pPS = panelPS
        .filter(pps => pps.panel_id === panel.id)
        .map(pps => psMap[pps.ps_id])
        .filter(Boolean);

      return {
        ...panel,
        judgesList: pJudges,
        psList: pPS
      };
    });
  }, [panels, panelJudges, panelPS, judgesMap, psMap]);

  const filteredPanels = useMemo(() => {
    if (!search.trim()) return aggregatedPanels;
    const term = search.toLowerCase();
    return aggregatedPanels.filter(panel => {
      if (panel.name.toLowerCase().includes(term)) return true;
      const judgeMatch = panel.judgesList.some(j =>
        j.full_name?.toLowerCase().includes(term) ||
        j.email?.toLowerCase().includes(term) ||
        j.department?.toLowerCase().includes(term)
      );
      if (judgeMatch) return true;
      const psMatch = panel.psList.some(ps =>
        ps.ps_code?.toLowerCase().includes(term) ||
        ps.title?.toLowerCase().includes(term)
      );
      return psMatch;
    });
  }, [aggregatedPanels, search]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setFormName('');
    setFormJudgeIds([]);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (panel) => {
    setEditingPanel(panel);
    setFormName(panel.name);
    setFormJudgeIds(panel.judgesList.map(j => j.id));
  };

  const handleToggleJudge = (judgeId) => {
    if (formJudgeIds.includes(judgeId)) {
      setFormJudgeIds(formJudgeIds.filter(id => id !== judgeId));
    } else {
      if (formJudgeIds.length >= 3) {
        showToast('error', 'A panel can have a maximum of 3 judges.');
        return;
      }
      setFormJudgeIds([...formJudgeIds, judgeId]);
    }
  };

  const handleSavePanel = async (e) => {
    e.preventDefault();
    const cleanName = formName.trim();

    if (!cleanName) {
      showToast('error', 'Please enter a panel name.');
      return;
    }

    if (formJudgeIds.length < 2 || formJudgeIds.length > 3) {
      showToast('error', 'A panel must have exactly 2 or 3 judges.');
      return;
    }

    setSaving(true);
    try {
      if (editingPanel) {
        // 1. Update Panel Name
        const { error: updateErr } = await supabase
          .from('judge_panels')
          .update({ name: cleanName })
          .eq('id', editingPanel.id);

        if (updateErr) throw updateErr;

        // 2. Delete existing panel_judges
        const { error: delErr } = await supabase
          .from('panel_judges')
          .delete()
          .eq('panel_id', editingPanel.id);

        if (delErr) throw delErr;

        // 3. Insert new panel_judges
        const newJudgeRows = formJudgeIds.map(judgeId => ({
          panel_id: editingPanel.id,
          judge_id: judgeId
        }));

        const { error: insertErr } = await supabase
          .from('panel_judges')
          .insert(newJudgeRows);

        if (insertErr) throw insertErr;

        showToast('success', `Panel "${cleanName}" updated successfully!`);
        setEditingPanel(null);
      } else {
        // Create new panel
        const { data: createdPanel, error: createErr } = await supabase
          .from('judge_panels')
          .insert({
            name: cleanName,
            created_by: profile?.id || null
          })
          .select()
          .single();

        if (createErr) throw createErr;

        // Insert judges for panel
        const newJudgeRows = formJudgeIds.map(judgeId => ({
          panel_id: createdPanel.id,
          judge_id: judgeId
        }));

        const { error: insertErr } = await supabase
          .from('panel_judges')
          .insert(newJudgeRows);

        if (insertErr) throw insertErr;

        showToast('success', `Panel "${cleanName}" created with ${formJudgeIds.length} judges!`);
        setShowCreateModal(false);
      }

      await fetchAllData();
    } catch (err) {
      console.error('Save panel error:', err);
      showToast('error', err.message || 'Failed to save panel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePanel = async () => {
    if (!deletingPanel) return;
    setSaving(true);
    try {
      // Deleting the judge_panel will cascade delete panel_judges and panel_problem_statements
      // Problem statements and judge profiles are strictly preserved!
      const { error } = await supabase
        .from('judge_panels')
        .delete()
        .eq('id', deletingPanel.id);

      if (error) throw error;

      showToast('success', `Panel "${deletingPanel.name}" deleted successfully.`);
      setDeletingPanel(null);
      await fetchAllData();
    } catch (err) {
      console.error('Delete panel error:', err);
      showToast('error', err.message || 'Failed to delete panel.');
    } finally {
      setSaving(false);
    }
  };

  // Problem Statement Assignment Modal Handlers
  const handleOpenPsModal = (panel) => {
    setPsModalPanel(panel);
    const currentAssigned = new Set(
      panelPS.filter(pps => pps.panel_id === panel.id).map(pps => pps.ps_id)
    );
    setAssignedPsIds(currentAssigned);
    setPsSearch('');
    setPsCategoryFilter('');
  };

  const handleTogglePs = (psId) => {
    const next = new Set(assignedPsIds);
    if (next.has(psId)) {
      next.delete(psId);
    } else {
      next.add(psId);
    }
    setAssignedPsIds(next);
  };

  const handleSelectAllFilteredPs = (filteredList) => {
    const next = new Set(assignedPsIds);
    filteredList.forEach(ps => next.add(ps.id));
    setAssignedPsIds(next);
  };

  const handleDeselectAllFilteredPs = (filteredList) => {
    const next = new Set(assignedPsIds);
    filteredList.forEach(ps => next.delete(ps.id));
    setAssignedPsIds(next);
  };

  const handleSavePsAssignments = async () => {
    if (!psModalPanel) return;
    setSavingPs(true);
    try {
      // 1. Delete all current PS assignments for this panel
      const { error: delErr } = await supabase
        .from('panel_problem_statements')
        .delete()
        .eq('panel_id', psModalPanel.id);

      if (delErr) throw delErr;

      // 2. Also remove any of the newly selected PS from any OTHER panel to respect the one-panel-per-PS rule
      const selectedArray = Array.from(assignedPsIds);
      if (selectedArray.length > 0) {
        // Remove those PS from other panels first
        await supabase
          .from('panel_problem_statements')
          .delete()
          .in('ps_id', selectedArray);

        // 3. Insert new assignments for this panel
        const newRows = selectedArray.map(psId => ({
          panel_id: psModalPanel.id,
          ps_id: psId
        }));

        const { error: insertErr } = await supabase
          .from('panel_problem_statements')
          .insert(newRows);

        if (insertErr) throw insertErr;
      }

      showToast('success', `Assigned ${selectedArray.length} problem statements to "${psModalPanel.name}"!`);
      setPsModalPanel(null);
      await fetchAllData();
    } catch (err) {
      console.error('Save PS assignments error:', err);
      showToast('error', err.message || 'Failed to update problem statement assignments.');
    } finally {
      setSavingPs(false);
    }
  };

  const filteredProblemStatements = useMemo(() => {
    return problemStatements.filter(ps => {
      if (psSearch) {
        const term = psSearch.toLowerCase();
        if (!ps.ps_code.toLowerCase().includes(term) && !ps.title.toLowerCase().includes(term) && !ps.domain.toLowerCase().includes(term)) return false;
      }
      if (psCategoryFilter && ps.category !== psCategoryFilter) return false;
      return true;
    });
  }, [problemStatements, psSearch, psCategoryFilter]);

  // Overall Stats
  const assignedJudgeIdSet = new Set(panelJudges.map(pj => pj.judge_id));
  const assignedPsIdSet = new Set(panelPS.map(pps => pps.ps_id));
  const unassignedPsCount = problemStatements.length - assignedPsIdSet.size;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999 }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Judge Panels Management</h1>
          <p className="page-subtitle">
            Create panels with 2–3 judges, assign problem statements, and control evaluation scopes
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
          onClick={handleOpenCreateModal}
          disabled={judges.length < 2}
          title={judges.length < 2 ? 'At least 2 registered judges are required to create a panel' : ''}
        >
          + Create Panel
        </button>
      </div>

      {/* Schema Missing Warning & 1-Click SQL Setup Card */}
      {schemaMissing && (
        <div className="card" style={{
          padding: '24px',
          marginBottom: '28px',
          background: '#FFFBEB',
          border: '2px solid #F59E0B',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#92400E', fontSize: '1.15rem' }}>
              Database Setup Required in Supabase
            </h3>
          </div>
          <p style={{ color: '#78350F', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>
            The <code>judge_panels</code> table has not been created in your Supabase project yet.
            <br />
            To activate this feature, go to your <strong>Supabase Dashboard → SQL Editor</strong>, paste and run the SQL query below:
          </p>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <pre style={{
              background: '#1E293B',
              color: '#F8FAFC',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              overflowX: 'auto',
              maxHeight: '220px',
              fontFamily: 'monospace'
            }}>
{`-- Create Judge Panels Tables
CREATE TABLE IF NOT EXISTS judge_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_judges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID REFERENCES judge_panels(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(panel_id, judge_id)
);

CREATE TABLE IF NOT EXISTS panel_problem_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID REFERENCES judge_panels(id) ON DELETE CASCADE NOT NULL,
    ps_id UUID REFERENCES problem_statements(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ps_id)
);

ALTER TABLE judge_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_problem_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read judge_panels" ON judge_panels FOR SELECT USING (true);
CREATE POLICY "Admin insert judge_panels" ON judge_panels FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update judge_panels" ON judge_panels FOR UPDATE USING (true);
CREATE POLICY "Admin delete judge_panels" ON judge_panels FOR DELETE USING (true);

CREATE POLICY "Read panel_judges" ON panel_judges FOR SELECT USING (true);
CREATE POLICY "Admin insert panel_judges" ON panel_judges FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update panel_judges" ON panel_judges FOR UPDATE USING (true);
CREATE POLICY "Admin delete panel_judges" ON panel_judges FOR DELETE USING (true);

CREATE POLICY "Read panel_problem_statements" ON panel_problem_statements FOR SELECT USING (true);
CREATE POLICY "Admin insert panel_problem_statements" ON panel_problem_statements FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update panel_problem_statements" ON panel_problem_statements FOR UPDATE USING (true);
CREATE POLICY "Admin delete panel_problem_statements" ON panel_problem_statements FOR DELETE USING (true);`}
            </pre>
            <button
              className="btn btn-sm btn-navy"
              style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.75rem' }}
              onClick={() => {
                const sqlText = `-- Create Judge Panels Tables
CREATE TABLE IF NOT EXISTS judge_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_judges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID REFERENCES judge_panels(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(panel_id, judge_id)
);

CREATE TABLE IF NOT EXISTS panel_problem_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID REFERENCES judge_panels(id) ON DELETE CASCADE NOT NULL,
    ps_id UUID REFERENCES problem_statements(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ps_id)
);

ALTER TABLE judge_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_problem_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read judge_panels" ON judge_panels FOR SELECT USING (true);
CREATE POLICY "Admin insert judge_panels" ON judge_panels FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update judge_panels" ON judge_panels FOR UPDATE USING (true);
CREATE POLICY "Admin delete judge_panels" ON judge_panels FOR DELETE USING (true);

CREATE POLICY "Read panel_judges" ON panel_judges FOR SELECT USING (true);
CREATE POLICY "Admin insert panel_judges" ON panel_judges FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update panel_judges" ON panel_judges FOR UPDATE USING (true);
CREATE POLICY "Admin delete panel_judges" ON panel_judges FOR DELETE USING (true);

CREATE POLICY "Read panel_problem_statements" ON panel_problem_statements FOR SELECT USING (true);
CREATE POLICY "Admin insert panel_problem_statements" ON panel_problem_statements FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update panel_problem_statements" ON panel_problem_statements FOR UPDATE USING (true);
CREATE POLICY "Admin delete panel_problem_statements" ON panel_problem_statements FOR DELETE USING (true);`;
                navigator.clipboard.writeText(sqlText);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 3000);
              }}
            >
              {copiedSql ? '✓ Copied SQL!' : 'Copy SQL'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={fetchAllData}>
              ↻ Refresh & Check Again
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              Open Supabase Dashboard ↗
            </a>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-row" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-number">{panels.length}</div>
          <div className="stat-label">Total Panels</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--orange)' }}>
            {assignedJudgeIdSet.size} / {judges.length}
          </div>
          <div className="stat-label">Judges in Panels</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--green)' }}>
            {assignedPsIdSet.size} / {problemStatements.length}
          </div>
          <div className="stat-label">Assigned Problem Statements</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: unassignedPsCount > 0 ? '#B45309' : 'var(--text-secondary)' }}>
            {unassignedPsCount}
          </div>
          <div className="stat-label">Unassigned Problems</div>
        </div>
      </div>

      {/* Warning if fewer than 2 judges exist in system */}
      {judges.length < 2 && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#92400E',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span>
          <div>
            <strong>Insufficient Judges Registered:</strong> There are currently only {judges.length} registered judge(s). A minimum of 2 judges is required to form a panel.
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px' }}>
        <input
          className="search-input"
          placeholder="Search panels by name, judge name, or problem statement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
            Clear
          </button>
        )}
      </div>

      {/* Panels Display */}
      {filteredPanels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚖️</div>
          <h3 style={{ marginBottom: '8px' }}>
            {panels.length === 0 ? 'No Judge Panels Created Yet' : 'No Panels Match Your Search'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
            {panels.length === 0
              ? 'Organize evaluation teams by creating panels with 2 to 3 judges and assigning relevant problem statements.'
              : 'Try clearing your search query to see all panels.'}
          </p>
          {panels.length === 0 && judges.length >= 2 && (
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 16px', fontSize: '0.84rem' }}
              onClick={handleOpenCreateModal}
            >
              + Create First Panel
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredPanels.map(panel => {
            const judgeCount = panel.judgesList.length;
            const isJudgeCountValid = judgeCount >= 2 && judgeCount <= 3;

            return (
              <div key={panel.id} className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-light)' }}>
                <div>
                  {/* Panel Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 700 }}>
                        {panel.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Created {new Date(panel.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className="pill-badge"
                      style={{
                        background: isJudgeCountValid ? '#E8F5E9' : '#FFEBEE',
                        color: isJudgeCountValid ? 'var(--green)' : 'var(--red)',
                        fontWeight: 600
                      }}
                    >
                      {judgeCount} / 3 Judges
                    </span>
                  </div>

                  {/* Judges List */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Assigned Judges ({judgeCount})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {panel.judgesList.map(j => (
                        <div
                          key={j.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            background: 'var(--off-white)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--navy)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            flexShrink: 0
                          }}>
                            {j.full_name?.slice(0, 2).toUpperCase() || 'JD'}
                          </div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--navy)' }}>{j.full_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{j.department || 'Judge'} · {j.email}</div>
                          </div>
                        </div>
                      ))}
                      {judgeCount === 0 && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--red)', fontStyle: 'italic' }}>
                          No judges assigned (Panel invalid — minimum 2 required).
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Problem Statements */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Assigned Problem Statements ({panel.psList.length})
                      </div>
                    </div>
                    {panel.psList.length === 0 ? (
                      <div style={{
                        padding: '10px 12px',
                        background: '#FFFBEB',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed #FDE68A',
                        color: '#92400E',
                        fontSize: '0.8rem'
                      }}>
                        No problem statements assigned yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {panel.psList.map(ps => (
                          <span
                            key={ps.id}
                            className="pill-badge"
                            style={{
                              background: ps.category === 'Hardware' ? '#EDE9FE' : '#E0F2FE',
                              color: ps.category === 'Hardware' ? '#6D28D9' : '#0369A1',
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={`${ps.ps_code}: ${ps.title} (${ps.domain})`}
                          >
                            <strong>{ps.ps_code}</strong>: {ps.title?.slice(0, 20)}...
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border-light)',
                  flexWrap: 'wrap'
                }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, minWidth: '130px', fontSize: '0.78rem' }}
                    onClick={() => handleOpenPsModal(panel)}
                  >
                    Assign Problems ({panel.psList.length})
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => handleOpenEditModal(panel)}
                  >
                    Edit Panel
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', fontSize: '0.78rem' }}
                    onClick={() => setDeletingPanel(panel)}
                    title="Delete Panel"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PANEL MODAL */}
      {showCreateModal && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !saving && setShowCreateModal(false)}>
          <div
            className="modal-card modal-card-top"
            style={{ maxWidth: '580px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create New Judge Panel</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
                style={{ fontSize: '1.2rem', padding: '0 6px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePanel}>
              {/* Panel Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Panel Name / Identifier *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Panel 1, Panel Alpha, AI & Robotics Panel"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Strict 2-3 Judges Selector */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    Select Judges (Exactly 2 or 3) *
                  </label>
                  <span
                    className="pill-badge"
                    style={{
                      background: formJudgeIds.length >= 2 && formJudgeIds.length <= 3 ? '#E8F5E9' : '#FEF3C7',
                      color: formJudgeIds.length >= 2 && formJudgeIds.length <= 3 ? 'var(--green)' : '#B45309',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    {formJudgeIds.length} / 3 Selected — {
                      formJudgeIds.length === 0 ? 'Select at least 2 judges' :
                      formJudgeIds.length === 1 ? 'Select 1 more judge' :
                      formJudgeIds.length === 2 ? 'Valid (Min 2 reached)' :
                      'Valid (Max 3 reached)'
                    }
                  </span>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  background: '#FAFAFA'
                }}>
                  {judges.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No users with the "Judge" role found.
                    </div>
                  ) : (
                    judges.map(judge => {
                      const isSelected = formJudgeIds.includes(judge.id);
                      const isAssignedElsewhere = panelJudges.some(pj => pj.judge_id === judge.id);

                      return (
                        <div
                          key={judge.id}
                          onClick={() => handleToggleJudge(judge.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            marginBottom: '6px',
                            background: isSelected ? '#E0F2FE' : '#FFFFFF',
                            border: isSelected ? '1px solid #0284C7' : '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container onClick
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy)' }}>
                                {judge.full_name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                {judge.department || 'Judge'} · {judge.email}
                              </div>
                            </div>
                          </div>

                          {isAssignedElsewhere && !isSelected && (
                            <span className="pill-badge" style={{ fontSize: '0.68rem', background: '#F1F5F9', color: '#64748B' }}>
                              In another panel
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !formName.trim() || formJudgeIds.length < 2 || formJudgeIds.length > 3}
                >
                  {saving ? 'Creating Panel...' : 'Create Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PANEL & MANAGE JUDGES MODAL */}
      {editingPanel && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !saving && setEditingPanel(null)}>
          <div
            className="modal-card modal-card-top"
            style={{ maxWidth: '580px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Panel & Judges</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingPanel(null)}
                disabled={saving}
                style={{ fontSize: '1.2rem', padding: '0 6px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePanel}>
              {/* Panel Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Panel Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Strict 2-3 Judges Selector */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    Select Judges (Exactly 2 or 3) *
                  </label>
                  <span
                    className="pill-badge"
                    style={{
                      background: formJudgeIds.length >= 2 && formJudgeIds.length <= 3 ? '#E8F5E9' : '#FEF3C7',
                      color: formJudgeIds.length >= 2 && formJudgeIds.length <= 3 ? 'var(--green)' : '#B45309',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    {formJudgeIds.length} / 3 Selected — {
                      formJudgeIds.length === 0 ? 'Select at least 2 judges' :
                      formJudgeIds.length === 1 ? 'Select 1 more judge' :
                      formJudgeIds.length === 2 ? 'Valid (Min 2 reached)' :
                      'Valid (Max 3 reached)'
                    }
                  </span>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  background: '#FAFAFA'
                }}>
                  {judges.map(judge => {
                    const isSelected = formJudgeIds.includes(judge.id);
                    return (
                      <div
                        key={judge.id}
                        onClick={() => handleToggleJudge(judge.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          marginBottom: '6px',
                          background: isSelected ? '#E0F2FE' : '#FFFFFF',
                          border: isSelected ? '1px solid #0284C7' : '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy)' }}>
                              {judge.full_name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {judge.department || 'Judge'} · {judge.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingPanel(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !formName.trim() || formJudgeIds.length < 2 || formJudgeIds.length > 3}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN PROBLEM STATEMENTS MODAL */}
      {psModalPanel && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !savingPs && setPsModalPanel(null)}>
          <div
            className="modal-card modal-card-top"
            style={{ maxWidth: '720px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                  Assign Problem Statements to {psModalPanel.name}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Each problem statement can belong to only one judge panel.
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPsModalPanel(null)}
                disabled={savingPs}
                style={{ fontSize: '1.2rem', padding: '0 6px' }}
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                className="search-input"
                style={{ flex: 1, minWidth: '200px' }}
                placeholder="Search problem statements..."
                value={psSearch}
                onChange={(e) => setPsSearch(e.target.value)}
              />
              <select
                className="filter-select"
                value={psCategoryFilter}
                onChange={(e) => setPsCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            {/* Quick Bulk Selection Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.82rem' }}>
              <div>
                <strong>{assignedPsIds.size}</strong> problem statement(s) selected for this panel
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                  onClick={() => handleSelectAllFilteredPs(filteredProblemStatements)}
                >
                  Select All Filtered
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                  onClick={() => handleDeselectAllFilteredPs(filteredProblemStatements)}
                >
                  Deselect All Filtered
                </button>
              </div>
            </div>

            {/* Problem Statements Checklist */}
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px',
              background: '#FAFAFA'
            }}>
              {filteredProblemStatements.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  No problem statements found matching criteria.
                </div>
              ) : (
                filteredProblemStatements.map(ps => {
                  const isAssignedToThis = assignedPsIds.has(ps.id);
                  const otherPanelId = psToPanelMap[ps.id];
                  const isAssignedToOther = otherPanelId && otherPanelId !== psModalPanel.id;
                  const otherPanelObj = isAssignedToOther ? panels.find(p => p.id === otherPanelId) : null;

                  return (
                    <div
                      key={ps.id}
                      onClick={() => handleTogglePs(ps.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        marginBottom: '6px',
                        background: isAssignedToThis ? '#E0F2FE' : '#FFFFFF',
                        border: isAssignedToThis ? '1px solid #0284C7' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isAssignedToThis}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--navy)', fontSize: '0.88rem' }}>{ps.ps_code}</strong>
                            <span
                              className="pill-badge"
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                background: ps.category === 'Hardware' ? '#EDE9FE' : '#E0F2FE',
                                color: ps.category === 'Hardware' ? '#6D28D9' : '#0369A1'
                              }}
                            >
                              {ps.category}
                            </span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                              · {ps.domain}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {ps.title}
                          </div>
                        </div>
                      </div>

                      {isAssignedToOther && !isAssignedToThis && (
                        <span
                          className="pill-badge"
                          style={{
                            fontSize: '0.7rem',
                            background: '#FEF3C7',
                            color: '#92400E',
                            flexShrink: 0
                          }}
                          title="Selecting this will reassign it from its current panel"
                        >
                          In {otherPanelObj?.name || 'Another Panel'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPsModalPanel(null)}
                disabled={savingPs}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePsAssignments}
                disabled={savingPs}
              >
                {savingPs ? 'Saving Assignments...' : `Save Assignments (${assignedPsIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPanel && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !saving && setDeletingPanel(null)}>
          <div
            className="modal-card modal-card-top"
            style={{ maxWidth: '480px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--red)' }}>
              <span style={{ fontSize: '1.6rem' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--navy)' }}>Delete Judge Panel?</h2>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{deletingPanel.name}</strong>?
              <br /><br />
              This will remove the panel and its judge & problem statement assignments.
              <br />
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                ✓ Judge user accounts, Problem Statements, Teams, and Evaluation scores will NOT be deleted.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setDeletingPanel(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={handleDeletePanel}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
