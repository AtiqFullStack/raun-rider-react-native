import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppLogo from '../assets/svg/applogo.svg';
import { getPixelSize } from '../utils/responsive';
import GlobalStatusBar from '../components/GlobalStatusBar';
import { scale, verticalScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { Text } from 'react-native';
import { FONTS } from '../utils/fonts';
import Divide from '../assets/svg/divide.svg';
import { strings } from '../constants/strings';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

const TOP_HEIGHT = height * 0.55;
const BOTTOM_HEIGHT = height * 0.45;

interface SplashScreenProps {
  onFinish?: (screen: string) => void;
}
const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { isLoggedIn, loading } = useAuth();
  useEffect(() => {
    if (loading) return; // wait for auth to finish loading

    const timer = setTimeout(() => {
      if (isLoggedIn) {
        onFinish?.('home');
      } else {
        onFinish?.('login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, isLoggedIn]);

  return (
    <View style={styles.container}>
      <GlobalStatusBar />
      <Image 
      source={require('../assets/images/splashImage.png')}
      style={{
        height:"100%",
        width:"100%",
      }}
      />
     
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryDark, // 🔥 FULL BG
      overflow: 'visible',
  },

  topContent: {
    height: TOP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  gradientStrip: {
    height: 80, // 👈 rectangle height (adjust if needed)
    width: '100%',
  },

  bottomSection: {
    flex: 1, // remaining space
  },

  bottomImage: {
    width: '100%',
    height: '100%',
  },

  titleContainer: {
    alignItems: 'center',
    // top: 80,
  },

  titleWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  logoWrapper: {
    alignSelf: 'center',
    width: 256,
    // top: 100,
    height: 256,
    borderRadius: 128,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
  },

  whiteText: {
    color: Colors.white,
    fontSize: scale(40),
    fontFamily: 'Baloo2-ExtraBold',
    textAlign: 'center',
  },

  deliverText: {
    color: Colors.yellowish,
    fontSize: scale(40),
    fontFamily: 'Baloo2-ExtraBold',
    textAlign: 'center',
  },
});
