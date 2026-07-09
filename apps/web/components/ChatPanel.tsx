'use client';

import { useState } from 'react';
import type { ChatMessagePayload } from '@mafia/shared';
import { getSocket } from '../lib/socket';

export function ChatPanel({
  channel,
  messages,
}: {
  channel: 'alive' | 'dead' | 'mafia';
  messages: ChatMessagePayload[];
}) {
  const [text, setText] = useState('');
  const filtered = messages.filter((m) => m.channel === channel);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket().emit('chat:message', { text: trimmed, channel: channel === 'mafia' ? 'mafia' : undefined });
    setText('');
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {filtered.map((m, i) => (
          <div className="chat-msg" key={i}>
            <span className="sender">{m.senderName}</span>
            <span className="text">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            channel === 'dead' ? 'Съобщение до мъртвите...' : channel === 'mafia' ? 'Съобщение до мафията...' : 'Съобщение...'
          }
        />
        <button className="btn btn-secondary" onClick={send}>
          Изпрати
        </button>
      </div>
    </div>
  );
}
