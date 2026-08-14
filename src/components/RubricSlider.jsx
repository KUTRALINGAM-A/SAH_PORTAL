export default function RubricSlider({ label, value, max, onChange }) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="rubric-slider-group">
      <div className="rubric-slider-header">
        <span className="rubric-slider-label">{label}</span>
        <span className="rubric-slider-value">{value}/{max}</span>
      </div>
      <input
        type="range"
        className="rubric-slider"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--navy) 0%, var(--navy) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`
        }}
      />
      <div className="rubric-slider-range">
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
