


import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';

import Image1 from '../assets/svg/image-1.svg';
import Image2 from '../assets/svg/image-2.svg';
import AppLogo from '../assets/svg/applogo.svg';

import {
  scale,
  verticalScale,
  fontScale,
} from '../utils/scaling';

import { Colors } from '../constants/Colors';

interface OnboardingScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const onboardingData = [
  {
    image: Image1,
    title: 'Goods delivery is now cheaper and easier',
    subtitle:
      'Managing goods delivery has become simpler than ever, creating a transport logistics marketplace which has more options and competitive advantages.',
  },
  {
    image: Image2,
    title: 'Fast and Reliable Service',
    subtitle:
      'Get your packages delivered quickly with our network of trusted drivers and real-time tracking system.',
  },

];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ImageComponent = onboardingData[currentIndex].image;

  const handleContinue = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onNavigateToLogin();
    }
  };

  const handleSkip = () => {
    onNavigateToLogin();
  };

  return (
    <SafeWrapper>
      {/* 🔑 ScrollView ONLY for safety – UI stays same */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <AppLogo width={scale(103)} height={verticalScale(75)} />
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip >></Text>
            </TouchableOpacity>
          </View>

          {/* Image */}
          <View style={styles.imageContainer}>
            <ImageComponent
              width={scale(387)}
              height={verticalScale(342)}
            />
          </View>

          {/* Dots */}
        

          {/* Text */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {onboardingData[currentIndex].title}
            </Text>

            <Text style={styles.subtitle} numberOfLines={4}>
              {onboardingData[currentIndex].subtitle}
            </Text>
          </View>

  <View style={styles.dotsContainer}>
            {onboardingData.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === currentIndex
                        ? Colors.primary
                        : '#F13A1A33',
                  },
                ]}
              />
            ))}
          </View>
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Continue"
              backgroundColor={Colors.primary}
              textColor="#fff"
              onPress={handleContinue}
            />
            <CustomButton
              title="I'm new, Sign me Up"
              backgroundColor="transparent"
              textColor="#212121"
              style={styles.signupButton}
              onPress={onNavigateToRegister}
            />
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By Login or Register, You agree to our{' '}
              <Text style={styles.termsLink}>Terms of service</Text>{' '}
              and{' '}
              <Text style={styles.termsLink}>
                Terms and Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeWrapper>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  scrollContent: {
     // ✅ BOTTOM SAFE SPACE
     flex: 1,
  },

  container: {
    height: '100%', // 🎯 DESIGN HEIGHT (FIXED)
    paddingHorizontal: scale(27)
  },

  header: {
    marginTop:verticalScale(20),
    // paddingHorizontal: scale(34),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    left: scale(7)
  },

  skipText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik',
    color: Colors.primary,
  },

  imageContainer: {
    marginTop:verticalScale(55),
  },

  dotsContainer: {
    marginTop:verticalScale(13),
   
    flexDirection: 'row',
    justifyContent: "center",
    gap: scale(6),
  },
   content: {
    marginTop:verticalScale(50),
    // top: verticalScale(545),
    // left: scale(34),
    // width: scale(38),
    alignItems: 'center',
  },

  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },

 

title: {
  fontSize: fontScale(16),
  // lineHeight: fontScale(18),
  fontFamily: 'Baloo',
  fontWeight: '800',
  letterSpacing: -0.1,
  textAlign: 'center',
  color: '#212121',
  left: scale(7)
  // includeFontPadding: false, // 🔥 space kam karega
},

  subtitle: {
    fontSize: fontScale(14),
    lineHeight: verticalScale(20),
    fontFamily: 'Rubik',
    textAlign: 'center',
    color: Colors.secondary,
  },

  buttonContainer: {
  marginTop:verticalScale(16),
    // top: verticalScale(700),
    left: scale(7),
    gap: verticalScale(8),
  },

  signupButton: {
    width: scale(372),
    height: verticalScale(50),
    borderWidth: 1,
    borderColor: '#CDCDCD',
    backgroundColor: 'transparent',
  },

  termsContainer: {
    position: 'absolute',
    top: verticalScale(835),
    left: scale(34),
    width: scale(352),
    alignItems: 'center',
  },

  termsText: {
    fontSize: fontScale(14),
    lineHeight: verticalScale(20),
    color: Colors.secondary,
  },

  termsLink: {
    color: Colors.primary,
  },
});

