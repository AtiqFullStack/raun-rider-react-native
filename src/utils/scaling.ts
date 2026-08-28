import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

const DESIGN_WIDTH = 440;
const DESIGN_HEIGHT = 956;

export const scale = (size: number) =>
  (width / DESIGN_WIDTH) * size;

export const verticalScale = (size: number) =>
  (height / DESIGN_HEIGHT) * size;

export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const fontScale = (size: number) =>
  size / PixelRatio.getFontScale();


export const  vw =(percentage:any) =>{
return width * percentage/100
}
export const  vh =(percentage:any) =>{
    return height * percentage/100
}
