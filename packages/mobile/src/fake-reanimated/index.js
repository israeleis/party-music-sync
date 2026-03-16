// Fake reanimated stub — version 0.0.0 makes Skia's HAS_REANIMATED_3 = false,
// so Skia uses StaticContainer (frames driven by requestAnimationFrame).
// Stubs prevent crashes from Skia's module-level initialization calls.
module.exports = {
  createWorkletRuntime: () => ({}),
  runOnRuntime: () => () => {},
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
  startMapper: () => null,
  stopMapper: () => {},
  useSharedValue: (init) => ({ value: init }),
  useDerivedValue: () => ({ value: undefined }),
  useFrameCallback: () => {},
  makeMutable: (init) => ({ value: init }),
};
