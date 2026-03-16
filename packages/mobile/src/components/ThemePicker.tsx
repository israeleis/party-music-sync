import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { ThemeDefinition } from '../themes/types';
import type { ColorState } from '@partylight/core';

type ThemePickerProps = {
  themes: ThemeDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48) / COLUMNS); // 16 outer padding + 16 gap
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.3);
const PREVIEW_HEIGHT = CARD_HEIGHT - 36;

function makeDemoColorState(): ColorState {
  const t = Date.now() / 1000;
  return {
    r: Math.round(128 + 127 * Math.sin(t * 0.7)),
    g: Math.round(128 + 127 * Math.sin(t * 1.1 + 2)),
    b: Math.round(128 + 127 * Math.sin(t * 0.9 + 4)),
    beat: Math.sin(t * 2) > 0.9,
    intensity: 0.5 + 0.4 * Math.sin(t * 1.3),
    timestamp: Date.now(),
  };
}

export function ThemePicker({ themes, selectedId, onSelect }: ThemePickerProps) {
  const [demoState, setDemoState] = useState<ColorState>(makeDemoColorState());

  useEffect(() => {
    let id: number;
    const loop = () => {
      setDemoState(makeDemoColorState());
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  // Pair themes into rows of 2
  const rows: ThemeDefinition[][] = [];
  for (let i = 0; i < themes.length; i += COLUMNS) {
    rows.push(themes.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PARTYLIGHT</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                onPress={() => onSelect(theme.id)}
                style={[styles.card, theme.id === selectedId && styles.selectedCard]}
              >
                <View style={styles.preview} pointerEvents="none">
                  <theme.Component colorState={demoState} width={CARD_WIDTH} height={PREVIEW_HEIGHT} />
                </View>
                <Text style={styles.label}>{theme.name}</Text>
              </TouchableOpacity>
            ))}
            {/* Fill empty slot in last row */}
            {row.length < COLUMNS && <View style={styles.card} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center', paddingTop: 48, paddingBottom: 24 },
  grid: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: '#111' },
  selectedCard: { borderColor: '#fff' },
  preview: { flex: 1 },
  label: { color: '#fff', textAlign: 'center', paddingVertical: 8, fontSize: 13 },
});
