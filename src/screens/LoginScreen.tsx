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
  Image,
} from 'react-native';

import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';
import Eye from '../assets/icons/eye.svg';
import Lock from '../assets/icons/lock.svg';
import Email from '../assets/icons/email.svg';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';
import { scale, verticalScale, fontScale } from '../utils/scaling';
import { colors, Colors } from '../constants/Colors';
import { strings } from '../constants/strings';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import messaging from '@react-native-firebase/messaging';
import KeyboardWrapper from '../components/KeyboardWrapper';
import AppLogo from '../assets/svg/applogo.svg';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToHome: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const { authValue, fcmToken, setFcmToken } = useAuth()
  const { socket } = useSocket()
  console.log(socket)

  const getFcmTokenForLogin = async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('FCM permission not granted on login');
          return '';
        }
      }

      await messaging().registerDeviceForRemoteMessages();

      if (Platform.OS === 'ios') {
        let apnsToken = await messaging().getAPNSToken();

        for (let attempt = 1; !apnsToken && attempt <= 5; attempt += 1) {
          console.log(`APNS not ready on login, retrying (${attempt}/5)...`);
          await new Promise(res => setTimeout(res, 2000));
          apnsToken = await messaging().getAPNSToken();
        }

        if (!apnsToken) {
          console.log('APNS token not available on login');
          return '';
        }
      }

      const token = await messaging().getToken();
      setFcmToken(token);
      console.log('FCM Token for login:', token);
      return token;
    } catch (error) {
      console.log('Error getting FCM token on login:', error);
      return '';
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: strings.emailRequired }));
      return;
    }
    if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: strings.invalidEmail }));
      return;
    }
    if (!password.trim()) {
      setErrors(prev => ({ ...prev, password: strings.passwordRequired }));
      return;
    }
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: strings.passwordMinLength }));
      return;
    }

    setIsLoading(true);
    setErrors({ email: '', password: '' });

    try {

      const loginFcmToken = fcmToken || await getFcmTokenForLogin();
      console.log(loginFcmToken, "fxmtoken")
      const res = await authService.login(email, password, loginFcmToken);
      console.log("Login data",res)
    
      Toast.show({
        type: 'success',
        text1: strings.loginSuccessful,
      });
      // adjust condition based on backend response
      if (!res || res.success === false) {
        setErrors(prev => ({
          ...prev,
          email: res?.message || 'Invalid email or password',
        }));
        return;
      }

      // ✅ Login successful
      setTimeout(async () => {
        
        if (res.data.token) {
          const userData = res.data?.driver ?? res.data?.data?.driver ?? res.data?.profile;
          await authValue.signIn(res.data.token, userData, loginFcmToken)
        }
        // onNavigateToHome();
      }, 400);
    } catch (err: any) {
      console.log('LOGIN ERROR:', err);

      let errorMessage = strings.loginFailed;

      try {
        // Extract JSON part from string
        const jsonStart = err.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(err.message.substring(jsonStart));
          errorMessage = parsed.message || errorMessage;
        }
      } catch {
        // fallback if parsing fails
        errorMessage = err?.message || errorMessage;
      }

      setErrors(prev => ({ ...prev, email: errorMessage }));

      Toast.show({
        type: 'error',
        text1: errorMessage,
      });
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onNavigateToForgotPassword();
  };

  const handleRegister = () => {
    onNavigateToRegister();
  };

  // Email validation function
  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const isButtonDisabled = !email.trim() || !password.trim() || !validateEmail(email) || password.length < 6;


  return (
    <KeyboardWrapper>


    
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {/* EDGE-TO-EDGE HEADER */}
          <View style={styles.logoContainer}>
             

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{strings.login}</Text>
              <Text style={styles.headerSubtitle}>
                {strings.loginSubtitle}
              </Text>
            </View>
          </View>

            <View style={styles.container}>
              {/* App Logo */}
             
             <View style={{flex:1 , justifyContent: 'center', alignItems:"center" ,marginTop:20}}>
              <AppLogo/>
             </View>

              {/* Email Field */}
              <View style={styles.inputbox}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{strings.enterYourEmail}</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Email width={18} height={14} />
                    </View>
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder={strings.enterYourEmail}
                      placeholderTextColor={Colors.secondary}
                      value={email}
                      onChangeText={text => {
                        setEmail(text);
                        if (!text.trim()) {
                          setErrors(prev => ({ ...prev, email: '' }));
                        } else if (!validateEmail(text)) {
                          setErrors(prev => ({ ...prev, email: strings.invalidEmail }));
                        } else {
                          setErrors(prev => ({ ...prev, email: '' }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{strings.password}</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Lock width={18} height={18} />
                    </View>
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder={strings.enterYourPassword}
                      placeholderTextColor={Colors.secondary}
                      value={password}
                      onChangeText={text => {
                        setPassword(text);
                        if (!text.trim()) {
                          setErrors(prev => ({ ...prev, password: '' }));
                        } else if (text.length < 6) {
                          setErrors(prev => ({ ...prev, password: strings.passwordMinLength }));
                        } else {
                          setErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Eye width={24} height={24} />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
              </View>

              {/* Forgot Password */}
              <View style={styles.forgotWrapper}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>{strings.forgotPassword}</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <View style={styles.buttonContainer}>
                <CustomButton
                  title={isLoading ? strings.loggingIn : strings.login}
                  backgroundColor={
                    isButtonDisabled || isLoading ? '#A0AEC0' : Colors.secondaryDark
                  }
                  textColor="#fff"
                  width={388}
                  onPress={handleLogin}
                  disabled={isButtonDisabled || isLoading}
                />
              </View>

              {/* Don't have account */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>{strings.dontHaveAccount}</Text>
                <TouchableOpacity onPress={handleRegister}>
                  <Text style={styles.registerLink}>{strings.register}</Text>
                </TouchableOpacity>
              </View>
            </View>
        </ScrollView>
          </KeyboardWrapper>
    
  );
};


const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(100),
    backgroundColor: Colors.white,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: scale(27),
  },

  logoContainer: {
    width: '100%',
    height: verticalScale(200), // 👈 good hero height
    backgroundColor: Colors.secondaryDark,

    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    overflow: 'hidden', // 🔥 CRUCIAL to clip image radius
    justifyContent: 'flex-end',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 8,
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(24),
  },
  headerTitle: {
    fontSize: fontScale(25),
    fontFamily: 'Baloo2-ExtraBold',
    bottom: 50,
    color: Colors.textLight,
  },
  headerSubtitle: {
    marginTop: verticalScale(6),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    bottom: 50,
    color: Colors.textLight,
    opacity: 0.9,
  },

  titleContainer: {
    marginTop: verticalScale(70),
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
    lineHeight: verticalScale(34),
    fontFamily: 'Baloo',
    fontWeight: '400',
    color: Colors.secondary,
  },

  inputContainer: {
    marginBottom: verticalScale(17),
  },
  inputbox: {
    marginTop: verticalScale(56),
  },

  label: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.blackSecondary,
    marginBottom: verticalScale(7),
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    backgroundColor: '#fff',
    paddingHorizontal: scale(10),
    gap: scale(8),
  },

  iconContainer: {
    width: scale(24),
    height: verticalScale(52),
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputWithIcon: {
    flex: 1,
    height: verticalScale(52),
    minHeight: verticalScale(52),
    fontSize: fontScale(14),
    lineHeight: fontScale(18),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  eyeButton: {
    width: scale(32),
    height: verticalScale(52),
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeIcon: {
    paddingRight: scale(10),
    fontSize: fontScale(16),
  },

  buttonContainer: {
    marginTop: verticalScale(60),
    alignItems: 'center',
  },
  forgotWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: verticalScale(8),
  },

  forgotText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.primary,
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(40),
    marginBottom: verticalScale(20),
  },


  registerText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.textMuted,
  },

  registerLink: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: colors.primary,
  },

  errorText: {
    color: 'red',
    fontSize: fontScale(12),
    fontFamily: 'Rubik',
    marginTop: verticalScale(2),
  },
});

export default LoginScreen;
