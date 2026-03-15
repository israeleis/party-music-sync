import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { ThemeDefinition } from '../themes/types';
import type { ColorState } from '@partylight/core';

type ThemePickerProps = {
  themes: ThemeDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 200;

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
    const id = setInterval(() => setDemoState(makeDemoColorState()), 33);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PARTYLIGHT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.id}
            onPress={() => onSelect(theme.id)}
            style={[styles.card, theme.id === selectedId && styles.selectedCard]}
          >
            <View style={styles.preview} pointerEvents="none">
              <theme.Component colorState={demoState} width={CARD_WIDTH} height={CARD_HEIGHT - 40} />
            </View>
            <Text style={styles.label}>{theme.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 4, marginBottom: 32 },
  scroll: { paddingHorizontal: 16, gap: 12 },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selectedCard: { borderColor: '#fff' },
  preview: { flex: 1 },
  label: { color: '#fff', textAlign: 'center', padding: 8, backgroundColor: 'rgba(0,0,0,0.7)', fontSize: 13 },
});
