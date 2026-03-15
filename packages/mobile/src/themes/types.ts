import type { ColorState } from '@partylight/core';

export type ThemeProps = {
  colorState: ColorState;
  width: number;
  height: number;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  Component: React.ComponentType<ThemeProps>;
};
