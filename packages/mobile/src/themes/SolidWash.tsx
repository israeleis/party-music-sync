import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import type { ThemeProps } from './types';

export function SolidWash({ colorState, width, height }: ThemeProps) {
  const { r, g, b } = colorState;
  const color = `rgb(${r},${g},${b})`;
  return (
    <AnimatedCanvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color={color} />
    </AnimatedCanvas>
  );
}
