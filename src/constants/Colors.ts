export const colors = {
  primary: '#FD7402',
  primaryDark: '#D95E00',
  primaryLight: '#FF9A3D',
  primarySoft: '#FFF1E6',

  secondary: '#006C63',
  secondaryDark: '#014D4D',
  secondaryLight: '#DDF3F0',

  background: '#FD7402',
  screen: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F8F8',
  surfaceDark: '#103B37',

  text: '#14211F',
  textMuted: '#6F7D7A',
  textLight: '#FFFFFF',
  textDark: 'black',
  placeholder: '#9AA7A4',
  Searchplaceholder: '#FFFFFF99',

  border: '#E1E8E6',
  borderDark: '#B8C7C4',
  divider: '#EEF2F1',

  success: '#078C62',
  successSoft: '#E7F7F0',
  warning: '#F5A524',
  warningSoft: '#FFF6DF',
  error: '#D92D20',
  errorSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#EAF1FF',
  serachnputBorder: '#236E6E',

  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.45)',
  transparent: 'transparent',
  primaryWithOpacity: (opacity?: number) => `rgba(253, 116, 2, ${opacity ?? 1})`,
} as const;

export const theme = {
  colors,
} as const;

export type Colors = typeof colors;
export type Theme = typeof theme;

// backward compat alias
export const Colors = {
  ...colors,
  // legacy keys used across the app
  white: '#FFFFFF',
  black: '#14211F',
  black1: '#2A2A2A',
  blackSecondary: '#2A2A2A',
  bg: '#F6F8F8',
  Textgray: '#6F7D7A',
  gray: '#9AA7A4',
  red: '#FD7402',
  subtitle: '#6F7D7A',
  borderColor: '#E1E8E6',
  borderColor1: '#E1E8E6',
  borderColor2: '#E1E8E6',
  cardBg: '#F6F8F8',
  quoteBg: '#FFF1E6',
  liteCardBg: '#F6F8F880',
  price: '#6F7D7A',
  light: '#9AA7A4',
  green: '#078C62',
  lightRed: '#FDECEC',
  lightgreen: '#E7F7F0',
  yellowish: '#FF9A3D',
  completed: '#E7F7F033',
  completedText: '#078C62',
  imageUploadBox: '#FFF1E61A',
  iconContainerBg: '#FD74021A',
  forgot: '#006C63',
  secondary2: '#FF9A3D',
  primaryWithOpacity: (opacity?: number) => `rgba(253, 116, 2, ${opacity ?? 1})`,
};

export default theme;
