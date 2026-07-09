'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../lib/useGameStore';
import { saveSession } from '../lib/session';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useGameStore((s) => s.setSession);

  function submit() {
    const name = playerName.trim();
    if (!name) return setError('Въведи име.');
    setError(null);
    setLoading(true);
    const socket = getSocket();

    if (mode === 'create') {
      socket.emit('room:create', { playerName: name }, (res) => {
        setLoading(false);
        if (!res.ok) return setError(res.error);
        setSession(res.playerId, name);
        saveSession(res.code, { playerId: res.playerId, playerName: name });
        router.push(`/room/${res.code}`);
      });
    } else {
      const roomCode = code.trim().toUpperCase();
      if (!roomCode) {
        setLoading(false);
        return setError('Въведи код на стая.');
      }
      socket.emit('room:join', { code: roomCode, playerName: name }, (res) => {
        setLoading(false);
        if (!res.ok) return setError(res.error);
        setSession(res.playerId, name);
        saveSession(roomCode, { playerId: res.playerId, playerName: name });
        router.push(`/room/${roomCode}`);
      });
    }
  }

  return (
    <div className="center-page home-hero">
      <div className="panel">
        <h1>🌙 Мафия Онлайн</h1>
        <div className="tabs">
          <button className={`tab ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            Създай стая
          </button>
          <button className={`tab ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
            Влез в стая
          </button>
        </div>

        <div className="field">
          <label>Твоето име</label>
          <input className="input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={24} />
        </div>

        {mode === 'join' && (
          <div className="field">
            <label>Код на стая</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
        )}

        <button className="btn btn-primary" disabled={loading} onClick={submit}>
          {mode === 'create' ? 'Създай' : 'Влез'}
        </button>
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
