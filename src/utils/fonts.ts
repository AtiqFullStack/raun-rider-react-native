export const FONTS = {
  BALOO: 'Baloo',
  RUBIK: 'Rubik',
} as const;

export type FontFamily = typeof FONTS[keyof typeof FONTS];