import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function LostSyncToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.text}>Lost sync — reconnecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#444',
  },
  text: { color: '#fff', fontSize: 14 },
});
