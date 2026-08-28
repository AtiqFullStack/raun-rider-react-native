import React from 'react';
import { View, Image } from 'react-native';
import { Images, Icons } from '../assets';

// SVG imports (after installing react-native-svg)
// import HomeIcon from '../assets/svg/home.svg';
// import LogoSvg from '../assets/svg/logo.svg';

export const AssetExample = () => {
  return (
    <View>
      {/* PNG Images */}
      <Image source={Images.logo} style={{width: 100, height: 100}} />
      
      {/* PNG Icons */}
      <Image source={Icons.home} style={{width: 24, height: 24}} />
      

    </View>
  );
};