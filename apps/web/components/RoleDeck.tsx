import type { RoleId } from '@mafia/shared';
import { ROLE_IMAGES } from '../lib/roleImages';

export function RoleDeck({ roleDeck, onZoom }: { roleDeck: RoleId[]; onZoom: (roleId: RoleId) => void }) {
  if (roleDeck.length === 0) return null;
  const mid = (roleDeck.length - 1) / 2;

  return (
    <div className="role-deck-fan">
      {roleDeck.map((roleId, i) => (
        <img
          key={`${roleId}-${i}`}
          src={ROLE_IMAGES[roleId]}
          alt={roleId}
          className="role-thumb"
          style={{ transform: `rotate(${(i - mid) * 3}deg)`, zIndex: i }}
          onClick={() => onZoom(roleId)}
        />
      ))}
    </div>
  );
}
