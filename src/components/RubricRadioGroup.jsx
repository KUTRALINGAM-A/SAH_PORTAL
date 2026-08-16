export default function RubricRadioGroup({
  name,
  label,
  max = 5,
  value = null,
  onChange
}) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div
      className="rubric-radio-group"
      style={{
        marginBottom: '20px',
        padding: '16px 18px',
        background: 'var(--off-white)',
        border: `1px solid ${value !== null ? 'var(--navy-light)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
    >
      {/* Parameter Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <label
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '0.92rem',
            color: 'var(--navy)',
            cursor: 'default'
          }}
        >
          {label}
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}
          >
            Maximum <strong>{max}</strong> marks
          </span>

          <span
            className="pill-badge"
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              background: value !== null ? 'var(--navy)' : 'var(--border)',
              color: value !== null ? '#ffffff' : 'var(--text-secondary)',
              minWidth: '46px',
              textAlign: 'center'
            }}
          >
            {value !== null ? `${value}/${max}` : `—/${max}`}
          </span>
        </div>
      </div>

      {/* Horizontal Radio Options List */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center'
        }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((score) => {
          const isSelected = value === score;
          const inputId = `${name}-score-${score}`;

          return (
            <label
              key={score}
              htmlFor={inputId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? 'var(--navy)' : '#ffffff',
                color: isSelected ? '#ffffff' : 'var(--text-primary)',
                border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border)'}`,
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '0.86rem',
                fontWeight: isSelected ? 700 : 500,
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 6px rgba(27, 42, 74, 0.25)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--navy-light)';
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = '#ffffff';
                }
              }}
            >
              <input
                type="radio"
                id={inputId}
                name={name}
                value={score}
                checked={isSelected}
                onChange={() => onChange(score)}
                style={{
                  cursor: 'pointer',
                  accentColor: 'var(--orange)',
                  width: '14px',
                  height: '14px'
                }}
              />
              <span>{score}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
