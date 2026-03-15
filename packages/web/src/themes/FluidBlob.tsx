import { useEffect, useRef } from 'react';
import type { ThemeProps } from './types';

export function FluidBlob({ colorState, width, height }: ThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(colorState);
  stateRef.current = colorState;
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const draw = () => {
      const cs = stateRef.current;
      timeRef.current += 0.01 + cs.intensity * 0.03;
      const t = timeRef.current;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseR = Math.min(canvas.width, canvas.height) * 0.25;

      ctx.beginPath();
      const POINTS = 64;
      for (let i = 0; i <= POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2;
        const noise =
          Math.sin(angle * 3 + t) * 0.15 +
          Math.sin(angle * 5 - t * 1.3) * 0.1 +
          Math.sin(angle * 7 + t * 0.7) * 0.07;
        const r = baseR * (1 + noise) * (cs.beat ? 1.2 : 1);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.3);
      grad.addColorStop(0, `rgba(${cs.r},${cs.g},${cs.b},0.9)`);
      grad.addColorStop(1, `rgba(${cs.r},${cs.g},${cs.b},0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      if (cs.beat) {
        ctx.shadowColor = `rgb(${cs.r},${cs.g},${cs.b})`;
        ctx.shadowBlur = 40;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
