import { useEffect, useRef } from 'react';
import type { ThemeProps } from './types';

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
};

export function Particles({ colorState, width, height }: ThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(colorState);
  stateRef.current = colorState;
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const emit = (count: number, speed: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.5 + Math.random() * 0.5);
        particlesRef.current.push({
          x: canvas.width / 2, y: canvas.height / 2,
          vx: Math.cos(angle) * s, vy: Math.sin(angle) * s,
          life: 1, maxLife: 1,
        });
      }
    };

    const draw = () => {
      const cs = stateRef.current;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Emit particles
      const emitCount = Math.floor(cs.intensity * 3);
      if (emitCount > 0) emit(emitCount, 3 + cs.intensity * 4);
      if (cs.beat) emit(20, 8);

      // Update and draw
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= 0.02;
        if (p.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cs.r},${cs.g},${cs.b},${p.life})`;
        ctx.fill();
        return true;
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
