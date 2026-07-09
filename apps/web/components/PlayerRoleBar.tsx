import type { RoleId } from '@mafia/shared';
import { RoleCard } from './RoleCard';

export function PlayerRoleBar({ roleId }: { roleId: RoleId | null }) {
  if (!roleId) return null;
  return (
    <div className="player-bar">
      <RoleCard roleId={roleId} variant="full" />
    </div>
  );
}
