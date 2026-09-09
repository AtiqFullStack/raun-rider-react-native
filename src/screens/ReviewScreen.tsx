import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, Colors } from '../constants/Colors';
import { scale, verticalScale, fontScale } from '../utils/scaling';
import { FONTS } from '../utils/fonts';
import { strings } from '../constants/strings';

const ReviewScreen = ({ onGoHome, onNavigateToLogin }: any) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigateToLogin();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onNavigateToLogin]);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{strings.profileUnderReview}</Text>
        <Text style={styles.headerSubtitle}>
      Your Profile Under Review
        </Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Image
          source={require('../assets/images/review.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>{strings.detailsBeingVerified}</Text>
        <Text style={styles.subtitle}>
          {strings.reviewMessage}
        </Text>
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => onNavigateToLogin()}
        activeOpacity={0.9}
      >
        <Text style={styles.buttonText}>{strings.home}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ReviewScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    backgroundColor: Colors.primary,
    height: verticalScale(160),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },

  headerTitle: {
    fontSize: fontScale(20),
    fontWeight: '700',
    color: Colors.red,
    marginBottom: verticalScale(6),
  },

  headerSubtitle: {
    fontSize: fontScale(14),
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent:'center',
    paddingHorizontal: scale(24),
  },

  image: {
    width: '90%',
    height: verticalScale(240),
    marginBottom: verticalScale(30),
  },

  title: {
    fontSize: fontScale(16),
    fontFamily:FONTS.BALOO,
    fontWeight:'bold',
    color: colors.text,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },

  subtitle: {
    fontSize: fontScale(13),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },

  button: {
    backgroundColor: Colors.primary,
    marginHorizontal: scale(24),
    marginBottom: verticalScale(20),
    height: verticalScale(52),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: fontScale(16),
    fontWeight: '600',
  },
});
