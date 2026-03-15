import React, { useRef } from 'react';
import { Canvas, Rect } from '@shopify/react-native-skia';
import type { ThemeProps } from './types';

const BAR_COUNT = 32;

export function Waveform({ colorState, width, height }: ThemeProps) {
  const { r, g, b, intensity } = colorState;
  const color = `rgb(${r},${g},${b})`;
  const barWidth = width / BAR_COUNT;
  const timeRef = useRef(0);
  timeRef.current += 0.033; // ~30fps increment

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const variation = Math.sin(i * 0.5 + timeRef.current) * 0.3;
    const h = Math.max(4, (intensity + variation) * height * 0.8);
    return { x: i * barWidth, h };
  });

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color="black" />
      {bars.map((bar, i) => (
        <Rect
          key={i}
          x={bar.x + 1}
          y={height - bar.h}
          width={barWidth - 2}
          height={bar.h}
          color={color}
        />
      ))}
    </Canvas>
  );
}
