export default function RubricNumberInput({
  label,
  value,
  max,
  onChange,
  placeholder = '0'
}) {
  const handleKeyDown = (e) => {
    // Allow control keys (Backspace, Tab, Delete, Arrow keys, Enter)
    if (
      [
        'Backspace',
        'Tab',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'Enter'
      ].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }

    // Disallow non-digits (decimals, letters, symbols, signs)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }

    // Strictly strip non-digits
    const clean = raw.replace(/[^0-9]/g, '');
    if (!clean) {
      onChange('');
      return;
    }

    const intVal = parseInt(clean, 10);
    if (isNaN(intVal)) {
      onChange('');
    } else {
      // Strictly clamp between 0 and max
      const clamped = Math.min(max, Math.max(0, intVal));
      onChange(clamped);
    }
  };

  return (
    <div
      className="rubric-number-group"
      style={{
        marginBottom: '18px',
        padding: '16px 18px',
        background: 'var(--off-white)',
        border: `1px solid ${value !== '' && value !== null ? 'var(--navy-light)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <label
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '0.92rem',
            color: 'var(--navy)'
          }}
        >
          {label}
        </label>
        <span
          className="pill-badge"
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            background: value !== '' && value !== null ? 'var(--navy)' : 'var(--border)',
            color: value !== '' && value !== null ? '#ffffff' : 'var(--text-secondary)'
          }}
        >
          {value !== '' && value !== null ? `${value} / ${max} marks` : `Max: ${max} marks`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="form-input rubric-plain-input"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: 'var(--navy)',
              textAlign: 'center',
              width: '95px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `2px solid ${value !== '' && value !== null ? 'var(--orange)' : 'var(--border)'}`,
              background: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              outline: 'none',
              appearance: 'none',
              MozAppearance: 'textfield',
              WebkitAppearance: 'none'
            }}
            value={value === '' || value === null || value === undefined ? '' : value}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={2}
          />
        </div>

        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Enter a whole number score (<strong>0</strong> to <strong>{max}</strong>)
        </div>
      </div>
    </div>
  );
}
