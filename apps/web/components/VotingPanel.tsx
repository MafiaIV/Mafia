'use client';

import type { RoomStateSummary } from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { Avatar } from './Avatar';

export function VotingPanel({ roomState, myPlayerId }: { roomState: RoomStateSummary; myPlayerId: string }) {
  const me = roomState.players.find((p) => p.id === myPlayerId);
  const votes = roomState.day?.votes ?? {};
  const myVote = votes[myPlayerId] ?? null;
  const counts = new Map<string, number>();
  for (const targetId of Object.values(votes)) counts.set(targetId, (counts.get(targetId) ?? 0) + 1);

  const candidates = roomState.players.filter((p) => p.alive && p.id !== myPlayerId);
  const canVote = !!me?.alive;
  const totalVotes = Object.keys(votes).length;

  function vote(targetId: string | null) {
    getSocket().emit('day:vote', { targetId });
  }

  return (
    <div className="section">
      <h2>Гласуване</h2>
      <p className="hint">Кого линчувате днес?</p>
      <div className="vote-list">
        {candidates.map((p) => {
          const count = counts.get(p.id) ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div
              key={p.id}
              className={`vote-row ${myVote === p.id ? 'selected' : ''}`}
              onClick={() => canVote && vote(p.id)}
            >
              <div className="fill-bar" style={{ ['--fill' as string]: `${pct}%` }} />
              <Avatar seed={p.avatarSeed} name={p.name} />
              <span>{p.name}</span>
              <span className="vote-count">{count} гласа</span>
            </div>
          );
        })}
      </div>
      {canVote ? (
        <button className="btn btn-secondary" onClick={() => vote(null)}>
          Въздържам се
        </button>
      ) : (
        <p className="hint">Мъртвите не гласуват — само наблюдавате.</p>
      )}
    </div>
  );
}
