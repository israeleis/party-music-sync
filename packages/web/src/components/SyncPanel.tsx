import { useState } from 'react';
import type { UseSyncResult } from '../hooks/useSync';
import type { AudioSource } from '../hooks/useAudioAnalyzer';

type SyncPanelProps = {
  sync: UseSyncResult;
  audioSource: AudioSource;
  onAudioSourceChange: (src: AudioSource) => void;
  discoveredRooms?: Array<{ code: string; peerCount: number }>;
  onClose: () => void;
};

export function SyncPanel({ sync, audioSource, onAudioSourceChange, discoveredRooms = [], onClose }: SyncPanelProps) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#111', borderRadius: '16px 16px 0 0',
      padding: 24, zIndex: 50, fontFamily: 'sans-serif', color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18 }}>Sync Settings</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Audio source */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>Audio Source</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['mic', 'speaker'] as AudioSource[]).map((src) => (
            <button
              key={src}
              onClick={() => onAudioSourceChange(src)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: audioSource === src ? '#fff' : '#333',
                color: audioSource === src ? '#000' : '#fff',
                fontSize: 14,
              }}
            >
              {src === 'mic' ? '🎤 Mic' : '🔊 Speaker'}
            </button>
          ))}
        </div>
      </div>

      {/* Sync mode */}
      {sync.mode === 'off' ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={sync.createRoom}
              style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#6c47ff', color: '#fff', cursor: 'pointer', fontSize: 15 }}
            >
              Create Room
            </button>
          </div>

          {discoveredRooms.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Nearby Rooms</div>
              {discoveredRooms.map((r) => (
                <div
                  key={r.code}
                  onClick={() => sync.joinRoom(r.code)}
                  style={{ padding: '10px 12px', background: '#222', borderRadius: 8, marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span style={{ letterSpacing: 2, fontWeight: 'bold' }}>{r.code}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{r.peerCount} peer{r.peerCount !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={4}
              style={{ flex: 1, padding: '10px 12px', background: '#222', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' }}
            />
            <button
              onClick={() => joinCode.length === 4 && sync.joinRoom(joinCode)}
              disabled={joinCode.length !== 4}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: joinCode.length === 4 ? '#6c47ff' : '#333', color: '#fff', cursor: 'pointer', fontSize: 15 }}
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
              {sync.mode === 'host' ? 'Hosting Room' : 'Joined Room'}
            </div>
            <div style={{ fontSize: 48, fontWeight: 'bold', letterSpacing: 8 }}>{sync.roomCode}</div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              {sync.connected ? '🟢 Connected' : '🔴 Reconnecting...'}
            </div>
          </div>
          <button
            onClick={sync.disconnect}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontSize: 15 }}
          >
            Leave Room
          </button>
        </div>
      )}
    </div>
  );
}
