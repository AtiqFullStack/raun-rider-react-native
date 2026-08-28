import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';
import Image3 from '../assets/svg/image-3.svg';
import { authService } from '../services/authService';
import { scale, verticalScale, fontScale } from '../utils/scaling';

import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import { strings } from '../constants/strings';

interface EmailVerifyScreenProps {
  onVerifySuccess: (data: { email: string; otp: string }) => void;
  onNavigateloginSuccess: () => void;
  onNavigateToReview: () => void;
  onNavigateBack: () => void;
  data: {
    email: String;
    message: String;
    registrationData?: any;
  } | null;
}

const EmailVerifyScreen: React.FC<EmailVerifyScreenProps> = ({
  onVerifySuccess,
  onNavigateBack,
  onNavigateloginSuccess,
  onNavigateToReview,
  data,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<TextInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isOtpComplete = otp.every(digit => digit !== '');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, canResend]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
  const otpCode = otp.join('');

  if (!data?.email) {
    setError('Email not found');
    return;
  }

  if (otpCode.length !== 6) {
    setError('Please enter 6 digit OTP');
    return;
  }

  setIsLoading(true);
  setError('');

  try {
    let res;
    console.log('Message in otp screen', data.message);

    if (data.message === 'register') {
      // ✅ REGISTER FLOW → verify OTP
      res = await authService.verifyRegisterOtp(
        data.email as string,
        otpCode
      );

      console.log('REGISTER OTP VERIFY RESPONSE:', res);
         Toast.show({
              type: 'success',
              text1: res?.message || 'Otp verified successfully',
            });

      onNavigateToReview(); // go to review screen
    } else {
      // ✅ FORGOT PASSWORD FLOW → verify via reset API
      res = await authService.resetPassword(
        data.email as string,
        otpCode,
        '' // 👈 verify-only call
      );

      console.log('FORGOT OTP VERIFY RESPONSE:', res);

      // ✅ PASS DATA FOR NEXT SCREEN
      onVerifySuccess({
        email: data.email as string,
        otp: otpCode,
      });
    }
  } catch (err: any) {
    console.log('OTP VERIFY ERROR:', err);

    const errorMessage = getCleanErrorMessage(
      err,
      'OTP verification failed. Please try again.'
    );

    setError(errorMessage);
    setOtp(['', '', '', '', '', '']); // Clear OTP on failure

    Toast.show({
      type: 'error',
      text1: errorMessage,
    });
  } finally {
    setIsLoading(false);
  }
};

const getCleanErrorMessage = (error: any, fallback = 'Something went wrong') => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

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

const handleResend = async () => {
  if (!canResend || !data?.email) return;

  setIsResending(true);
  setError('');

  try {
    let res;
    
    if (data.message === 'register' && data.registrationData) {
      // Register flow - call register API again
      res = await authService.registerDriver(data.registrationData);
      console.log('RESENt REGISTER RESPONSE:', res);
    } else {
      // Forgot password flow - call forgot password API
      res = await authService.forgotPassword(data.email as string);
      console.log('RESENt OTP RESPONSE:', res);
    }

    if (!res || res.success === false) {
      setError(res?.message || 'Failed to resend OTP');
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'OTP sent successfully',
    });

    // Reset timer and clear OTP
    setCanResend(false);
    setResendTimer(30);
    setOtp(['', '', '', '', '', '']);
  } catch (err: any) {
    console.log('RESEND ERROR:', err);
    const errorMessage = getCleanErrorMessage(err, 'Failed to resent OTP');
    setError(errorMessage);
    Toast.show({
      type: 'error',
      text1: errorMessage,
    });
  } finally {
    setIsResending(false);
  }
};

  return (
    <SafeWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageContainer}>
          <Image3 width={scale(201)} height={verticalScale(180)} />
        </View>

        <Text style={styles.title}>{strings.enterYourOtp}</Text>
        <Text style={styles.subtitle}>
          {strings.enterOtpSentToEmail}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputRefs.current[index] = ref!)}
              style={styles.otpBox}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => {
                if (
                  nativeEvent.key === 'Backspace' &&
                  !otp[index] &&
                  index > 0
                ) {
                  inputRefs.current[index - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn’t receive OTP?</Text>

          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              <Text style={[styles.resendLink, isResending && styles.disabledText]}>
                {isResending ? 'Sending...' : 'Resend'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend in {resendTimer}s
            </Text>
          )}
        </View>

        <CustomButton
          title={isLoading ? strings.verifying : strings.verify}
          backgroundColor={Colors.primary}
          textColor="#fff"
          disabled={!isOtpComplete || isLoading}
          onPress={handleVerify}
        >
          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#fff"
            />
          )}
        </CustomButton>
      </ScrollView>
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    alignItems: 'center',
    paddingTop: verticalScale(50),
  },

  imageContainer: {
    marginBottom: verticalScale(20),
  },

  title: {
    fontSize: fontScale(22),
    fontFamily: 'Baloo2-ExtraBold',
    color: Colors.black,
    marginBottom: verticalScale(13),
  },

  subtitle: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.blackSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(30),
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: scale(8),
    width: '100%',
    paddingHorizontal: scale(32),
    marginBottom: verticalScale(30),
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },

  resendText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik',
    color: Colors.blackSecondary,
  },
  resendLink: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik',
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: scale(6),
  },
  timerText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik',
    fontWeight: '600',
    color: Colors.blackSecondary,
    marginLeft: scale(6),
  },
  disabledText: {
    color: Colors.blackSecondary,
    opacity: 0.6,
  },
  otpBox: {
    width: scale(49),
    height: verticalScale(55),
    borderWidth: 0.5,
    borderColor: '#163466',
    borderRadius: scale(4),
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: fontScale(32),
    fontFamily: 'Rubik-SemiBold',
    lineHeight: verticalScale(38),
    color: '#2A2A2A',
    padding: 0,
  },
});

export default EmailVerifyScreen;
