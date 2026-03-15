export type ColorState = {
  r: number;         // 0–255 (bass energy)
  g: number;         // 0–255 (mid energy)
  b: number;         // 0–255 (treble energy)
  beat: boolean;     // true on beat frame
  intensity: number; // 0–1 overall RMS loudness
  timestamp: number; // ms since epoch, for peer interpolation
};

export type WsMessage =
  | { type: 'create' }
  | { type: 'created'; code: string }
  | { type: 'join'; code: string }
  | { type: 'joined' }
  | { type: 'error'; reason: string }
  | { type: 'frame'; state: ColorState }
  | { type: 'expired' };
