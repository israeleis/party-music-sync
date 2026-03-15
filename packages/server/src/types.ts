export type ColorState = {
  r: number;
  g: number;
  b: number;
  beat: boolean;
  intensity: number;
  timestamp: number;
};

export type Room = {
  code: string;
  hostWs: import('ws').WebSocket | null;
  peers: Set<import('ws').WebSocket>;
  lastFrameAt: number;
  discoverable: boolean;
  createdAt: number;
};
