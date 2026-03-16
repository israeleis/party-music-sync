import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Settings</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
      </View>

      <View style={styles.sourceRow}>
        <Text style={styles.sourceLabel}>Audio input</Text>
        <View style={styles.sourceToggle}>
          {(['mic', 'speaker'] as AudioSource[]).map((src) => (
            <TouchableOpacity
              key={src}
              style={[styles.sourceBtn, audioSource === src && styles.sourceBtnActive]}
              onPress={() => onAudioSourceChange(src)}
            >
              <Text style={[styles.sourceBtnText, audioSource === src && styles.sourceBtnTextActive]}>
                {src === 'mic' ? '🎤 Mic' : '🔊 Speaker'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {audioSource === 'speaker' && (
          <Text style={styles.sourceNote}>Uses mic to pick up room audio (direct capture not supported on mobile)</Text>
        )}
      </View>

      {sync.mode === 'off' ? (
        <ScrollView>
          <TouchableOpacity style={styles.primaryBtn} onPress={sync.createRoom}>
            <Text style={styles.primaryBtnText}>Create Room</Text>
          </TouchableOpacity>

          {discoveredRooms.map((r) => (
            <TouchableOpacity key={r.code} style={styles.roomItem} onPress={() => sync.joinRoom(r.code)}>
              <Text style={styles.roomCode}>{r.code}</Text>
              <Text style={styles.peerCount}>{r.peerCount} peer{r.peerCount !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.joinRow}>
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="ROOM CODE"
              placeholderTextColor="#555"
              maxLength={4}
              autoCapitalize="characters"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => joinCode.length === 4 && sync.joinRoom(joinCode)}
              style={[styles.joinBtn, joinCode.length !== 4 && styles.joinBtnDisabled]}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.activeRoom}>
          <Text style={styles.roomRole}>{sync.mode === 'host' ? 'Hosting Room' : 'Joined Room'}</Text>
          <Text style={styles.bigCode}>{sync.roomCode}</Text>
          <Text style={styles.connStatus}>{sync.connected ? '🟢 Connected' : '🔴 Reconnecting...'}</Text>
          <TouchableOpacity style={styles.leaveBtn} onPress={sync.disconnect}>
            <Text style={styles.leaveBtnText}>Leave Room</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#111', borderRadius: 16, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  close: { color: '#fff', fontSize: 20 },
  primaryBtn: { backgroundColor: '#6c47ff', padding: 14, borderRadius: 10, marginBottom: 16 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  roomItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#222', padding: 12, borderRadius: 8, marginBottom: 8 },
  roomCode: { color: '#fff', fontWeight: 'bold', letterSpacing: 2 },
  peerCount: { color: '#888', fontSize: 13 },
  joinRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, fontSize: 18, letterSpacing: 4 },
  joinBtn: { backgroundColor: '#6c47ff', padding: 12, borderRadius: 8, justifyContent: 'center' },
  joinBtnDisabled: { backgroundColor: '#333' },
  joinBtnText: { color: '#fff', fontWeight: '600' },
  activeRoom: { alignItems: 'center', paddingVertical: 20 },
  roomRole: { color: '#888', fontSize: 13, marginBottom: 8 },
  bigCode: { color: '#fff', fontSize: 52, fontWeight: 'bold', letterSpacing: 10 },
  connStatus: { color: '#888', fontSize: 13, marginTop: 8 },
  leaveBtn: { backgroundColor: '#333', padding: 14, borderRadius: 10, marginTop: 24, width: '100%' },
  leaveBtnText: { color: '#fff', textAlign: 'center', fontSize: 16 },
  sourceRow: { marginBottom: 20 },
  sourceLabel: { color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  sourceToggle: { flexDirection: 'row', gap: 8 },
  sourceBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#222', alignItems: 'center' },
  sourceBtnActive: { backgroundColor: '#6c47ff' },
  sourceBtnText: { color: '#888', fontSize: 14, fontWeight: '500' },
  sourceBtnTextActive: { color: '#fff' },
  sourceNote: { color: '#555', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});
