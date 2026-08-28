import { PixelRatio } from 'react-native';

// Fixed pixel utility
export const getPixelSize = (size: number) => {
  return PixelRatio.getPixelSizeForLayoutSize(size);
};

// Font size utility
export const getFontSize = (size: number) => {
  return size / PixelRatio.getFontScale();
};