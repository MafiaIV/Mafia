'use client';

import { ROLES, type RoleDistribution, type RoomStateSummary } from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { Avatar } from './Avatar';

export function Lobby({ roomState, myPlayerId }: { roomState: RoomStateSummary; myPlayerId: string }) {
  const isHost = roomState.hostId === myPlayerId;
  const distribution = roomState.config.distribution;
  const total = Object.values(distribution).reduce((a, b) => a + (b ?? 0), 0);
  const playerCount = roomState.players.length;
  const canStart = isHost && total === playerCount && playerCount >= 5;

  function updateCount(roleId: string, count: number) {
    const next: RoleDistribution = { ...distribution, [roleId]: Math.max(0, count) };
    getSocket().emit('room:updateConfig', { distribution: next });
  }

  return (
    <div className="section">
      <h2>Чакалня</h2>
      <p className="hint">Сподели кода със останалите играчи.</p>
      <div className="room-code">{roomState.code}</div>

      <div className="player-list">
        {roomState.players.map((p) => (
          <div className="player-row" key={p.id}>
            <Avatar seed={p.avatarSeed} name={p.name} />
            <div className="meta">
              <div className="name">{p.name}</div>
            </div>
            {p.isHost && <span className="badge host">домакин</span>}
            <span className={`dot ${p.connected ? 'online' : 'offline'}`} />
          </div>
        ))}
      </div>

      <h2>Роли ({total}/{playerCount})</h2>
      {isHost ? (
        <p className="hint">Коригирай броя на всяка роля преди старт.</p>
      ) : (
        <p className="hint">Домакинът избира ролите. Изчакай да стартира играта.</p>
      )}
      <div className="dist-grid">
        {ROLES.map((role) => (
          <div key={role.id} style={{ display: 'contents' }}>
            <div className="role-label">
              <span>{role.icon}</span>
              <span>{role.name}</span>
            </div>
            <input
              type="number"
              min={0}
              max={playerCount}
              disabled={!isHost}
              value={distribution[role.id] ?? 0}
              onChange={(e) => updateCount(role.id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      {isHost ? (
        <button className="btn btn-primary" disabled={!canStart} onClick={() => getSocket().emit('room:start')}>
          {playerCount < 5 ? 'Нужни са поне 5 играчи' : total !== playerCount ? 'Броят роли не съвпада' : 'Старт на играта'}
        </button>
      ) : (
        <p className="hint">Изчакай домакина да стартира играта...</p>
      )}
    </div>
  );
}
