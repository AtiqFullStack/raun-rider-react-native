// import React from 'react';
// import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
// import { scale, verticalScale, moderateScale, fontScale } from '../utils/scaling';

// interface CustomButtonProps {
//   title: string;
//   onPress: () => void;
//   backgroundColor?: string;
//   radius?: number;
//   textColor?: string;
//   style?: ViewStyle;
//   textStyle?: TextStyle;
//   disabled?: boolean;
//   fontFamily?: 'Baloo' | 'Rubik';
// }

// const CustomButton: React.FC<CustomButtonProps> = ({
//   title,
//   onPress,
//   backgroundColor = '#F13A1A',
//   textColor = '#fff',
//   radius = 10,
//   style,
//   textStyle,
//   disabled = false,
//   fontFamily = 'Rubik',
// }) => {
//   return (
//     <TouchableOpacity
//       style={[
//         styles.button,
//         { backgroundColor: disabled ? '#ccc' : backgroundColor, borderRadius: moderateScale(radius) },
//         style,
//       ]}
//       onPress={onPress}
//       disabled={disabled}
//       activeOpacity={0.8}
//     >
//       <Text style={[styles.buttonText, { color: textColor, fontFamily }, textStyle]}>
//         {title}
//       </Text>
//     </TouchableOpacity>
//   );
// };

// export default CustomButton;

// const styles = StyleSheet.create({
//   button: {
//     width: scale(340),
//     height: verticalScale(50),
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   buttonText: {
//     fontSize: fontScale(16),
//     fontWeight: '500',
//     lineHeight: verticalScale(20),
//   },
// });


import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { scale, verticalScale, fontScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  backgroundColor?: string; // Fill color
  textColor?: string;       // Text color
  radius?: number;
  borderWidth?: number;     // Optional
  borderColor?: string;     // Optional
  width?: number;
  height?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  fontFamily?: 'Rubik' | 'Baloo';
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  backgroundColor = '#fff',
  textColor = '#353535',
  radius = 10,
  borderWidth,
  borderColor,
  width = 372,
  height = 50,
  style,
  textStyle,
  disabled = false,
  fontFamily = 'Rubik-Regular',
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? Colors.secondaryDark : backgroundColor,
          borderRadius: scale(radius),
          width: scale(width),
          height: verticalScale(height),
          // Apply border only if borderWidth is provided
          ...(borderWidth ? { borderWidth: borderWidth, borderColor: borderColor || '#000' } : {}),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          { color: textColor, fontFamily },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: fontScale(16),
    fontFamily:'Rubik-Medium',
    lineHeight: fontScale(34),
    textAlign: 'center',
    letterSpacing: 0,
  },
});

export default CustomButton;
