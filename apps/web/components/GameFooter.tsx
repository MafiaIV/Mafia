'use client';

import { useEffect, useRef } from 'react';
import { useVoiceChat } from '../lib/useVoiceChat';

export function GameFooter({
  channel,
  showNewGame,
  onNewGame,
}: {
  channel: 'alive' | 'dead';
  showNewGame: boolean;
  onNewGame: () => void;
}) {
  const { joined, muted, peers, error, join, leave, toggleMute } = useVoiceChat();
  const prevChannel = useRef(channel);

  useEffect(() => {
    if (joined && prevChannel.current !== channel) {
      leave();
      join();
    }
    prevChannel.current = channel;
  }, [channel, joined, join, leave]);

  useEffect(() => () => leave(), [leave]);

  return (
    <div className="game-footer">
      <div className="footer-voice">
        {!joined ? (
          <button className="btn btn-secondary" onClick={join}>
            🎙️ Включи микрофон
          </button>
        ) : (
          <>
            <button className={`btn btn-secondary ${muted ? '' : 'selected'}`} onClick={toggleMute}>
              {muted ? '🔇 Заглушен' : '🎤 На линия'}
            </button>
            <button className="btn btn-secondary" onClick={leave}>
              Изключи микрофон
            </button>
            <span className="hint">{peers.length > 0 ? `${peers.length + 1} в разговора` : 'Само ти засега'}</span>
          </>
        )}
        {error && <span className="error-text">{error}</span>}
        {peers.map(
          (p) =>
            p.stream && (
              <audio
                key={p.id}
                autoPlay
                ref={(el) => {
                  if (el && el.srcObject !== p.stream) el.srcObject = p.stream;
                }}
              />
            ),
        )}
      </div>
      {showNewGame && (
        <button className="btn btn-primary footer-new-game-btn" onClick={onNewGame}>
          Нова игра, същите играчи
        </button>
      )}
    </div>
  );
}
