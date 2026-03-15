import { useEffect, useRef } from 'react';
import type { ThemeProps } from './types';

export function SolidWash({ colorState, width, height }: ThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(colorState);
  stateRef.current = colorState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const draw = () => {
      const { r, g, b } = stateRef.current;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
