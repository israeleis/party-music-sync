import React, { useRef } from 'react';
import { Path, Rect, Skia } from '@shopify/react-native-skia';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import type { ThemeProps } from './types';

export function FluidBlob({ colorState, width, height }: ThemeProps) {
  const timeRef = useRef(0);
  timeRef.current += 0.02 + colorState.intensity * 0.03;

  const { r, g, b, beat } = colorState;
  const cx = width / 2;
  const cy = height / 2;
  const baseR = Math.min(width, height) * 0.28;
  const t = timeRef.current;

  const path = Skia.Path.Make();
  const POINTS = 48;
  for (let i = 0; i <= POINTS; i++) {
    const angle = (i / POINTS) * Math.PI * 2;
    const noise =
      Math.sin(angle * 3 + t) * 0.15 +
      Math.sin(angle * 5 - t * 1.3) * 0.1 +
      Math.sin(angle * 7 + t * 0.7) * 0.07;
    const rr = baseR * (1 + noise) * (beat ? 1.2 : 1);
    const x = cx + rr * Math.cos(angle);
    const y = cy + rr * Math.sin(angle);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.close();

  return (
    <AnimatedCanvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color="black" />
      <Path path={path} color={`rgba(${r},${g},${b},0.85)`} style="fill" />
    </AnimatedCanvas>
  );
}
