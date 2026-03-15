import { useCallback, useEffect, useRef, useState } from 'react';
import { SyncManager } from '@partylight/core';
import type { ColorState } from '@partylight/core';

const SERVER_URL = import.meta.env.VITE_PARTYLIGHT_SERVER_URL ?? 'wss://relay.partylight.app';

export type SyncMode = 'off' | 'host' | 'peer';

export type UseSyncResult = {
  mode: SyncMode;
  roomCode: string | null;
  connected: boolean;
  peerColorState: ColorState | null;
  lostSync: boolean;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  disconnect: () => void;
  publishFrame: (state: ColorState) => void;
};

const LOST_SYNC_TIMEOUT_MS = 3000;

export function useSync(): UseSyncResult {
  const [mode, setMode] = useState<SyncMode>('off');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [peerColorState, setPeerColorState] = useState<ColorState | null>(null);
  const [lostSync, setLostSync] = useState(false);

  const managerRef = useRef<SyncManager | null>(null);
  const lostSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetLostSyncTimer = useCallback(() => {
    if (lostSyncTimer.current) clearTimeout(lostSyncTimer.current);
    setLostSync(false);
    lostSyncTimer.current = setTimeout(() => setLostSync(true), LOST_SYNC_TIMEOUT_MS);
  }, []);

  const disconnect = useCallback(() => {
    managerRef.current?.destroy();
    managerRef.current = null;
    if (lostSyncTimer.current) clearTimeout(lostSyncTimer.current);
    setMode('off');
    setRoomCode(null);
    setConnected(false);
    setPeerColorState(null);
    setLostSync(false);
  }, []);

  const createManager = useCallback((role: SyncMode) => {
    disconnect();
    const mgr = new SyncManager({
      serverUrl: SERVER_URL,
      onRoomCreated: (code) => setRoomCode(code),
      onJoined: () => { if (role === 'peer') resetLostSyncTimer(); },
      onFrame: (state) => {
        setPeerColorState(state);
        resetLostSyncTimer();
      },
      onError: (reason) => console.warn('Sync error:', reason),
      onExpired: () => { setMode('off'); setRoomCode(null); },
      onConnectionChange: setConnected,
    });
    managerRef.current = mgr;
    return mgr;
  }, [disconnect, resetLostSyncTimer]);

  const createRoom = useCallback(() => {
    const mgr = createManager('host');
    setMode('host');
    mgr.createRoom();
  }, [createManager]);

  const joinRoom = useCallback((code: string) => {
    const mgr = createManager('peer');
    setMode('peer');
    mgr.joinRoom(code);
    resetLostSyncTimer();
  }, [createManager, resetLostSyncTimer]);

  const publishFrame = useCallback((state: ColorState) => {
    managerRef.current?.publishFrame(state);
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { mode, roomCode, connected, peerColorState, lostSync, createRoom, joinRoom, disconnect, publishFrame };
}
