import React, { useState, useRef } from 'react';
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

import {
  scale,
  verticalScale,
  fontScale,
} from '../utils/scaling';

import { Colors } from '../constants/Colors';

interface MobileVerifyScreenProps {
  onVerifySuccess: () => void;
}

const MobileVerifyScreen: React.FC<MobileVerifyScreenProps> = ({ onVerifySuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<TextInput[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpCode = otp.join('');
    console.log('Mobile OTP:', otpCode);
    onVerifySuccess();
  };

  return (
    <SafeWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <AppLogo width={scale(103)} height={verticalScale(75)} />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Verify Mobile Number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to your mobile number
            </Text>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={require('../assets/images/image-1.jpg')}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref!)}
                style={styles.otpBox}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <CustomButton
              title="Verify"
              backgroundColor={Colors.primary}
              textColor="#fff"
              width={388}
              onPress={handleVerify}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: scale(27),
    paddingBottom: verticalScale(100),
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
    fontFamily: 'Baloo',
    fontWeight: '800',
    color: Colors.black,
  },

  subtitle: {
    marginTop: verticalScale(5),
    fontSize: fontScale(16),
    lineHeight: verticalScale(24),
    fontFamily: 'Rubik',
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

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(40),
    width: '100%',
  },

  otpBox: {
    width: scale(50),
    height: scale(50),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    fontSize: fontScale(20),
    fontFamily: 'Rubik',
    color: '#2A2A2A',
    backgroundColor: '#fff',
  },

  buttonContainer: {
    marginTop: verticalScale(50),
    alignItems: 'center',
  },
});

export default MobileVerifyScreen;