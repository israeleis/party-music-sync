import React, { useRef } from 'react';
import { Canvas, Path, Rect, Skia } from '@shopify/react-native-skia';
import type { ThemeProps } from './types';

function makePolygonPath(cx: number, cy: number, r: number, sides: number, angle: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * Math.PI * 2) / sides;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.close();
  return path;
}

export function Geometric({ colorState, width, height }: ThemeProps) {
  const angleRef = useRef(0);
  angleRef.current += 0.01 + colorState.intensity * 0.02;

  const { r, g, b, beat, intensity } = colorState;
  const cx = width / 2;
  const cy = height / 2;
  const baseR = Math.min(width, height) * 0.3;
  const scale = beat ? 1.3 : 1 + intensity * 0.2;

  const shapes = [
    { sides: 3, rMult: 0.5, alpha: 0.4 },
    { sides: 6, rMult: 0.75, alpha: 0.6 },
    { sides: 12, rMult: 1.0, alpha: 0.8 },
  ];

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color="black" />
      {shapes.map(({ sides, rMult, alpha }, i) => {
        const angle = angleRef.current * (i % 2 === 0 ? 1 : -1);
        const path = makePolygonPath(cx, cy, baseR * scale * rMult, sides, angle);
        return (
          <Path
            key={i}
            path={path}
            color={`rgba(${r},${g},${b},${alpha})`}
            style="stroke"
            strokeWidth={2}
          />
        );
      })}
    </Canvas>
  );
}
