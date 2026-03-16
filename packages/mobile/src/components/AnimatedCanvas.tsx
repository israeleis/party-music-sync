import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { ViewStyle } from 'react-native';

type Props = {
  style: ViewStyle | ViewStyle[];
  children: React.ReactNode;
};

/**
 * With NativeReanimatedContainer (reanimated installed), Skia updates the
 * picture directly on the UI thread via runOnUI and invalidates automatically.
 * No manual requestRedraw or keepAlive animation needed.
 */
export function AnimatedCanvas({ style, children }: Props) {
  return (
    <Canvas style={style}>
      {children}
    </Canvas>
  );
}
