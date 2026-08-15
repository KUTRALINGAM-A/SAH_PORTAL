export default function RoleSwitcher({ currentRole, onRoleChange, availableRoles }) {
  const roleLabels = {
    student: 'Student',
    admin: 'Admin',
    judge: 'Judge',
    spoc: 'SPOC'
  };

  return (
    <div className="role-switcher">
      {availableRoles.map(role => (
        <button
          key={role}
          className={`role-option ${currentRole === role ? 'active' : ''}`}
          onClick={() => onRoleChange(role)}
        >
          {roleLabels[role] || role}
        </button>
      ))}
    </div>
  );
}
