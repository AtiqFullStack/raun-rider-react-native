import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

const GlobalStatusBar = () => {
  return (
    <StatusBar
      barStyle="light-content"
      backgroundColor={'red'}
      translucent={false}
    />
  );
};

export default GlobalStatusBar;