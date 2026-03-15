import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from '../roomManager.js';
import { handleConnection } from '../wsHandler.js';

type MockWs = {
  send: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  readyState: number;
  _handlers: Record<string, (data: any) => void>;
};

function makeMockWs(): MockWs {
  const ws: MockWs = {
    send: vi.fn(),
    readyState: 1,
    _handlers: {},
    on: vi.fn((event: string, handler: (data: any) => void) => {
      ws._handlers[event] = handler;
    }),
  };
  return ws;
}

function sendMsg(ws: MockWs, msg: unknown) {
  const handler = ws._handlers['message'];
  handler(Buffer.from(JSON.stringify(msg)));
}

function triggerClose(ws: MockWs) {
  ws._handlers['close']?.(undefined);
}

describe('wsHandler', () => {
  let rm: RoomManager;
  let hostWs: MockWs;

  beforeEach(() => {
    rm = new RoomManager();
    hostWs = makeMockWs();
    handleConnection(hostWs as any, rm);
  });

  it('sending create → sends created with 4-letter code', () => {
    sendMsg(hostWs, { type: 'create' });
    expect(hostWs.send).toHaveBeenCalledTimes(1);
    const response = JSON.parse((hostWs.send as any).mock.calls[0][0]);
    expect(response.type).toBe('created');
    expect(response.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it('sending join with valid code → sends joined', () => {
    sendMsg(hostWs, { type: 'create' });
    const { code } = JSON.parse((hostWs.send as any).mock.calls[0][0]);

    const peerWs = makeMockWs();
    handleConnection(peerWs as any, rm);
    sendMsg(peerWs, { type: 'join', code });

    const response = JSON.parse((peerWs.send as any).mock.calls[0][0]);
    expect(response.type).toBe('joined');
  });

  it('sending join with nonexistent code → sends error not_found', () => {
    const peerWs = makeMockWs();
    handleConnection(peerWs as any, rm);
    sendMsg(peerWs, { type: 'join', code: 'XXXX' });

    const response = JSON.parse((peerWs.send as any).mock.calls[0][0]);
    expect(response.type).toBe('error');
    expect(response.reason).toBe('not_found');
  });

  it('host sending frame relays to all peers', () => {
    sendMsg(hostWs, { type: 'create' });
    const { code } = JSON.parse((hostWs.send as any).mock.calls[0][0]);

    const peer1 = makeMockWs();
    const peer2 = makeMockWs();
    handleConnection(peer1 as any, rm);
    handleConnection(peer2 as any, rm);
    sendMsg(peer1, { type: 'join', code });
    sendMsg(peer2, { type: 'join', code });

    const colorState = { r: 255, g: 0, b: 128, beat: true, intensity: 0.8, timestamp: 1000 };
    sendMsg(hostWs, { type: 'frame', state: colorState });

    const expectedPayload = JSON.stringify({ type: 'frame', state: colorState });
    expect(peer1.send).toHaveBeenCalledWith(expectedPayload);
    expect(peer2.send).toHaveBeenCalledWith(expectedPayload);
  });

  it('frame rate limiting drops frames sent too quickly', () => {
    sendMsg(hostWs, { type: 'create' });
    const { code } = JSON.parse((hostWs.send as any).mock.calls[0][0]);

    const peerWs = makeMockWs();
    handleConnection(peerWs as any, rm);
    sendMsg(peerWs, { type: 'join', code });
    (peerWs.send as ReturnType<typeof vi.fn>).mockClear(); // clear 'joined' confirmation

    const colorState = { r: 255, g: 0, b: 0, beat: false, intensity: 0.5, timestamp: 1000 };

    const spy = vi.spyOn(rm, 'checkFrameRateLimit');
    spy.mockReturnValueOnce(true).mockReturnValueOnce(false);

    sendMsg(hostWs, { type: 'frame', state: colorState });
    const callsAfterFirst = peerWs.send.mock.calls.length;
    sendMsg(hostWs, { type: 'frame', state: colorState });
    const callsAfterSecond = peerWs.send.mock.calls.length;

    expect(callsAfterFirst).toBe(1);
    expect(callsAfterSecond).toBe(1); // second frame was dropped
  });

  it('malformed JSON is ignored (no crash)', () => {
    const handler = hostWs._handlers['message'];
    expect(() => handler(Buffer.from('not json at all {{{}'))).not.toThrow();
    expect(hostWs.send).not.toHaveBeenCalled();
  });

  it('close event calls roomManager.removeClient', () => {
    sendMsg(hostWs, { type: 'create' });
    const spy = vi.spyOn(rm, 'removeClient');
    triggerClose(hostWs);
    expect(spy).toHaveBeenCalledWith(hostWs);
  });
});
