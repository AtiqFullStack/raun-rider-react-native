import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fontScale, scale, verticalScale } from '../utils/scaling';

const NetworkBanner = () => {
  const { isConnected } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(100)).current;
  const prevConnected = useRef(true);

  useEffect(() => {
    if (!isConnected) {
      // Slide up — show banner
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else if (prevConnected.current === false) {
      // Was offline, now online — show "Connected" briefly then hide
      Animated.sequence([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.delay(1500),
        Animated.spring(translateY, {
          toValue: 100,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
      ]).start();
    }
    prevConnected.current = isConnected;
  }, [isConnected]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={[styles.banner, isConnected ? styles.online : styles.offline]}>
        <Text style={styles.dot}>{isConnected ? '●' : '●'}</Text>
        <Text style={styles.text}>
          {isConnected ? 'Back Online' : 'No Internet Connection'}
        </Text>
      </View>
    </Animated.View>
  );
};

export default NetworkBanner;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: verticalScale(20),
    left: scale(16),
    right: scale(16),
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  offline: {
    backgroundColor: '#1C1C1E',
  },
  online: {
    backgroundColor: '#16A34A',
  },
  dot: {
    fontSize: fontScale(10),
    color: '#fff',
  },
  text: {
    color: '#fff',
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(13),
  },
});
