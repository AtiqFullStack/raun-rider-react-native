import React from 'react';
import { StatusBar, Platform } from 'react-native';

const GlobalStatusBar = () => {
  return (
    <StatusBar
      barStyle="dark-content"
      backgroundColor="transparent"
      translucent={false}
    />
  );
};

export default GlobalStatusBar;