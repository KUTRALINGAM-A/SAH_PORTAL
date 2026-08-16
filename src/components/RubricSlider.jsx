export default function RubricSlider({ label, value, max, onChange }) {
  const handleKeyDown = (e) => {
    // Prevent decimal points, commas, exponent 'e', and +/- signs
    if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(0);
      return;
    }

    // Strip any non-digit character strictly
    const clean = raw.replace(/[^0-9]/g, '');
    if (!clean) {
      onChange(0);
      return;
    }

    const intVal = parseInt(clean, 10);
    if (isNaN(intVal)) {
      onChange(0);
    } else {
      // Strictly clamp integer between 0 and max allowed range
      const clamped = Math.min(max, Math.max(0, intVal));
      onChange(clamped);
    }
  };

  return (
    <div className="rubric-input-group" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="rubric-slider-label" style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>
          {label}
        </label>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Max: <strong>{max}</strong> pts
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="number"
          className="form-input"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: 'var(--navy)',
            textAlign: 'center',
            width: '95px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--border)'
          }}
          min={0}
          max={max}
          step={1}
          value={value === 0 ? '0' : value || ''}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          placeholder="0"
          required
        />
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Enter an integer score (<strong>0</strong> to <strong>{max}</strong>)
        </div>
      </div>
    </div>
  );
}
