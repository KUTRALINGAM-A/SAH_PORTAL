import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { parseExcelFile, downloadTemplate } from '../../utils/excelParser';

export default function ProblemStatementsAdmin() {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchStatements();
  }, []);

  async function fetchStatements() {
    const { data } = await supabase.from('problem_statements').select('*').order('ps_code');
    setStatements(data || []);
    setLoading(false);
  }

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast('error', 'Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const parsed = await parseExcelFile(file);
      setPreview(parsed);
      showToast('success', `Parsed ${parsed.length} problem statements from "${file.name}"`);
    } catch (err) {
      showToast('error', `Parse error: ${err.message}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);

    try {
      const { error } = await supabase.from('problem_statements').upsert(preview, { onConflict: 'ps_code' });
      if (error) throw error;
      showToast('success', `Successfully uploaded ${preview.length} problem statements!`);
      setPreview(null);
      fetchStatements();
    } catch (err) {
      showToast('error', `Upload error: ${err.message}`);
    }

    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this problem statement?')) return;
    await supabase.from('problem_statements').delete().eq('id', id);
    fetchStatements();
    showToast('info', 'Problem statement deleted.');
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">📋 Problem Statements Manager</h1>
          <p className="page-subtitle">Upload, manage, and review all SAH 2026 problem statements</p>
        </div>
        <button className="btn btn-outline" onClick={downloadTemplate}>
          📥 Download Excel Template
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('excel-input').click()}
        style={{ marginBottom: '24px' }}
      >
        <div className="upload-icon">📤</div>
        <div className="upload-text">
          Drag & drop your Excel file here, or click to browse
        </div>
        <div className="upload-hint">
          Supported: .xlsx, .xls · Columns: PS Code, Title, Category, Organization, Domain, Description
        </div>
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3>📄 Preview ({preview.length} statements)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : `✅ Confirm Upload (${preview.length})`}
              </button>
            </div>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '400px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PS Code</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Organization</th>
                  <th>Domain</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((ps, i) => (
                  <tr key={i}>
                    <td><strong>{ps.ps_code}</strong></td>
                    <td>{ps.title}</td>
                    <td><span className={`pill-badge ${ps.category === 'Hardware' ? 'domain' : 'skill'}`}>{ps.category}</span></td>
                    <td>{ps.organization}</td>
                    <td>{ps.domain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing Statements */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h3>Existing Problem Statements ({statements.length})</h3>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PS Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Domain</th>
                <th>Organization</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {statements.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No problem statements yet. Upload an Excel file to get started.</td></tr>
              ) : (
                statements.map(ps => (
                  <tr key={ps.id}>
                    <td><strong>{ps.ps_code}</strong></td>
                    <td>{ps.title}</td>
                    <td><span className={`pill-badge ${ps.category === 'Hardware' ? 'domain' : 'skill'}`}>{ps.category}</span></td>
                    <td>{ps.domain}</td>
                    <td style={{ fontSize: '0.82rem' }}>{ps.organization}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(ps.id)} style={{ color: 'var(--red)' }}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
