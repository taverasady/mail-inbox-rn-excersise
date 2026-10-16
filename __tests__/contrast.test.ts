import { avatarColors, colors } from '../src/theme/colors';
import { contrastRatio } from '../src/theme/contrast';

const AA_TEXT = 4.5;

test('contrastRatio matches known reference values', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  // Previous toast red, kept as a regression reference.
  expect(contrastRatio('#FFFFFF', '#FF3B30')).toBeLessThan(AA_TEXT);
});

test.each([
  ['secondary text on background', colors.secondaryLabel, colors.background],
  ['accent link on background', colors.accent, colors.background],
  ['white on accent button / read swipe / badge', colors.onFill, colors.accent],
  ['white on destructive toast / trash swipe', colors.onFill, colors.destructive],
  ['destructive text on white retry pill', colors.destructive, colors.onFill],
  ['white on archive swipe', colors.onFill, colors.archive],
  ['white text on toast', colors.onFill, colors.toastBackground],
  ['undo action on toast', colors.toastAction, colors.toastBackground],
])('%s meets AA', (_label, fg, bg) => {
  expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
});

test.each(avatarColors.map(c => [c]))('white initials on avatar %s meet AA', fill => {
  expect(contrastRatio(colors.onFill, fill)).toBeGreaterThanOrEqual(AA_TEXT);
});
