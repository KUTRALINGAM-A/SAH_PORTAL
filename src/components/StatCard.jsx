export default function StatCard({ number, label, accent = false, onClick, active = false, hint }) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`stat-card ${accent ? 'orange-accent' : ''} ${active ? 'active-card' : ''}`}
      onClick={onClick}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        border: active ? '2px solid var(--orange)' : '1px solid rgba(255,255,255,0.08)',
        userSelect: 'none'
      }}
      title={isClickable ? (hint || `Click to view details for ${label}`) : undefined}
      onMouseOver={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.4)';
        }
      }}
      onMouseOut={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
      {isClickable && (
        <div style={{
          fontSize: '0.68rem',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '6px',
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <span>👆 View details</span>
        </div>
      )}
    </div>
  );
}
