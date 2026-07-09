import type { RoleId } from '@mafia/shared';
import { RoleCard } from './RoleCard';

export function RoleDeck({ roleDeck }: { roleDeck: RoleId[] }) {
  if (roleDeck.length === 0) return null;
  return (
    <div className="role-deck">
      {roleDeck.map((roleId, i) => (
        <RoleCard key={`${roleId}-${i}`} roleId={roleId} variant="compact" />
      ))}
    </div>
  );
}
