import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from '../roomManager.js';

const VALID_CHARS = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ');

function makeMockWs() {
  return { readyState: 1 as const, send: vi.fn() };
}

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager();
  });

  it('createRoom returns room with 4-letter uppercase code (no O, I)', () => {
    const ws = makeMockWs();
    const room = rm.createRoom(ws as any);
    expect(room.code).toHaveLength(4);
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    for (const ch of room.code) {
      expect(VALID_CHARS.has(ch)).toBe(true);
    }
  });

  it('createRoom throws MAX_ROOMS_EXCEEDED when at limit', () => {
    // Override MAX_ROOMS by filling up 100 rooms
    // Use a small manager — we'll just fill it manually
    const smallRm = new RoomManager();
    // Patch the private rooms map to simulate being full
    const rooms = (smallRm as any).rooms as Map<string, unknown>;
    // Fill to 100 (default MAX_ROOMS)
    for (let i = 0; i < 100; i++) {
      rooms.set(`R${i.toString().padStart(3, '0')}`, {});
    }
    expect(() => smallRm.createRoom(makeMockWs() as any)).toThrow('MAX_ROOMS_EXCEEDED');
  });

  it('joinRoom adds peer to room', () => {
    const hostWs = makeMockWs();
    const peerWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    rm.joinRoom(room.code, peerWs as any);
    expect(room.peers.has(peerWs as any)).toBe(true);
  });

  it('joinRoom throws NOT_FOUND for bad code', () => {
    expect(() => rm.joinRoom('ZZZZ', makeMockWs() as any)).toThrow('NOT_FOUND');
  });

  it('joinRoom throws ROOM_FULL at 10 peers', () => {
    const hostWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    for (let i = 0; i < 10; i++) {
      rm.joinRoom(room.code, makeMockWs() as any);
    }
    expect(() => rm.joinRoom(room.code, makeMockWs() as any)).toThrow('ROOM_FULL');
  });

  it('joinRoom is case-insensitive (lowercase code works)', () => {
    const hostWs = makeMockWs();
    const peerWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    const lowerCode = room.code.toLowerCase();
    const joined = rm.joinRoom(lowerCode, peerWs as any);
    expect(joined.code).toBe(room.code);
    expect(room.peers.has(peerWs as any)).toBe(true);
  });

  it('removeClient removes host (sets hostWs to null)', () => {
    const hostWs = makeMockWs();
    const peerWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    rm.joinRoom(room.code, peerWs as any);
    rm.removeClient(hostWs as any);
    expect(room.hostWs).toBeNull();
    // Room still exists because peer is connected
    expect(rm.getRoom(room.code)).toBeDefined();
  });

  it('removeClient removes peer from room', () => {
    const hostWs = makeMockWs();
    const peerWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    rm.joinRoom(room.code, peerWs as any);
    rm.removeClient(peerWs as any);
    expect(room.peers.has(peerWs as any)).toBe(false);
  });

  it('checkFrameRateLimit returns true first call, false if called again within 16ms', () => {
    const hostWs = makeMockWs();
    const now = Date.now();
    expect(rm.checkFrameRateLimit(hostWs as any, now)).toBe(true);
    expect(rm.checkFrameRateLimit(hostWs as any, now + 5)).toBe(false);
    // After 20ms it should pass
    expect(rm.checkFrameRateLimit(hostWs as any, now + 20)).toBe(true);
  });

  it('expireStaleRooms sends expired to peers and removes old room', () => {
    const hostWs = makeMockWs();
    const peerWs = makeMockWs();
    const room = rm.createRoom(hostWs as any);
    rm.joinRoom(room.code, peerWs as any);
    const code = room.code;

    // Simulate lastFrameAt being very old
    room.lastFrameAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

    rm.expireStaleRooms(Date.now());

    expect(peerWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'expired' }));
    expect(rm.getRoom(code)).toBeUndefined();
  });

  it('getDiscoverableRooms returns only discoverable rooms', () => {
    const ws1 = makeMockWs();
    const ws2 = makeMockWs();
    rm.createRoom(ws1 as any, false);
    rm.createRoom(ws2 as any, true);
    const discoverable = rm.getDiscoverableRooms();
    expect(discoverable).toHaveLength(1);
    expect(discoverable[0].peerCount).toBe(0);
  });

  it('generateCode produces 4 chars, all from valid set', () => {
    for (let i = 0; i < 20; i++) {
      const code = rm.generateCode();
      expect(code).toHaveLength(4);
      for (const ch of code) {
        expect(VALID_CHARS.has(ch)).toBe(true);
      }
    }
  });
});
