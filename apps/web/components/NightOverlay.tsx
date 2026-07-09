'use client';

import { useState } from 'react';
import { ROLES_BY_ID, type NightYourTurnPayload } from '@mafia/shared';
import { getSocket } from '../lib/socket';
import { Avatar } from './Avatar';

export function NightOverlay({
  nightTurn,
  isWaiting,
}: {
  nightTurn: NightYourTurnPayload | null;
  isWaiting: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [witchChoice, setWitchChoice] = useState<'save' | 'poison' | 'none' | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    getSocket().emit('night:action', {
      targetId: selectedId,
      witchChoice: isWitch ? witchChoice ?? 'none' : undefined,
    });
  }

  if (submitted) {
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
              onClick={() => setSelectedId(c.id)}
            >
              <Avatar seed={c.id} name={c.name} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => { setSelectedId(null); submit(); }}>
          Пропусни
        </button>
        <button
          className="btn btn-primary"
          disabled={isWitch ? witchChoice === 'poison' && !selectedId : !selectedId}
          onClick={submit}
        >
          Потвърди
        </button>
      </div>
    </div>
  );
}
