import type { RoleId } from '@mafia/shared';
import { ROLE_IMAGES } from '../lib/roleImages';

export function RoleCard({ roleId }: { roleId: RoleId }) {
  return <img src={ROLE_IMAGES[roleId]} alt={roleId} className="role-card-img" />;
}
