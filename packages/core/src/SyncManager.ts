import type { ColorState, WsMessage } from './types.js';

export type SyncRole = 'host' | 'peer';

export type SyncManagerOptions = {
  serverUrl: string;
  onFrame?: (state: ColorState) => void;
  onRoomCreated?: (code: string) => void;
  onJoined?: () => void;
  onError?: (reason: string) => void;
  onExpired?: () => void;
  onConnectionChange?: (connected: boolean) => void;
};

export class SyncManager {
  private ws: WebSocket | null = null;
  private role: SyncRole | null = null;
  private roomCode: string | null = null;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private pendingHandshake: (() => void) | null = null;

  constructor(private readonly options: SyncManagerOptions) {}

  createRoom(): void {
    this.role = 'host';
    this.connect(() => this.send({ type: 'create' }));
  }

  joinRoom(code: string): void {
    this.role = 'peer';
    this.roomCode = code.toUpperCase();
    this.connect(() => this.send({ type: 'join', code: this.roomCode! }));
  }

  publishFrame(state: ColorState): void {
    this.send({ type: 'frame', state });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private connect(handshake: () => void): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.pendingHandshake = handshake;
    const ws = new WebSocket(this.options.serverUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.options.onConnectionChange?.(true);
      this.pendingHandshake?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      this.options.onConnectionChange?.(false);
      if (!this.destroyed) this.scheduleReconnect();
    };

    ws.onerror = () => { /* close follows error, handled there */ };
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(30000, this.reconnectDelay * 2);
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed && this.pendingHandshake) this.connect(this.pendingHandshake);
    }, delay);
  }

  private handleMessage(msg: WsMessage): void {
    switch (msg.type) {
      case 'created':
        this.roomCode = msg.code;
        this.options.onRoomCreated?.(msg.code);
        break;
      case 'joined':
        this.options.onJoined?.();
        break;
      case 'frame':
        this.options.onFrame?.(msg.state);
        break;
      case 'error':
        this.options.onError?.(msg.reason);
        break;
      case 'expired':
        this.options.onExpired?.();
        break;
    }
  }

  private send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
