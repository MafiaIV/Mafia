'use client';

import { useEffect, useState } from 'react';
import {
  ROLES_BY_ID,
  type ChatMessagePayload,
  type InvestigationResultPayload,
  type MafiaPicksPayload,
  type NightYourTurnPayload,
} from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { Avatar } from './Avatar';
import { ChatPanel } from './ChatPanel';

export function NightOverlay({
  nightTurn,
  isWaiting,
  isBlocked,
  myPlayerId,
  mafiaPicks,
  chatMessages,
  latestInvestigation,
}: {
  nightTurn: NightYourTurnPayload | null;
  isWaiting: boolean;
  isBlocked: boolean;
  myPlayerId: string;
  mafiaPicks: MafiaPicksPayload['picks'];
  chatMessages: ChatMessagePayload[];
  latestInvestigation: InvestigationResultPayload | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [witchChoice, setWitchChoice] = useState<'save' | 'poison' | 'none' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [awaitingResultAck, setAwaitingResultAck] = useState(false);

  const isMafia = nightTurn?.actingRole === 'mafia';
  const isDetective = nightTurn?.actingRole === 'detective';

  // Mafia can keep changing their pick, so reset the local "submitted" lock
  // whenever a fresh turn starts instead of getting stuck on an old value.
  useEffect(() => {
    setSelectedId(null);
    setWitchChoice(null);
    setSubmitted(false);
    setAwaitingResultAck(false);
  }, [nightTurn?.actingRole]);

  if (isBlocked) {
    return (
      <div className="night-overlay">
        <div className="moon">🔒</div>
        <h2>Тази нощ не можеш да действаш</h2>
        <p className="hint">Някой те посети тази нощ и блокира способността ти. Изчакай останалите.</p>
      </div>
    );
  }

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
    if (isMafia) return;
    if (isDetective && targetId) {
      setAwaitingResultAck(true);
    } else {
      setSubmitted(true);
    }
  }

  function pickMafiaTarget(targetId: string) {
    setSelectedId(targetId);
    submit(targetId);
  }

  if (awaitingResultAck && isDetective) {
    const targetName = nightTurn.candidates.find((c) => c.id === selectedId)?.name ?? '?';
    return (
      <div className="night-overlay">
        <div className="moon">🔍</div>
        <h2>Резултат от разследването</h2>
        <p className="hint">
          {targetName} е{' '}
          <strong style={{ color: latestInvestigation?.isEvil ? 'var(--danger)' : 'var(--accent-2)' }}>
            {latestInvestigation?.isEvil ? 'мафия' : 'не е мафия'}
          </strong>
          .
        </p>
        <button className="btn btn-primary" style={{ maxWidth: 200 }} onClick={() => setSubmitted(true)}>
          Готово
        </button>
      </div>
    );
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

      {isMafia ? (
        <div className="mafia-turn-layout">
          <div className="mafia-turn-left">
            <div className="candidate-grid">
              {nightTurn.candidates.map((c) => (
                <button
                  key={c.id}
                  className={`candidate-btn ${selectedId === c.id ? 'selected' : ''}`}
                  onClick={() => pickMafiaTarget(c.id)}
                >
                  <Avatar seed={c.id} name={c.name} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <p className="hint" style={{ margin: '14px 0 6px' }}>
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
          </div>
          <div className="mafia-turn-right">
            <ChatPanel channel="mafia" messages={chatMessages} />
          </div>
        </div>
      ) : (
        (!isWitch || witchChoice === 'poison') && (
          <div className="candidate-grid" style={{ marginTop: 18 }}>
            {nightTurn.candidates.map((c) => (
              <button
                key={c.id}
                className={`candidate-btn ${selectedId === c.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <Avatar seed={c.id} name={c.name} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )
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
