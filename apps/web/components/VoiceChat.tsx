'use client';

import { useEffect, useRef } from 'react';
import { useVoiceChat } from '../lib/useVoiceChat';

export function VoiceChat({ channel }: { channel: 'alive' | 'dead' }) {
  const { joined, muted, peers, error, join, leave, toggleMute } = useVoiceChat();
  const prevChannel = useRef(channel);

  // Re-join automatically when the player dies and moves from the alive to
  // the dead voice channel (or vice versa on a fresh game).
  useEffect(() => {
    if (joined && prevChannel.current !== channel) {
      leave();
      join();
    }
    prevChannel.current = channel;
  }, [channel, joined, join, leave]);

  useEffect(() => () => leave(), [leave]);

  return (
    <div className="voice-chat">
      <div className="voice-chat-header">
        <span>🎙️ Гласов чат{channel === 'dead' ? ' (мъртви)' : ''}</span>
        {!joined ? (
          <button className="btn btn-secondary" onClick={join}>
            Влез в разговора
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-secondary ${muted ? '' : 'selected'}`} onClick={toggleMute}>
              {muted ? '🔇 Заглушен' : '🎤 На линия'}
            </button>
            <button className="btn btn-secondary" onClick={leave}>
              Излез
            </button>
          </div>
        )}
      </div>
      {error && <div className="error-text">{error}</div>}
      {joined && (
        <div className="voice-peer-list">
          <span className="voice-peer-chip self">
            Ти {muted ? '🔇' : '🎤'}
          </span>
          {peers.map((p) => (
            <span key={p.id} className="voice-peer-chip">
              {p.name} {p.muted ? '🔇' : '🎤'}
              {p.stream && (
                <audio
                  autoPlay
                  ref={(el) => {
                    if (el && el.srcObject !== p.stream) el.srcObject = p.stream;
                  }}
                />
              )}
            </span>
          ))}
          {peers.length === 0 && <span className="hint">Само ти си в разговора засега.</span>}
        </div>
      )}
    </div>
  );
}
