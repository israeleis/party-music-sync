import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncManager } from '../SyncManager.js';
import type { ColorState } from '../types.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  sentMessages: string[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Auto-open asynchronously but we'll trigger manually in tests
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  // Helpers to simulate server events
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  static instances: MockWebSocket[] = [];
  static reset(): void {
    MockWebSocket.instances = [];
  }
}

const sampleState: ColorState = {
  r: 100,
  g: 150,
  b: 200,
  beat: false,
  intensity: 0.5,
  timestamp: 12345,
};

beforeEach(() => {
  MockWebSocket.reset();
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function getLatestWs(): MockWebSocket {
  const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!ws) throw new Error('No WebSocket instance created');
  return ws;
}

describe('SyncManager', () => {
  it('createRoom() sends { type: "create" } on connect', () => {
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080' });
    sm.createRoom();

    const ws = getLatestWs();
    ws.simulateOpen();

    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0])).toEqual({ type: 'create' });
    sm.destroy();
  });

  it('joinRoom("JAZZ") sends { type: "join", code: "JAZZ" } on connect', () => {
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080' });
    sm.joinRoom('JAZZ');

    const ws = getLatestWs();
    ws.simulateOpen();

    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0])).toEqual({ type: 'join', code: 'JAZZ' });
    sm.destroy();
  });

  it('joinRoom("jazz") uppercases the code to "JAZZ"', () => {
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080' });
    sm.joinRoom('jazz');

    const ws = getLatestWs();
    ws.simulateOpen();

    const msg = JSON.parse(ws.sentMessages[0]);
    expect(msg.code).toBe('JAZZ');
    sm.destroy();
  });

  it('receiving { type: "created", code: "JAZZ" } calls onRoomCreated("JAZZ")', () => {
    const onRoomCreated = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onRoomCreated });
    sm.createRoom();

    const ws = getLatestWs();
    ws.simulateOpen();
    ws.simulateMessage({ type: 'created', code: 'JAZZ' });

    expect(onRoomCreated).toHaveBeenCalledWith('JAZZ');
    sm.destroy();
  });

  it('receiving { type: "frame", state } calls onFrame with state', () => {
    const onFrame = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onFrame });
    sm.joinRoom('JAZZ');

    const ws = getLatestWs();
    ws.simulateOpen();
    ws.simulateMessage({ type: 'frame', state: sampleState });

    expect(onFrame).toHaveBeenCalledWith(sampleState);
    sm.destroy();
  });

  it('receiving { type: "error", reason: "not_found" } calls onError("not_found")', () => {
    const onError = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onError });
    sm.joinRoom('JAZZ');

    const ws = getLatestWs();
    ws.simulateOpen();
    ws.simulateMessage({ type: 'error', reason: 'not_found' });

    expect(onError).toHaveBeenCalledWith('not_found');
    sm.destroy();
  });

  it('receiving { type: "expired" } calls onExpired', () => {
    const onExpired = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onExpired });
    sm.joinRoom('JAZZ');

    const ws = getLatestWs();
    ws.simulateOpen();
    ws.simulateMessage({ type: 'expired' });

    expect(onExpired).toHaveBeenCalled();
    sm.destroy();
  });

  it('publishFrame(state) sends { type: "frame", state } when connected', () => {
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080' });
    sm.createRoom();

    const ws = getLatestWs();
    ws.simulateOpen();
    // Clear the 'create' message
    ws.sentMessages = [];

    sm.publishFrame(sampleState);

    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0])).toEqual({ type: 'frame', state: sampleState });
    sm.destroy();
  });

  it('destroy() closes WebSocket and prevents reconnection', () => {
    vi.useFakeTimers();
    const onConnectionChange = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onConnectionChange });
    sm.createRoom();

    const ws = getLatestWs();
    ws.simulateOpen();

    sm.destroy();

    // Simulate close after destroy
    ws.onclose?.(new CloseEvent('close'));

    // Advance timers — no reconnection should happen
    vi.advanceTimersByTime(5000);
    // Only the original ws was created
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('onConnectionChange(true) called on connect, onConnectionChange(false) on close', () => {
    const onConnectionChange = vi.fn();
    const sm = new SyncManager({ serverUrl: 'ws://localhost:8080', onConnectionChange });
    sm.createRoom();

    const ws = getLatestWs();
    ws.simulateOpen();
    expect(onConnectionChange).toHaveBeenCalledWith(true);

    // Disable reconnect so close doesn't create a new ws
    sm.destroy();
    // Manually call onclose handler (destroy sets it to null, so simulate before destroy)
    onConnectionChange.mockClear();

    // Re-test with a fresh instance
    const sm2 = new SyncManager({ serverUrl: 'ws://localhost:8080', onConnectionChange });
    sm2.createRoom();
    const ws2 = getLatestWs();
    ws2.simulateOpen();
    expect(onConnectionChange).toHaveBeenCalledWith(true);

    onConnectionChange.mockClear();
    sm2.destroy();
    // Simulate the close being delivered before destroy nulled onclose
    // (we need to re-wire: destroy sets onclose=null, so simulate close before calling destroy)
    const sm3 = new SyncManager({ serverUrl: 'ws://localhost:8080', onConnectionChange });
    sm3.createRoom();
    const ws3 = getLatestWs();
    ws3.simulateOpen();
    onConnectionChange.mockClear();
    // simulate close BEFORE destroy
    ws3.simulateClose();
    expect(onConnectionChange).toHaveBeenCalledWith(false);
    sm3.destroy();
  });
});
