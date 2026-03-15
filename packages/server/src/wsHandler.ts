import type { WebSocket } from 'ws';
import type { RoomManager } from './roomManager.js';

type WsMessage =
  | { type: 'create'; discoverable?: boolean }
  | { type: 'join'; code: string }
  | { type: 'frame'; state: unknown };

export function handleConnection(ws: WebSocket, roomManager: RoomManager): void {
  ws.on('message', (data) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return; // ignore malformed
    }

    const now = Date.now();

    if (msg.type === 'create') {
      try {
        const room = roomManager.createRoom(ws, msg.discoverable ?? false);
        ws.send(JSON.stringify({ type: 'created', code: room.code }));
      } catch (e: unknown) {
        const err = e as Error;
        if (err.message === 'MAX_ROOMS_EXCEEDED') {
          ws.send(JSON.stringify({ type: 'error', reason: 'server_full' }));
        } else {
          ws.send(JSON.stringify({ type: 'error', reason: 'create_failed' }));
        }
      }
      return;
    }

    if (msg.type === 'join') {
      try {
        roomManager.joinRoom(msg.code, ws);
        ws.send(JSON.stringify({ type: 'joined' }));
      } catch (e: unknown) {
        const err = e as Error;
        const reason = err.message === 'NOT_FOUND' ? 'not_found' : 'room_full';
        ws.send(JSON.stringify({ type: 'error', reason }));
      }
      return;
    }

    if (msg.type === 'frame') {
      const room = roomManager.getRoomForHost(ws);
      if (!room) return;
      if (!roomManager.checkFrameRateLimit(ws, now)) return;
      roomManager.updateLastFrameAt(room, now);
      const payload = JSON.stringify({ type: 'frame', state: msg.state });
      for (const peer of room.peers) {
        if (peer.readyState === 1 /* OPEN */) {
          peer.send(payload);
        }
      }
    }
  });

  ws.on('close', () => {
    roomManager.removeClient(ws);
  });
}
