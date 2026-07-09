import type { RoleId } from '@mafia/shared';
import { ROLE_IMAGES } from '../lib/roleImages';

export function GameHeader({
  roleDeck,
  onZoom,
  onLeave,
}: {
  roleDeck: RoleId[];
  onZoom: (roleId: RoleId) => void;
  onLeave: () => void;
}) {
  const mid = (roleDeck.length - 1) / 2;
  return (
    <div className="game-header">
      <div className="header-roles">
        {roleDeck.map((roleId, i) => (
          <img
            key={`${roleId}-${i}`}
            src={ROLE_IMAGES[roleId]}
            alt={roleId}
            className="header-role-thumb"
            style={{ transform: `rotate(${(i - mid) * 3}deg)`, zIndex: i }}
            onClick={() => onZoom(roleId)}
          />
        ))}
      </div>
      <button className="btn btn-secondary header-leave-btn" onClick={onLeave}>
        Напусни играта
      </button>
    </div>
  );
}
