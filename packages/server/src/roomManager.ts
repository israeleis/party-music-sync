import type { WebSocket } from 'ws';
import type { Room } from './types.js';

const MAX_ROOMS = parseInt(process.env.MAX_ROOMS ?? '100', 10);
const MAX_PEERS_PER_ROOM = 10;
const ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const HOST_FRAME_RATE_LIMIT = 60; // frames/sec max
const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // A-Z minus O and I

export class RoomManager {
  private rooms = new Map<string, Room>();
  private hostLastFrame = new Map<WebSocket, number>(); // for rate limiting

  generateCode(): string {
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Failed to generate unique room code');
  }

  createRoom(hostWs: WebSocket, discoverable = false): Room {
    if (this.rooms.size >= MAX_ROOMS) throw new Error('MAX_ROOMS_EXCEEDED');
    const code = this.generateCode();
    const room: Room = {
      code,
      hostWs,
      peers: new Set(),
      lastFrameAt: Date.now(),
      discoverable,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, peerWs: WebSocket): Room {
    const room = this.getRoom(code);
    if (!room) throw new Error('NOT_FOUND');
    if (room.peers.size >= MAX_PEERS_PER_ROOM) throw new Error('ROOM_FULL');
    room.peers.add(peerWs);
    return room;
  }

  removeClient(ws: WebSocket): void {
    for (const [code, room] of this.rooms) {
      if (room.hostWs === ws) {
        // Host disconnected — keep room alive briefly for reconnect
        room.hostWs = null;
      }
      room.peers.delete(ws);
      // Clean up empty rooms
      if (!room.hostWs && room.peers.size === 0) {
        this.rooms.delete(code);
      }
    }
    this.hostLastFrame.delete(ws);
  }

  checkFrameRateLimit(hostWs: WebSocket, now: number): boolean {
    const last = this.hostLastFrame.get(hostWs);
    const minInterval = 1000 / HOST_FRAME_RATE_LIMIT; // ~16.7ms
    if (last !== undefined && now - last < minInterval) return false;
    this.hostLastFrame.set(hostWs, now);
    return true;
  }

  expireStaleRooms(now: number): void {
    for (const [code, room] of this.rooms) {
      if (now - room.lastFrameAt > ROOM_EXPIRY_MS) {
        // Notify peers
        for (const peer of room.peers) {
          if (peer.readyState === 1 /* OPEN */) {
            peer.send(JSON.stringify({ type: 'expired' }));
          }
        }
        this.rooms.delete(code);
      }
    }
  }

  getDiscoverableRooms(): Array<{ code: string; peerCount: number; createdAt: number }> {
    return Array.from(this.rooms.values())
      .filter((r) => r.discoverable)
      .map((r) => ({ code: r.code, peerCount: r.peers.size, createdAt: r.createdAt }));
  }

  getRoomForHost(hostWs: WebSocket): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hostWs === hostWs) return room;
    }
    return undefined;
  }

  updateLastFrameAt(room: Room, now: number): void {
    room.lastFrameAt = now;
  }

  get roomCount(): number { return this.rooms.size; }
}
