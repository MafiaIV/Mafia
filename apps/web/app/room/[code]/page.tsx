'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '../../../lib/socket';
import { useGameStore } from '../../../lib/useGameStore';
import { loadSession, saveSession, clearSession } from '../../../lib/session';
import type { RoleId } from '@mafia/shared';
import { GameHeader } from '../../../components/GameHeader';
import { GameFooter } from '../../../components/GameFooter';
import { MyRoleBadge } from '../../../components/MyRoleBadge';
import { RoleZoomOverlay } from '../../../components/RoleZoomOverlay';
import { Lobby } from '../../../components/Lobby';
import { NightOverlay } from '../../../components/NightOverlay';
import { DayDiscussion } from '../../../components/DayDiscussion';
import { VotingPanel } from '../../../components/VotingPanel';
import { GameOverScreen } from '../../../components/GameOverScreen';

type Status = 'checking' | 'need-join' | 'joined';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const router = useRouter();
  const store = useGameStore();
  const [status, setStatus] = useState<Status>('checking');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [zoomedRole, setZoomedRole] = useState<RoleId | null>(null);

  useEffect(() => {
    const unbind = store.bindListeners();
    return unbind;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = loadSession(code);
    if (!stored) {
      setStatus('need-join');
      return;
    }
    getSocket().emit('room:rejoin', { code, playerId: stored.playerId }, (res) => {
      if (res.ok) {
        store.setSession(stored.playerId, stored.playerName);
        setStatus('joined');
      } else {
        setStatus('need-join');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function submitJoin() {
    const name = joinName.trim();
    if (!name) return setJoinError('Въведи име.');
    getSocket().emit('room:join', { code, playerName: name }, (res) => {
      if (!res.ok) return setJoinError(res.error);
      store.setSession(res.playerId, name);
      saveSession(code, { playerId: res.playerId, playerName: name });
      setStatus('joined');
    });
  }

  if (status === 'checking') {
    return <div className="center-page">Свързване...</div>;
  }

  if (status === 'need-join') {
    return (
      <div className="center-page">
        <div className="panel">
          <h1>Стая {code}</h1>
          <div className="field">
            <label>Твоето име</label>
            <input className="input" value={joinName} onChange={(e) => setJoinName(e.target.value)} maxLength={24} />
          </div>
          <button className="btn btn-primary" onClick={submitJoin}>
            Влез в стаята
          </button>
          {joinError && <div className="error-text">{joinError}</div>}
        </div>
      </div>
    );
  }

  const { roomState, myRole, playerId, nightTurn, isNightWaiting, chatMessages, mafiaPicks } = store;

  if (!roomState || !playerId) {
    return <div className="center-page">Зареждане на стаята...</div>;
  }

  const me = roomState.players.find((p) => p.id === playerId);
  const isHost = roomState.hostId === playerId;

  function handleLeave() {
    getSocket().emit('room:leave');
    clearSession(code);
    router.push('/');
  }

  function handleNewGame() {
    getSocket().emit('room:restart');
  }

  return (
    <div className="app-shell game-bg">
      <GameHeader roleDeck={roomState.roleDeck} onZoom={setZoomedRole} onLeave={handleLeave} />
      <div className="game-body">
        {roomState.phase === 'lobby' && <Lobby roomState={roomState} myPlayerId={playerId} />}

        {roomState.phase === 'role_assignment' && (
          <div className="section">
            <h2>Разпределяне на роли...</h2>
            <p className="hint">Разгледай ролите горе — това са всички роли в тази игра.</p>
          </div>
        )}

        {roomState.phase === 'night' && (
          <NightOverlay
            nightTurn={nightTurn}
            isWaiting={isNightWaiting}
            myPlayerId={playerId}
            mafiaPicks={mafiaPicks}
            chatMessages={chatMessages}
          />
        )}

        {roomState.phase === 'day_reveal' && (
          <div className="section">
            <h2>Осъмва...</h2>
            <p className="hint">
              {roomState.lastVoteResult
                ? roomState.lastVoteResult.lynchedPlayerId
                  ? `Обесен беше ${roomState.players.find((p) => p.id === roomState.lastVoteResult!.lynchedPlayerId)?.name}.`
                  : 'Гласовете се разделиха — никой не беше обесен.'
                : roomState.lastNightResult && roomState.lastNightResult.diedPlayerIds.length > 0
                  ? `Тази нощ умря: ${roomState.lastNightResult.diedPlayerIds
                      .map((id) => roomState.players.find((p) => p.id === id)?.name)
                      .join(', ')}.`
                  : 'Тази нощ никой не умря.'}
            </p>
          </div>
        )}

        {roomState.phase === 'day_discussion' && (
          <DayDiscussion roomState={roomState} myPlayerId={playerId} myRole={myRole} chatMessages={chatMessages} />
        )}

        {roomState.phase === 'voting' && <VotingPanel roomState={roomState} myPlayerId={playerId} />}

        {roomState.phase === 'game_over' && <GameOverScreen roomState={roomState} />}
      </div>
      {roomState.phase !== 'lobby' && (
        <GameFooter
          channel={me?.alive === false ? 'dead' : 'alive'}
          showNewGame={roomState.phase === 'game_over' && isHost}
          onNewGame={handleNewGame}
        />
      )}
      {roomState.phase !== 'lobby' && roomState.phase !== 'game_over' && (
        <MyRoleBadge roleId={myRole} onZoom={setZoomedRole} />
      )}
      <RoleZoomOverlay roleId={zoomedRole} onClose={() => setZoomedRole(null)} />
    </div>
  );
}
