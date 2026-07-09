import type { RoleId } from '@mafia/shared';
import { ROLE_IMAGES } from '../lib/roleImages';

export function RoleZoomOverlay({ roleId, onClose }: { roleId: RoleId | null; onClose: () => void }) {
  if (!roleId) return null;
  return (
    <div className="role-zoom-backdrop" onClick={onClose}>
      <img
        src={ROLE_IMAGES[roleId]}
        alt={roleId}
        className="role-zoom-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
