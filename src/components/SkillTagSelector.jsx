import { useState, useMemo } from 'react';
import { SKILL_CATEGORIES } from '../data/skills';

export default function SkillTagSelector({ selectedSkills, onChange, maxSkills = 10 }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return SKILL_CATEGORIES;
    const term = searchTerm.toLowerCase();
    const filtered = {};
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      const matchedSkills = skills.filter(s => s.toLowerCase().includes(term));
      if (matchedSkills.length > 0) {
        filtered[category] = matchedSkills;
      }
    }
    return filtered;
  }, [searchTerm]);

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      onChange(selectedSkills.filter(s => s !== skill));
    } else if (selectedSkills.length < maxSkills) {
      onChange([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill) => {
    onChange(selectedSkills.filter(s => s !== skill));
  };

  return (
    <div className="skill-selector">
      <div className="selected-skills">
        {selectedSkills.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Select up to {maxSkills} skills...
          </span>
        )}
        {selectedSkills.map(skill => (
          <span key={skill} className="selected-skill">
            {skill}
            <button className="remove-skill"onClick={() => removeSkill(skill)}>×</button>
          </span>
        ))}
      </div>

      <input
        type="text"
        className="skill-search"
        placeholder="Search skills..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="skill-categories">
        {Object.entries(filteredCategories).map(([category, skills]) => (
          <div key={category}>
            <div className="skill-category-title">{category}</div>
            <div className="skill-options">
              {skills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`skill-option ${selectedSkills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {selectedSkills.length}/{maxSkills} skills selected
      </div>
    </div>
  );
}
