import { useState, useEffect, useCallback } from 'react';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useSync } from './hooks/useSync';
import { useThemePersistence } from './hooks/useThemePersistence';
import { ThemePicker } from './components/ThemePicker';
import { SyncPanel } from './components/SyncPanel';
import { LostSyncToast } from './components/LostSyncToast';
import { SolidWash } from './themes/SolidWash';
import { Waveform } from './themes/Waveform';
import { Geometric } from './themes/Geometric';
import { FluidBlob } from './themes/FluidBlob';
import { Particles } from './themes/Particles';
import type { ThemeDefinition } from './themes/types';
import type { ColorState } from '@partylight/core';
import type { AudioSource } from './hooks/useAudioAnalyzer';

const THEMES: ThemeDefinition[] = [
  { id: 'solid-wash', name: 'Solid Wash', Component: SolidWash },
  { id: 'waveform', name: 'Waveform', Component: Waveform },
  { id: 'geometric', name: 'Geometric', Component: Geometric },
  { id: 'fluid-blob', name: 'Fluid Blob', Component: FluidBlob },
  { id: 'particles', name: 'Particles', Component: Particles },
];

const SERVER_BASE = import.meta.env.VITE_PARTYLIGHT_SERVER_URL?.replace('wss://', 'https://').replace('ws://', 'http://') ?? 'https://relay.partylight.app';

const NULL_COLOR_STATE: ColorState = { r: 0, g: 0, b: 0, beat: false, intensity: 0, timestamp: 0 };

export default function App() {
  const [screen, setScreen] = useState<'picker' | 'player'>('picker');
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('mic');
  const [discoveredRooms, setDiscoveredRooms] = useState<Array<{ code: string; peerCount: number }>>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [themeId, setThemeId] = useThemePersistence('solid-wash');
  const audio = useAudioAnalyzer();
  const sync = useSync();

  // Use peer color state when in peer mode and synced, otherwise use local audio
  const activeColorState: ColorState =
    sync.mode === 'peer' && sync.peerColorState != null
      ? sync.peerColorState
      : audio.colorState ?? NULL_COLOR_STATE;

  // Publish frames when hosting
  useEffect(() => {
    if (sync.mode === 'host' && audio.colorState) {
      sync.publishFrame(audio.colorState);
    }
  }, [audio.colorState, sync.mode, sync.publishFrame]);

  // Window resize
  useEffect(() => {
    const handler = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Poll /rooms for discovery
  useEffect(() => {
    if (sync.mode !== 'off') return;
    const poll = async () => {
      try {
        const res = await fetch(`${SERVER_BASE}/rooms`);
        if (res.ok) setDiscoveredRooms(await res.json());
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [sync.mode]);

  const activeTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const handleThemeSelect = useCallback(async (id: string) => {
    setThemeId(id);
    setScreen('player');
    if (!audio.isActive) await audio.start(audioSource);
  }, [setThemeId, audio, audioSource]);

  const handleAudioSourceChange = useCallback(async (src: AudioSource) => {
    setAudioSource(src);
    if (audio.isActive) await audio.start(src);
  }, [audio]);

  if (screen === 'picker') {
    return (
      <ThemePicker
        themes={THEMES}
        selectedId={themeId}
        onSelect={handleThemeSelect}
      />
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      <activeTheme.Component
        colorState={activeColorState}
        frequencyData={audio.frequencyData ?? undefined}
        width={dimensions.width}
        height={dimensions.height}
      />

      <LostSyncToast visible={sync.mode === 'peer' && sync.lostSync} />

      {/* Floating sync button */}
      <button
        onClick={() => setShowSyncPanel(!showSyncPanel)}
        style={{
          position: 'fixed', top: 16, right: 16,
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: 44, height: 44,
          color: '#fff', fontSize: 20, cursor: 'pointer', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {sync.mode === 'off' ? '⚡' : '🔗'}
      </button>

      {/* Theme picker button */}
      <button
        onClick={() => setScreen('picker')}
        style={{
          position: 'fixed', top: 16, left: 16,
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: 44, height: 44,
          color: '#fff', fontSize: 18, cursor: 'pointer', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        🎨
      </button>

      {showSyncPanel && (
        <SyncPanel
          sync={sync}
          audioSource={audioSource}
          onAudioSourceChange={handleAudioSourceChange}
          discoveredRooms={discoveredRooms}
          onClose={() => setShowSyncPanel(false)}
        />
      )}
    </div>
  );
}
