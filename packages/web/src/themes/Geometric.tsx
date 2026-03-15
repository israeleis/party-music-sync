import { useEffect, useRef } from 'react';
import type { ThemeProps } from './types';

function drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, angle: number) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * Math.PI * 2) / sides;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function Geometric({ colorState, width, height }: ThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(colorState);
  stateRef.current = colorState;
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const draw = () => {
      const cs = stateRef.current;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseR = Math.min(canvas.width, canvas.height) * 0.3;
      const scale = cs.beat ? 1.3 : 1 + cs.intensity * 0.2;
      angleRef.current += 0.005 + cs.intensity * 0.02;

      const shapes = [
        { sides: 3, rMult: 0.5 },
        { sides: 6, rMult: 0.75 },
        { sides: 12, rMult: 1.0 },
      ];

      shapes.forEach(({ sides, rMult }, i) => {
        const angle = angleRef.current * (i % 2 === 0 ? 1 : -1);
        drawPolygon(ctx, cx, cy, baseR * scale * rMult, sides, angle);
        ctx.strokeStyle = `rgba(${cs.r},${cs.g},${cs.b},${0.4 + i * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
