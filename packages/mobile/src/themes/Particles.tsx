import React, { useRef, useEffect } from 'react';
import { Canvas, Circle, Rect } from '@shopify/react-native-skia';
import type { ThemeProps } from './types';

type Particle = {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
};

const MAX_PARTICLES = 150;
let nextId = 0;

export function Particles({ colorState, width, height }: ThemeProps) {
  const { r, g, b, beat, intensity } = colorState;
  const particlesRef = useRef<Particle[]>([]);

  // Clear stale particles from previous mount
  useEffect(() => {
    particlesRef.current = [];
  }, []);

  // Emit new particles
  const count = Math.floor(intensity * 3) + (beat ? 20 : 0);
  for (let i = 0; i < count && particlesRef.current.length < MAX_PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + intensity * 5 + (beat ? 6 : 0);
    particlesRef.current.push({
      id: nextId++,
      x: width / 2, y: height / 2,
      vx: Math.cos(angle) * speed * Math.random(),
      vy: Math.sin(angle) * speed * Math.random(),
      life: 1,
    });
  }

  // Update particles
  particlesRef.current = particlesRef.current
    .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vx: p.vx * 0.97, vy: p.vy * 0.97, life: p.life - 0.02 }))
    .filter((p) => p.life > 0);

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color="rgba(0,0,0,0.2)" />
      {particlesRef.current.map((p) => (
        <Circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={2}
          color={`rgba(${r},${g},${b},${p.life})`}
        />
      ))}
    </Canvas>
  );
}
