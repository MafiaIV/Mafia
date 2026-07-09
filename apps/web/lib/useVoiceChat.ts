'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export interface VoicePeerState {
  id: string;
  name: string;
  muted: boolean;
  stream: MediaStream | null;
}

interface VoiceSignalData {
  kind: 'offer' | 'answer' | 'ice';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export function useVoiceChat() {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<Record<string, VoicePeerState>>({});
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  // Mirrors `joined` synchronously (state updates are async/batched) so
  // join()/leave() called back-to-back — e.g. switching alive/dead channel
  // after a death — don't race against a stale closure of `joined`.
  const joinedRef = useRef(false);
  // Mirrors `peers` so the socket listener effect (registered once) can read
  // the latest peer names without stale-closure-capturing an old `peers`.
  const peersRef = useRef<Record<string, VoicePeerState>>({});
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const closePeer = useCallback((peerId: string) => {
    connectionsRef.current.get(peerId)?.close();
    connectionsRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    setPeers((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createConnection = useCallback((peerId: string, name: string) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const localStream = localStreamRef.current;
    if (localStream) {
      for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice:signal', {
          toPlayerId: peerId,
          data: { kind: 'ice', candidate: e.candidate.toJSON() } satisfies VoiceSignalData,
        });
      }
    };
    pc.ontrack = (e) => {
      setPeers((prev) => ({
        ...prev,
        [peerId]: { id: peerId, name, muted: prev[peerId]?.muted ?? false, stream: e.streams[0] ?? null },
      }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(peerId);
      }
    };
    connectionsRef.current.set(peerId, pc);
    setPeers((prev) => ({ ...prev, [peerId]: prev[peerId] ?? { id: peerId, name, muted: false, stream: null } }));
    return pc;
  }, [closePeer]);

  const flushPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(peerId);
    if (!queued) return;
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore stale/invalid candidates
      }
    }
  }, []);

  const join = useCallback(async () => {
    if (joinedRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      joinedRef.current = true;
      setJoined(true);
      getSocket().emit('voice:join');
    } catch {
      setError('Нямам достъп до микрофона. Провери разрешенията на браузъра.');
    }
  }, []);

  const leave = useCallback(() => {
    if (!joinedRef.current) return;
    getSocket().emit('voice:leave');
    for (const pc of connectionsRef.current.values()) pc.close();
    connectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    joinedRef.current = false;
    setPeers({});
    setJoined(false);
    setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    getSocket().emit('voice:mute', { muted: next });
  }, [muted]);

  useEffect(() => {
    const socket = getSocket();

    const onPeers = ({ peers: list }: { peers: { id: string; name: string }[] }) => {
      for (const peer of list) {
        const pc = createConnection(peer.id, peer.name);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            socket.emit('voice:signal', {
              toPlayerId: peer.id,
              data: { kind: 'offer', sdp: offer } satisfies VoiceSignalData,
            });
          })
          .catch(() => setError('Проблем при свързване с гласовия чат.'));
      }
    };

    const onPeerJoined = ({ id, name }: { id: string; name: string }) => {
      setPeers((prev) => ({ ...prev, [id]: prev[id] ?? { id, name, muted: false, stream: null } }));
    };

    const onPeerLeft = ({ id }: { id: string }) => closePeer(id);

    const onSignal = async ({ fromPlayerId, data }: { fromPlayerId: string; data: unknown }) => {
      const signal = data as VoiceSignalData;
      let pc = connectionsRef.current.get(fromPlayerId);

      if (signal.kind === 'offer' && signal.sdp) {
        if (!pc) pc = createConnection(fromPlayerId, peersRef.current[fromPlayerId]?.name ?? 'Играч');
        await pc.setRemoteDescription(signal.sdp);
        await flushPendingCandidates(fromPlayerId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:signal', {
          toPlayerId: fromPlayerId,
          data: { kind: 'answer', sdp: answer } satisfies VoiceSignalData,
        });
      } else if (signal.kind === 'answer' && signal.sdp && pc) {
        await pc.setRemoteDescription(signal.sdp);
        await flushPendingCandidates(fromPlayerId, pc);
      } else if (signal.kind === 'ice' && signal.candidate) {
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(signal.candidate);
          } catch {
            // ignore
          }
        } else {
          const queue = pendingCandidatesRef.current.get(fromPlayerId) ?? [];
          queue.push(signal.candidate);
          pendingCandidatesRef.current.set(fromPlayerId, queue);
        }
      }
    };

    const onMuteChanged = ({ id, muted: peerMuted }: { id: string; muted: boolean }) => {
      setPeers((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], muted: peerMuted } } : prev));
    };

    socket.on('voice:peers', onPeers);
    socket.on('voice:peerJoined', onPeerJoined);
    socket.on('voice:peerLeft', onPeerLeft);
    socket.on('voice:signal', onSignal);
    socket.on('voice:muteChanged', onMuteChanged);

    return () => {
      socket.off('voice:peers', onPeers);
      socket.off('voice:peerJoined', onPeerJoined);
      socket.off('voice:peerLeft', onPeerLeft);
      socket.off('voice:signal', onSignal);
      socket.off('voice:muteChanged', onMuteChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createConnection, closePeer, flushPendingCandidates]);

  useEffect(() => {
    return () => {
      for (const pc of connectionsRef.current.values()) pc.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { joined, muted, peers: Object.values(peers), error, join, leave, toggleMute };
}
