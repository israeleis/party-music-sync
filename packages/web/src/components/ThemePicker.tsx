import { useState, useEffect } from 'react';
import type { ThemeDefinition } from '../themes/types';
import type { ColorState } from '@partylight/core';

type ThemePickerProps = {
  themes: ThemeDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
};

function makeDemoColorState(): ColorState {
  const t = Date.now() / 1000;
  return {
    r: Math.round(128 + 127 * Math.sin(t * 0.7)),
    g: Math.round(128 + 127 * Math.sin(t * 1.1 + 2)),
    b: Math.round(128 + 127 * Math.sin(t * 0.9 + 4)),
    beat: Math.sin(t * 2) > 0.9,
    intensity: 0.5 + 0.4 * Math.sin(t * 1.3),
    timestamp: Date.now(),
  };
}

export function ThemePicker({ themes, selectedId, onSelect }: ThemePickerProps) {
  const [demoState, setDemoState] = useState<ColorState>(makeDemoColorState());

  useEffect(() => {
    const interval = setInterval(() => setDemoState(makeDemoColorState()), 1000 / 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <h1 style={{ color: '#fff', fontFamily: 'sans-serif', marginBottom: 32, fontSize: 28, letterSpacing: 4 }}>
        PARTYLIGHT
      </h1>
      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto',
        padding: '16px 32px', maxWidth: '100vw',
      }}>
        {themes.map((theme) => (
          <div
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            style={{
              flexShrink: 0, width: 160, height: 220,
              borderRadius: 12,
              border: theme.id === selectedId ? '2px solid #fff' : '2px solid transparent',
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
            }}
          >
            <theme.Component
              colorState={demoState}
              width={160}
              height={180}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.7)', padding: '8px 12px',
              color: '#fff', fontFamily: 'sans-serif', fontSize: 14,
              textAlign: 'center',
            }}>
              {theme.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
