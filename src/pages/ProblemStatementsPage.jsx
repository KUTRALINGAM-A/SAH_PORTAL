import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';

export default function ProblemStatementsPage() {
  const { profile } = useAuth();
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [judgePanelName, setJudgePanelName] = useState(null);
  const [judgePanelAssigned, setJudgePanelAssigned] = useState(true);

  const isJudge = profile?.role === 'judge';

  useEffect(() => {
    fetchProblemStatements();
  }, [profile]);

  async function fetchProblemStatements() {
    setLoading(true);
    try {
      if (isJudge && profile?.id) {
        // Fetch judge's assigned panel
        const { data: pjData } = await supabase
          .from('panel_judges')
          .select('panel_id, judge_panels(name)')
          .eq('judge_id', profile.id)
          .limit(1)
          .single();

        if (pjData?.panel_id) {
          setJudgePanelName(pjData.judge_panels?.name || 'Assigned Panel');
          setJudgePanelAssigned(true);

          // Fetch only problem statement IDs assigned to this panel
          const { data: panelPsData } = await supabase
            .from('panel_problem_statements')
            .select('ps_id')
            .eq('panel_id', pjData.panel_id);

          const psIds = (panelPsData || []).map(pps => pps.ps_id);

          if (psIds.length > 0) {
            const { data: psData } = await supabase
              .from('problem_statements')
              .select('*')
              .in('id', psIds)
              .order('ps_code');

            setStatements(psData || []);
          } else {
            setStatements([]);
          }
        } else {
          setJudgePanelAssigned(false);
          setStatements([]);
        }
      } else {
        // Admin, SPOC, Student, or Public: Fetch all
        const { data } = await supabase
          .from('problem_statements')
          .select('*')
          .order('ps_code');

        setStatements(data || []);
      }
    } catch (err) {
      console.error('Error loading problem statements:', err);
      setStatements([]);
    } finally {
      setLoading(false);
    }
  }

  const domains = useMemo(() => {
    const set = new Set(statements.map(s => s.domain));
    return [...set].sort();
  }, [statements]);

  const filtered = useMemo(() => {
    return statements.filter(ps => {
      if (search) {
        const term = search.toLowerCase();
        if (!ps.ps_code.toLowerCase().includes(term) && !ps.title.toLowerCase().includes(term) && !ps.organization.toLowerCase().includes(term)) return false;
      }
      if (categoryFilter && ps.category !== categoryFilter) return false;
      if (domainFilter && ps.domain !== domainFilter) return false;
      return true;
    });
  }, [statements, search, categoryFilter, domainFilter]);

  const hwCount = statements.filter(s => s.category === 'Hardware').length;
  const swCount = statements.filter(s => s.category === 'Software').length;

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="hero-banner">
        <h1>{isJudge ? `Problem Statements (${judgePanelName || 'Panel Scope'})` : 'Problem Statements'}</h1>
        <p>
          {isJudge
            ? judgePanelAssigned
              ? `Displaying problem statements exclusively assigned to your panel: ${judgePanelName}`
              : 'You have not been assigned to a Judge Panel yet. Please contact an Admin.'
            : 'Browse all problem statements for Smart Amrita Hackathon 2026'}
        </p>
      </div>

      {isJudge && !judgePanelAssigned && (
        <div style={{
          padding: '16px 20px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 'var(--radius-md)',
          color: '#92400E',
          marginBottom: '24px',
          fontSize: '0.92rem'
        }}>
          You have not been assigned to a Judge Panel yet. Please contact an Admin to be assigned to a panel and view your allocated problem statements.
        </div>
      )}

      <div className="stats-row"style={{ marginBottom: '24px' }}>
        <StatCard number={statements.length} label="Total Problem Statements" />
        <StatCard number={hwCount} label="Hardware"accent />
        <StatCard number={swCount} label="Software"accent />
        <StatCard number={domains.length} label="Domains" />
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by PS code, title, or organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select"value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Software">Software</option>
          <option value="Hardware">Hardware</option>
        </select>
        <select className="filter-select"value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
          <option value="">All Domains</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="card"style={{ padding: 0, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>PS Code</th>
              <th>Title</th>
              <th>Category</th>
              <th>Domain</th>
              <th>Organization</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5"style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No problem statements found.</td></tr>
            ) : (
              filtered.map(ps => (
                <tr key={ps.id}>
                  <td><strong>{ps.ps_code}</strong></td>
                  <td>{ps.title}</td>
                  <td>
                    <span className={`pill-badge ${ps.category === 'Hardware' ? 'domain' : 'skill'}`}>
                      {ps.category}
                    </span>
                  </td>
                  <td>{ps.domain}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ps.organization}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
