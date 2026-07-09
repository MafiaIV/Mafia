'use client';

export interface StoredSession {
  playerId: string;
  playerName: string;
}

function key(code: string): string {
  return `mafia:${code.toUpperCase()}`;
}

export function saveSession(code: string, session: StoredSession): void {
  try {
    localStorage.setItem(key(code), JSON.stringify(session));
  } catch {
    // localStorage unavailable (e.g. private mode) — session just won't persist across reloads
  }
}

export function loadSession(code: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(code: string): void {
  try {
    localStorage.removeItem(key(code));
  } catch {
    // localStorage unavailable — nothing to clear
  }
}
