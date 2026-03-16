import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Canvas, useCanvasRef } from '@shopify/react-native-skia';
import type { ViewStyle } from 'react-native';

type Props = {
  style: ViewStyle | ViewStyle[];
  children: React.ReactNode;
};

export function AnimatedCanvas({ style, children }: Props) {
  const ref = useCanvasRef();
  const keepAlive = useRef(new Animated.Value(0)).current;
  const renderCountRef = useRef(0);
  const redrawCountRef = useRef(0);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(keepAlive, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(keepAlive, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    console.log('[canvas] keepAlive animation started');
    return () => anim.stop();
  }, [keepAlive]);

  // Runs after every render — no dep array intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    renderCountRef.current += 1;
    const canvas = ref.current;
    if (canvas) {
      canvas.redraw();
      redrawCountRef.current += 1;
      if (redrawCountRef.current % 30 === 0) {
        console.log(`[canvas] redraw #${redrawCountRef.current} (render #${renderCountRef.current}) — ref OK`);
      }
    } else {
      console.warn(`[canvas] render #${renderCountRef.current} — ref.current is NULL, skipping redraw`);
    }
  });

  return (
    <Animated.View
      style={[style, {
        opacity: keepAlive.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9999] }),
      }]}
    >
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        {children}
      </Canvas>
    </Animated.View>
  );
}
