import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlobalStatusBar from './GlobalStatusBar';

interface SafeWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

const SafeWrapper: React.FC<SafeWrapperProps> = ({
  children,
  style,
  backgroundColor = '#fff',
}) => {
  return (
    <>
      <GlobalStatusBar />
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor }]}
        edges={['left', 'right', 'bottom']}
      >
        <View style={[styles.container, style]}>{children}</View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default SafeWrapper;
