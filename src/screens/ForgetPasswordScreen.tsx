import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';
import AppLogo from '../assets/svg/applogo.svg';
import { authService } from '../services/authService';

import Email from '../assets/icons/email.svg';

import { scale, verticalScale, fontScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import { strings } from '../constants/strings';

interface ForgetPasswordScreenProps {
  onNavigateToEmailVerify: (data: { email: String; message: String }) => void;
  onNavigateBack: () => void;
}

const ForgetPasswordScreen: React.FC<ForgetPasswordScreenProps> = ({
  onNavigateToEmailVerify,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Email validation
  const isValidEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      setError(strings.validEmailRequired);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await authService.forgotPassword(email);
      console.log('FORGOT PASSWORD RESPONSE:', res);

      if (!res || res.success === false) {
        setError(res?.message || strings.failedSendOtp);
        return;
      }

      // ✅ Navigate only on success
      onNavigateToEmailVerify({
        email: email,
        message: 'forgetpassword',
      });
    } catch (err: any) {
      console.log('FORGOT PASSWORD ERROR:', err);

      const errorMessage = getCleanErrorMessage(
        err,
        strings.somethingWentWrong,
      );

      setError(errorMessage);

      Toast.show({
        type: 'error',
        text1: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getCleanErrorMessage = (
    error: any,
    fallback = strings.somethingWentWrong,
  ) => {
    // Axios-style error
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    // String error like: HTTP 400: {"message":"Invalid OTP"}
    if (typeof error?.message === 'string') {
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(error.message.substring(jsonStart));
          if (parsed?.message) return parsed.message;
        }
      } catch {}
    }

    return error?.message || fallback;
  };

  const isButtonDisabled = !email;

  return (
    <SafeWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* App Logo */}
            <View style={styles.logoContainer}>
              <AppLogo width={scale(103)} height={verticalScale(75)} />
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{strings.forgotPasswordTitle}</Text>
              <Text style={styles.subtitle}>
                {strings.forgotPasswordSubtitle}
              </Text>
            </View>

            {/* Image */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../assets/images/image-1.jpg')}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{strings.email}</Text>

              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}>
                  <Email width={20} height={20} />
                </View>

                <View style={styles.divider} />

                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={strings.enterYourEmail}
                  placeholderTextColor={Colors.secondary}
                  value={email}
                  onChangeText={text => {
                    setEmail(text);

                    if (!text) {
                      setError('');
                    } else if (!isValidEmail(text)) {
                      setError(strings.validEmailRequired);
                    } else {
                      setError('');
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* ❌ Error */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
              <CustomButton
                title={isLoading ? strings.sending : strings.reset}
                backgroundColor={
                  isButtonDisabled || isLoading ? '#A0AEC0' : Colors.primary
                }
                textColor="#fff"
                width={388}
                onPress={handleReset}
                disabled={isButtonDisabled || isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(100),
  },

  container: {
    flex: 1,
    paddingHorizontal: scale(27),
  },

  logoContainer: {
    marginTop: verticalScale(25),
  },

  titleContainer: {
    marginTop: verticalScale(40),
  },

  title: {
    fontSize: fontScale(26),
    lineHeight: verticalScale(34),
    fontFamily: 'Baloo2-ExtraBold',
    color: Colors.black,
  },

  subtitle: {
    marginTop: verticalScale(5),
    fontSize: fontScale(16),
    lineHeight: verticalScale(24),
    fontFamily: 'Rubik-Light',
    color: Colors.secondary,
  },

  imageContainer: {
    marginTop: verticalScale(30),
    alignItems: 'center',
  },

  image: {
    width: scale(300),
    height: verticalScale(250),
  },

  inputContainer: {
    marginTop: verticalScale(40),
  },

  label: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: Colors.blackSecondary,
    marginBottom: verticalScale(7),
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scale(388),
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    backgroundColor: '#fff',
    paddingHorizontal: scale(10),
    gap: scale(8),
  },

  iconContainer: {
    width: scale(32),
    height: verticalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E6E7EE',
  },

  inputWithIcon: {
    flex: 1,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    paddingLeft: scale(10),
  },

  errorText: {
    color: 'red',
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    marginTop: verticalScale(6),
  },

  buttonContainer: {
    marginTop: verticalScale(50),
    alignItems: 'center',
  },
});

export default ForgetPasswordScreen;
