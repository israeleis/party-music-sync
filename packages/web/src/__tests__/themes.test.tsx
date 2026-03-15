import { render } from '@testing-library/react';
import { SolidWash } from '../themes/SolidWash';
import { Waveform } from '../themes/Waveform';
import { Geometric } from '../themes/Geometric';
import { FluidBlob } from '../themes/FluidBlob';
import { Particles } from '../themes/Particles';
import type { ColorState } from '@partylight/core';

const mockState: ColorState = { r: 100, g: 200, b: 50, beat: false, intensity: 0.5, timestamp: 1000 };
const mockFreqData = new Uint8Array(1024).fill(128);
const props = { colorState: mockState, width: 300, height: 200 };

// Canvas API not available in happy-dom - provide minimal mock
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
  }) as any;

  global.requestAnimationFrame = (cb) => setTimeout(cb, 0) as unknown as number;
  global.cancelAnimationFrame = (id) => clearTimeout(id);
});

test('SolidWash renders', () => { expect(() => render(<SolidWash {...props} />)).not.toThrow(); });
test('Waveform renders', () => { expect(() => render(<Waveform {...props} frequencyData={mockFreqData} />)).not.toThrow(); });
test('Geometric renders', () => { expect(() => render(<Geometric {...props} />)).not.toThrow(); });
test('FluidBlob renders', () => { expect(() => render(<FluidBlob {...props} />)).not.toThrow(); });
test('Particles renders', () => { expect(() => render(<Particles {...props} />)).not.toThrow(); });
