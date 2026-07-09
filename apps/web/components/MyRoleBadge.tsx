'use client';

import { useEffect, useState } from 'react';
import type { RoleId } from '@mafia/shared';
import { ROLE_IMAGES } from '../lib/roleImages';

const REVEAL_MS = 5000;

export function MyRoleBadge({ roleId, onZoom }: { roleId: RoleId | null; onZoom: (roleId: RoleId) => void }) {
  const [revealing, setRevealing] = useState(false);

  // Deliberately has no "already played" ref guard: the effect only reruns
  // when `roleId` actually changes value (null -> assigned, once per game),
  // so the dependency array alone is enough. A ref guard here breaks under
  // React StrictMode's dev-mode double-invoke (its cleanup cancels the timer
  // on the first pass, and the guard then blocks the second pass from
  // scheduling a replacement, leaving `revealing` stuck true forever).
  useEffect(() => {
    if (!roleId) return;
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), REVEAL_MS);
    return () => clearTimeout(t);
  }, [roleId]);

  if (!roleId) return null;

  return (
    <>
      {revealing && <div className="role-reveal-backdrop" />}
      <div
        className={`my-role-badge ${revealing ? 'revealing' : ''}`}
        onClick={() => onZoom(roleId)}
        title="Виж картата си"
      >
        <img src={ROLE_IMAGES[roleId]} alt={roleId} />
      </div>
    </>
  );
}
