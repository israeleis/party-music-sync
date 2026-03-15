import { useEffect, useRef } from 'react';
import type { ThemeProps } from './types';

const DISPLAY_BARS = 64;

export function Waveform({ colorState, frequencyData, width, height }: ThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ colorState, frequencyData });
  stateRef.current = { colorState, frequencyData };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const draw = () => {
      const { colorState: cs, frequencyData: fd } = stateRef.current;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / DISPLAY_BARS;
      const binsPerBar = fd ? Math.floor(fd.length / DISPLAY_BARS) : 0;

      for (let i = 0; i < DISPLAY_BARS; i++) {
        let avg = 0;
        if (fd && binsPerBar > 0) {
          for (let b = 0; b < binsPerBar; b++) avg += fd[i * binsPerBar + b];
          avg /= binsPerBar * 255;
        }
        const barHeight = avg * canvas.height;
        const x = i * barWidth;
        ctx.fillStyle = `rgb(${cs.r},${cs.g},${cs.b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
