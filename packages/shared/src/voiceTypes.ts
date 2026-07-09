/**
 * The server only relays these, never inspects them — WebRTC signal bodies
 * (SDP offers/answers, ICE candidates) are opaque `unknown` here on purpose
 * so this package doesn't need the DOM lib (server runs Node-only).
 */
export interface VoicePeerInfo {
  id: string;
  name: string;
}

export interface VoiceSignalPayload {
  toPlayerId: string;
  data: unknown;
}

export interface VoiceSignalRelayPayload {
  fromPlayerId: string;
  data: unknown;
}
