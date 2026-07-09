'use client';

import { useEffect, useState } from 'react';
import {
  ROLES_BY_ID,
  type ChatMessagePayload,
  type MafiaPicksPayload,
  type NightYourTurnPayload,
} from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { Avatar } from './Avatar';
import { ChatPanel } from './ChatPanel';

export function NightOverlay({
  nightTurn,
  isWaiting,
  myPlayerId,
  mafiaPicks,
  chatMessages,
}: {
  nightTurn: NightYourTurnPayload | null;
  isWaiting: boolean;
  myPlayerId: string;
  mafiaPicks: MafiaPicksPayload['picks'];
  chatMessages: ChatMessagePayload[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [witchChoice, setWitchChoice] = useState<'save' | 'poison' | 'none' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isMafia = nightTurn?.actingRole === 'mafia';

  // Mafia can keep changing their pick, so reset the local "submitted" lock
  // whenever a fresh turn starts instead of getting stuck on an old value.
  useEffect(() => {
    setSelectedId(null);
    setWitchChoice(null);
    setSubmitted(false);
  }, [nightTurn?.actingRole]);

  if (!nightTurn) {
    return (
      <div className="night-overlay">
        <div className="moon">🌙</div>
        <h2>Нощта настъпва...</h2>
        <p className="hint">{isWaiting ? 'Затвори очи. Изчакай реда си.' : 'Изчакай останалите играчи.'}</p>
      </div>
    );
  }

  const role = ROLES_BY_ID[nightTurn.actingRole];
  const isWitch = nightTurn.actingRole === 'witch';
  const mafiaTargetName = nightTurn.mafiaTargetId
    ? nightTurn.candidates.find((c) => c.id === nightTurn.mafiaTargetId)?.name
    : null;

  function submit(targetId: string | null) {
    getSocket().emit('night:action', {
      targetId,
      witchChoice: isWitch ? witchChoice ?? 'none' : undefined,
    });
    if (!isMafia) setSubmitted(true);
  }

  function pickMafiaTarget(targetId: string) {
    setSelectedId(targetId);
    submit(targetId);
  }

  if (submitted && !isMafia) {
    return (
      <div className="night-overlay">
        <div className="moon">🌙</div>
        <h2>Изборът е записан</h2>
        <p className="hint">Изчакай останалите играчи.</p>
      </div>
    );
  }

  return (
    <div className="night-overlay">
      <div className="moon">{role.icon}</div>
      <h2>{role.name} — твой ред</h2>
      <p className="hint">{role.description}</p>

      {isMafia && nightTurn.mafiaTeammates && nightTurn.mafiaTeammates.length > 0 && (
        <p className="hint">Твоите съучастници: {nightTurn.mafiaTeammates.map((m) => m.name).join(', ')}</p>
      )}

      {isWitch && (
        <div className="witch-actions">
          {nightTurn.hasHeal && mafiaTargetName && (
            <button
              className={`btn btn-secondary ${witchChoice === 'save' ? 'selected' : ''}`}
              onClick={() => setWitchChoice('save')}
            >
              Спаси {mafiaTargetName}
            </button>
          )}
          {nightTurn.hasPoison && (
            <button
              className={`btn btn-secondary ${witchChoice === 'poison' ? 'selected' : ''}`}
              onClick={() => setWitchChoice('poison')}
            >
              Отрови избран играч
            </button>
          )}
          <button
            className={`btn btn-secondary ${witchChoice === 'none' || witchChoice === null ? 'selected' : ''}`}
            onClick={() => {
              setWitchChoice('none');
              setSelectedId(null);
            }}
          >
            Не прави нищо
          </button>
        </div>
      )}

      {(!isWitch || witchChoice === 'poison') && (
        <div className="candidate-grid" style={{ marginTop: 18 }}>
          {nightTurn.candidates.map((c) => (
            <button
              key={c.id}
              className={`candidate-btn ${selectedId === c.id ? 'selected' : ''}`}
              onClick={() => (isMafia ? pickMafiaTarget(c.id) : setSelectedId(c.id))}
            >
              <Avatar seed={c.id} name={c.name} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {isMafia && (
        <div className="mafia-picks-board">
          <p className="hint" style={{ marginBottom: 6 }}>
            Трябва всички да изберете един и същ човек, за да продължи нощта:
          </p>
          <div className="mafia-picks-list">
            <span className="badge">
              Ти: {selectedId ? nightTurn.candidates.find((c) => c.id === selectedId)?.name : '—'}
            </span>
            {mafiaPicks
              .filter((p) => p.playerId !== myPlayerId)
              .map((p) => (
                <span key={p.playerId} className="badge">
                  {nightTurn.mafiaTeammates?.find((m) => m.id === p.playerId)?.name ?? '?'}:{' '}
                  {p.targetId ? nightTurn.candidates.find((c) => c.id === p.targetId)?.name : '—'}
                </span>
              ))}
          </div>
          <div className="mafia-chat-wrap">
            <ChatPanel channel="mafia" messages={chatMessages} />
          </div>
        </div>
      )}

      {!isMafia && (
        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedId(null);
              submit(null);
            }}
          >
            Пропусни
          </button>
          <button
            className="btn btn-primary"
            disabled={isWitch ? witchChoice === 'poison' && !selectedId : !selectedId}
            onClick={() => submit(selectedId)}
          >
            Потвърди
          </button>
        </div>
      )}
    </div>
  );
}
