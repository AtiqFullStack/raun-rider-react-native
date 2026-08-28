import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';
import AppLogo from '../assets/svg/applogo.svg';
import Eye from '../assets/icons/eye.svg';
import Lock from '../assets/icons/lock.svg';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';
import { scale, verticalScale, fontScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { strings } from '../constants/strings';
 interface ResetPasswordScreenProps {
    email: string;
    otp: number;
    onPasswordReset: () => void;
  }
const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  email,
  otp,
  onPasswordReset,
}) => {

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

 

  const isButtonDisabled =
    !password.trim() || !confirmPassword.trim() || !!passwordError || !!confirmPasswordError;

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return strings.passwordMin6Chars;
    }
    const hasNumber = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    if (!hasNumber || !hasLetter || !hasSpecialChar) {
      return strings.passwordRequirements;
    }
    return '';
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      setPasswordError(validatePassword(text));
    } else {
      setPasswordError('');
    }
    // Re-validate confirm password if it exists
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordError(strings.passwordsNotMatch);
    } else if (confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text.length > 0 && text !== password) {
      setConfirmPasswordError(strings.passwordsNotMatch);
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleReset = async () => {
  if (!password.trim()) {
    setPasswordError(strings.passwordRequired);
    return;
  }
  if (!confirmPassword.trim()) {
    setConfirmPasswordError(strings.confirmPasswordRequired);
    return;
  }
  if (password !== confirmPassword) {
    setConfirmPasswordError(strings.passwordsNotMatch);
    return;
  }
  if (passwordError || confirmPasswordError) {
    return;
  }

  setIsLoading(true);
  setApiError('');

  try {
    const res = await authService.resetPassword(email, otp, password);
    console.log('RESET PASSWORD RESPONSE:', res);

    if (!res || res.success === false) {
      setApiError(res?.message || strings.failedResetPassword);
      return;
    }

    Toast.show({
      type: 'success',
      text1: strings.passwordResetSuccessful,
    });

    onPasswordReset(); // ✅ go to login
  } catch (err: any) {
    console.log('RESET PASSWORD ERROR:', err);

    const errorMessage = getCleanErrorMessage(
      err,
      strings.somethingWentWrong
    );

    setApiError(errorMessage);

    Toast.show({
      type: 'error',
      text1: errorMessage,
    });
  } finally {
    setIsLoading(false);
  }
};
const getCleanErrorMessage = (error: any, fallback = strings.somethingWentWrong) => {
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


  return (
    <SafeWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* ✅ App Logo (same as Login) */}
            <View style={styles.logoContainer}>
              <AppLogo width={scale(103)} height={verticalScale(75)} />
            </View>

            {/* ✅ Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{strings.resetPasswordTitle}</Text>
              <Text style={styles.subtitle}>
                {strings.resetPasswordSubtitle}
              </Text>
            </View>

            <View style={styles.inputbox}>
              <Text style={styles.label}>{strings.newPassword}</Text>
              <View style={styles.inputWrapper}>
                <Lock width={18} height={18} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={strings.enterNewPassword}
                  placeholderTextColor={Colors.secondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={handlePasswordChange}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Eye width={18} height={18} />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            <View style={styles.inputcontainer}>
              <Text style={styles.label}>{strings.confirmPassword}</Text>
              <View style={styles.inputWrapper}>
                <Lock width={18} height={18} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={strings.confirmPasswordPlaceholder}
                  placeholderTextColor={Colors.secondary}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Eye width={18} height={18} />
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              ) : null}
            </View>

            {/* ✅ Button */}
            <View style={styles.buttonContainer}>
              <CustomButton
                title={isLoading ? strings.settingPassword : strings.setPassword}
                backgroundColor={Colors.primary}
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
    paddingBottom: verticalScale(80),
  },

  container: {
    flex: 1,
    paddingHorizontal: scale(27),
  },

  logoContainer: {
    marginTop: verticalScale(25),
  },

  titleContainer: {
    marginTop: verticalScale(60),
  },

  title: {
    fontSize: fontScale(26),
    fontFamily: 'Baloo2-ExtraBold',
   
    color: Colors.black,
  },

  inputcontainer: {},
  subtitle: {
    marginTop: verticalScale(5),
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.secondary,
  },

  inputbox: {
    marginTop: verticalScale(40),
    marginBottom: verticalScale(20),
  },

  label: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.blackSecondary,
    marginBottom: verticalScale(6),
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scale(388),
    height: verticalScale(55),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    backgroundColor: '#fff',
    paddingHorizontal: scale(10),
    gap: scale(8),
  },

  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: fontScale(16),
    fontFamily: 'Montserrat-ExtraBold',
    color: '#2A2A2A',
    paddingVertical: 0,
    paddingHorizontal: scale(6),
    textAlignVertical: 'center',
  },

  buttonContainer: {
    marginTop: verticalScale(26),
    alignItems: 'center',
  },

  errorText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik',
    color: '#FF0000',
    marginTop: verticalScale(4),
  },
});

export default ResetPasswordScreen;
