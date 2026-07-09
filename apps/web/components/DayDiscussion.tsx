'use client';

import type { ChatMessagePayload, RoleId, RoomStateSummary } from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { ChatPanel } from './ChatPanel';

export function DayDiscussion({
  roomState,
  myPlayerId,
  myRole,
  chatMessages,
}: {
  roomState: RoomStateSummary;
  myPlayerId: string;
  myRole: RoleId | null;
  chatMessages: ChatMessagePayload[];
}) {
  const me = roomState.players.find((p) => p.id === myPlayerId);
  const isHost = roomState.hostId === myPlayerId;
  const died = roomState.lastNightResult?.diedPlayerIds ?? [];
  const diedNames = died.map((id) => roomState.players.find((p) => p.id === id)?.name).filter(Boolean);

  return (
    <div className="section">
      <h2>Ден {roomState.round}</h2>
      <p className="hint">
        {diedNames.length === 0
          ? 'Тази нощ никой не умря.'
          : `Тази нощ умря: ${diedNames.join(', ')}.`}
      </p>

      {myRole === 'mayor' && !me?.isMayorRevealed && (
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 16 }}
          onClick={() => getSocket().emit('day:revealMayor')}
        >
          Разкрий се като кмет (двоен глас)
        </button>
      )}

      <ChatPanel channel={me?.alive ? 'alive' : 'dead'} messages={chatMessages} />

      {isHost && (
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => getSocket().emit('day:startVoting')}
        >
          Започни гласуването
        </button>
      )}
    </div>
  );
}
