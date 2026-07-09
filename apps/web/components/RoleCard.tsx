import { ROLES_BY_ID, type RoleId } from '@mafia/shared';

export function RoleCard({ roleId, variant = 'compact' }: { roleId: RoleId; variant?: 'compact' | 'full' }) {
  const role = ROLES_BY_ID[roleId];
  return (
    <div className={`role-card ${variant}`} style={{ ['--role-color' as string]: role.color }}>
      <div className="icon">{role.icon}</div>
      <div>
        <div className="name">{role.name}</div>
        {variant === 'full' && <div className="desc">{role.description}</div>}
      </div>
    </div>
  );
}
