/**
 * App palette. Every text/fill pairing here meets WCAG AA (4.5:1) for the
 * 11–17pt text sizes used in the app; see __tests__/contrast.test.ts.
 */
export const colors = {
  background: '#FFFFFF',
  label: '#000000',
  secondaryLabel: '#6C6C70',
  separator: '#C6C6C8',
  onFill: '#FFFFFF',
  accent: '#0062CC',
  destructive: '#D70015',
  archive: '#6C6C70',
  toastBackground: '#2C2C2E',
  toastAction: '#64B5FF',
} as const;

/** Avatar fills; each keeps white initials at or above 4.5:1. */
export const avatarColors = [
  '#0B5CAD',
  '#B3261E',
  '#1E7A46',
  '#7B3FBF',
  '#A0510A',
  '#0E7C7B',
  '#C2185B',
  '#4A3FBF',
] as const;
