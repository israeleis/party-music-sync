import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Modal } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const THEMES: ThemeDefinition[] = [
  { id: 'solid-wash', name: 'Solid Wash', Component: SolidWash },
  { id: 'waveform', name: 'Waveform', Component: Waveform },
  { id: 'geometric', name: 'Geometric', Component: Geometric },
  { id: 'fluid-blob', name: 'Fluid Blob', Component: FluidBlob },
  { id: 'particles', name: 'Particles', Component: Particles },
];

const NULL_COLOR_STATE: ColorState = { r: 0, g: 0, b: 0, beat: false, intensity: 0, timestamp: 0 };

function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [themeId, setThemeId] = useThemePersistence('solid-wash');
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [screen, setScreen] = useState<'picker' | 'player'>('picker');

  const audio = useAudioAnalyzer();
  const sync = useSync();

  // Drive 30fps re-renders so theme animations advance even when audio colorState
  // doesn't change (e.g. quiet room). Also ensures Skia canvas receives new children.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (screen !== 'player') return;
    let id: number;
    const loop = () => { setTick((t) => t + 1); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [screen]);

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

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub.remove();
  }, []);

  const activeTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const handleThemeSelect = useCallback(async (id: string) => {
    setThemeId(id);
    setScreen('player');
    if (!audio.isActive) await audio.start(audio.audioSource);
  }, [setThemeId, audio]);

  const handleAudioSourceChange = useCallback(async (src: import('./hooks/useAudioAnalyzer').AudioSource) => {
    await audio.start(src);
  }, [audio]);

  if (screen === 'picker') {
    return (
      <ThemePicker themes={THEMES} selectedId={themeId} onSelect={handleThemeSelect} />
    );
  }

  const btnTop = insets.top + 8;

  return (
    <View style={styles.container}>
      <activeTheme.Component
        colorState={activeColorState}
        width={dimensions.width}
        height={dimensions.height}
      />

      <LostSyncToast visible={sync.mode === 'peer' && sync.lostSync} />

      {audio.error && (
        <View style={[styles.errorBanner, { top: btnTop + 52 }]}>
          <Text style={styles.errorText}>🎤 {audio.error}</Text>
        </View>
      )}

      {!audio.isActive && !audio.error && sync.mode !== 'peer' && (
        <TouchableOpacity
          style={[styles.micBtn, { bottom: insets.bottom + 16 }]}
          onPress={() => audio.start()}
        >
          <Text style={styles.btnText}>🎤 Start mic</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.syncBtn, { top: btnTop }]} onPress={() => setShowSyncPanel(true)}>
        <Text style={styles.btnText}>{sync.mode === 'off' ? '⚡' : '🔗'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.themeBtn, { top: btnTop }]} onPress={() => setScreen('picker')}>
        <Text style={styles.btnText}>🎨</Text>
      </TouchableOpacity>

      <Modal visible={showSyncPanel} transparent animationType="slide" onRequestClose={() => setShowSyncPanel(false)}>
        <View style={styles.modalOverlay}>
          <SyncPanel
            sync={sync}
            audioSource={audio.audioSource}
            onAudioSourceChange={handleAudioSourceChange}
            onClose={() => setShowSyncPanel(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  syncBtn: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  themeBtn: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnText: { fontSize: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
  errorBanner: { position: 'absolute', left: 16, right: 16, backgroundColor: 'rgba(200,0,0,0.85)', borderRadius: 8, padding: 10 },
  errorText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  micBtn: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
});
