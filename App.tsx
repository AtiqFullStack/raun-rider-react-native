import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, BackHandler, PermissionsAndroid, Platform, StatusBar, View } from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/utils/toastConfig';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import SplashScreen from './src/screens/SplashScreen';
// import NetInfo from '@react-native-community/netinfo';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgetPasswordScreen from './src/screens/ForgetPasswordScreen';
import EmailVerifyScreen from './src/screens/EmailVerifyScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import MobileVerifyScreen from './src/screens/MobileVerifyScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ReviewScreen from './src/screens/ReviewScreen';
import { SocketProvider } from './src/context/SocketContext';
import { AuthProvider } from './src/context/AuthContext';
import { ScreenProvider } from './src/context/ScreensContext';
import { useScreen } from './src/hooks/useScreen';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from './src/hooks/useAuth';
import { AppEvents, EVENTS } from './src/utils/events';
// App.tsx
import { QuoteProvider } from './src/context/QuoteContext';
import { AppServicesProvider } from './src/context/AppServicesContext';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Colors } from './src/constants/Colors';
import { linking } from './src/navigation/linking';
import { StyleSheet } from 'react-native';
import usePermissions from './src/hooks/usePermissions';
import PermissionScreen from './src/screens/PermissionScreen';
import CustomAlert from './src/components/CustomAlert';


const overlayStyle = {
  ...StyleSheet.absoluteFillObject,
  zIndex: 99,
};

const getNotificationContent = (data: any) => {
  const type = data?.type;
  switch (type) {
    case 'NEW_ORDER':
      return { title: '🚚 New Order Available', body: data?.body || 'A new delivery request is waiting for you.' };
    case 'ORDER_CANCELLED':
      return { title: '❌ Order Cancelled', body: data?.body || 'The customer has cancelled the order.' };
    case 'BOOKING_REQUESTED':
      return { title: '📦 Booking Requested', body: data?.body || 'A customer wants to book your service.' };
    case 'TRIP_UPDATE':
      return { title: '🔄 Trip Updated', body: data?.body || 'Your trip status has been updated.' };
    case 'PAYMENT':
      return { title: '💰 Payment Received', body: data?.body || 'You have received a payment.' };
    default:
      return { title: data?.title || "TRUCK'N BIKE", body: data?.body || 'You have a new notification.' };
  }
};

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { title, body } = getNotificationContent(remoteMessage?.data);
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'orders',
      importance: AndroidImportance.HIGH,
      sound: 'order',
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
    },
  });
});

const navigationRef = React.createRef<NavigationContainerRef<any>>();

function AppComp() {

  const insets = useSafeAreaInsets();
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const [navReady, setNavReady] = useState(false);
  const {
    currentScreen,
    setCurrentScreen,
    resetData,
    setResetData,
    registerFormData,
    setRegisterFormData,
  } = useScreen();

  const { camerAndNotification } = usePermissions()

  const { setFcmToken } = useAuth();
  const wasConnected = useRef(true);


  useEffect(() => {
    (async () => {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        AppEvents.emit(EVENTS.REFRESH_ORDERS);
        // If it was a food order notification, go straight to Trips tab
        if (initialNotification.notification?.data?.type === 'FOOD_ORDER_READY') {
          AppEvents.emit(EVENTS.NEW_FOOD_ORDER);
        }
      }
    })();
  }, []);

  useEffect(() => {
    notifee.createChannel({
      id: 'orders', // ✅ MATCH
      name: 'Order Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'order',
    });
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log(remoteMessage)
      const { title, body } = getNotificationContent(remoteMessage?.data);
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: 'orders',
          importance: AndroidImportance.HIGH,
          sound: 'order',
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });

      AppEvents.emit(EVENTS.REFRESH_ORDERS);

      if (remoteMessage?.data?.type === 'ORDER_CANCELLED') {
        const nav = navigationRef.current;
        if (nav) {
          nav.reset({
            index: 0,
            routes: [{ name: 'Tabs', params: { screen: 'Home' } }],
          });
        }
      }

      // New food order ready → jump to Trips tab (PENDING)
      if (remoteMessage?.data?.type === 'FOOD_ORDER_READY') {
        AppEvents.emit(EVENTS.NEW_FOOD_ORDER);
        const nav = navigationRef.current;
        if (nav) {
          nav.dispatch(
            CommonActions.navigate({
              name: 'Tabs',
              params: { screen: 'Trips' },
            }),
          );
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type }) => {
      if (type === EventType.PRESS) {
        AppEvents.emit(EVENTS.REFRESH_ORDERS);
      }
    });
    return unsubscribe;
  }, []);

  const [backPressCount, setBackPressCount] = useState(0);

  useEffect(()=>{
    camerAndNotification()
  },[])

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notification clicked');
        setCurrentScreen('home');
        AppEvents.emit(EVENTS.REFRESH_ORDERS);
      }
    });

    return unsubscribe;
  }, []);

  // no internet

  // useEffect(() => {
  //   const unsubscribe = NetInfo.addEventListener(state => {
  //     const isConnected =
  //       state.isConnected === true && state.isInternetReachable === true;

  //     if (wasConnected.current && !isConnected) {
  //       Toast.show({
  //         type: 'error',
  //         text1: 'No Internet Connection',
  //         text2: 'Please check your network connection',
  //         position: 'top',
  //       });
  //     }
  //     // Internet reconnected
  //     if (!wasConnected.current && isConnected) {
  //       Toast.show({
  //         type: 'success',
  //         text1: 'Back Online',
  //         text2: 'Internet connection restored',
  //         position: 'top',
  //       });
  //     }
  //     wasConnected.current = isConnected;
  //   });

  //   return () => unsubscribe();
  // }, []);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'home') {
        const nav = navigationRef.current;
        if (nav) {
          const state = nav.getState();
          const tabState = state?.routes?.[0]?.state;
          const activeTabIndex = tabState?.index ?? 0;
          const activeTab = tabState?.routes?.[activeTabIndex];

          // If not on Home tab, navigate to Home tab
          if (activeTabIndex !== 0) {
            nav.dispatch(CommonActions.navigate({ name: 'Home' }));
            return true;
          }

          // On Home tab — check if stack has more than 1 screen
          const homeStackState = activeTab?.state;
          const homeStackIndex = homeStackState?.index ?? 0;
          if (homeStackIndex > 0) {
            nav.goBack();
            return true;
          }

          // On Home tab root — double back to exit
          if (backPressCount === 0) {
            setBackPressCount(1);
            Toast.show({ type: 'info', text1: 'Press back again to exit' });
            setTimeout(() => setBackPressCount(0), 2000);
            return true;
          } else {
            BackHandler.exitApp();
            return true;
          }
        }
        return true;
      }
      if (currentScreen === 'forgotPassword') {
        setCurrentScreen('login');
        return true;
      }
      if (currentScreen === 'emailVerify') {
        if (resetData?.message === 'register') {
          setCurrentScreen('register');
        } else {
          setCurrentScreen('forgotPassword');
        }
        return true;
      }
      if (currentScreen === 'register') {
        setCurrentScreen('login');
        return true;
      }
      if (currentScreen === 'login') {
        if (backPressCount === 0) {
          setBackPressCount(1);
          Toast.show({
            type: 'info',
            text1: 'Press back again to exit',
          });
          setTimeout(() => setBackPressCount(0), 2000);
          return true;
        } else {
          BackHandler.exitApp();
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [currentScreen, backPressCount]);

  const getToken = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('FCM permission not granted');
          return null;
        }
      }

      await messaging().registerDeviceForRemoteMessages();

      // ---------------- ANDROID ----------------
      if (Platform.OS === 'android') {
        const token = await messaging().getToken();
        setFcmToken(token);
        console.log('🔥 Android FCM Token:', token);
        return token;
      }

      // ---------------- IOS ----------------
      if (Platform.OS === 'ios') {
        let apnsToken = await messaging().getAPNSToken();

        for (let attempt = 1; !apnsToken && attempt <= 5; attempt += 1) {
          console.log(`APNS not ready, retrying (${attempt}/5)...`);
          await new Promise(res => setTimeout(res, 2000));
          apnsToken = await messaging().getAPNSToken();
        }

        if (!apnsToken) {
          console.log('❌ APNS token not available yet');
          return null;
        }

        console.log('🍎 APNS Token:', apnsToken);
        const token = await messaging().getToken();
        setFcmToken(token);
        console.log('🍎 iOS FCM Token:', token);
        return token;
      }

      return null;
    } catch (error) {
      console.log('❌ Error getting FCM token:', error);
      return null;
    }
  }, [setFcmToken]);

  useEffect(() => {
    getToken();

    const unsubscribe = messaging().onTokenRefresh(token => {
      setFcmToken(token);
      console.log('🔄 FCM Token refreshed:', token);
    });

    return unsubscribe;
  }, [getToken, setFcmToken]);
  const requestPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();


        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          getToken();
        } else {
          Alert.alert('Permission Denied');
        }
        return;
      }
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        getToken();
      } else {
        Alert.alert('Permission Deniedaa');
      }
    } catch (error) { }
  };

  //   useEffect(() => {
  //     notifee.createChannel({
  //       id: 'default',
  //       name: 'Default Notifications',
  //       importance: AndroidImportance.HIGH,
  //     });
  //   }, []);
  // messaging().setBackgroundMessageHandler(async remoteMessage => {
  //   console.log('📦 BACKGROUND MESSAGE:', remoteMessage);

  //   await notifee.displayNotification({
  //     title: remoteMessage?.data?.title ?? 'New Order',
  //     body: remoteMessage?.data?.body ?? 'You have a new delivery request',
  //     android: {
  //       channelId: 'default',
  //       importance: AndroidImportance.HIGH,
  //     },
  //   });
  // });
  //  useEffect(() => {
  //   const unsubscribe = messaging().onMessage(async remoteMessage => {
  //     console.log('📲 FOREGROUND MESSAGE:', remoteMessage);
  //     Alert.alert(
  //       'Foreground Notification',
  //       JSON.stringify(remoteMessage),
  //     );
  //   });

  //   return unsubscribe;
  // }, []);

  return (
    <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? insets.bottom : 0, paddingTop: insets.top }}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <>
        {/* 🔹 HOME */}
        {currentScreen === 'home' && (
          <NavigationContainer ref={navigationRef} linking={linking} onReady={() => setNavReady(true)}>
            <TabNavigator onLogout={() => setCurrentScreen('login')} />
          </NavigationContainer>
        )}

        {/* 🔹 SPLASH */}
        {(currentScreen === 'splash' || (currentScreen === 'home' && !navReady)) && (
          <View style={currentScreen === 'home' ? overlayStyle : { flex: 1 }}>
            <SplashScreen onFinish={nextScreen => {
              if (currentScreen !== 'home') setCurrentScreen(nextScreen);
            }} />
          </View>
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onNavigateToForgotPassword={() => setCurrentScreen('forgotPassword')}
            onNavigateToHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterScreen
            savedFormData={registerFormData}
            onSaveFormData={setRegisterFormData}
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToEmailVerify={data => {
              setRegisterFormData(data.registrationData);
              setResetData({ email: data.email, message: 'register', registrationData: data.registrationData });
              setCurrentScreen('emailVerify');
            }}
          />
        )}

        {currentScreen === 'review' && (
          <ReviewScreen
            onGoHome={() => setCurrentScreen('home')}
            onNavigateToLogin={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'forgotPassword' && (
          <ForgetPasswordScreen
            onNavigateToEmailVerify={data => {
              setResetData({ email: data.email, message: 'forgetpassword' });
              setCurrentScreen('emailVerify');
            }}
            onNavigateBack={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'emailVerify' && resetData && (
          <EmailVerifyScreen
            data={resetData}
            onVerifySuccess={payload => {
              setResetData({ email: payload.email, otp: payload.otp, message: 'reset' });
              setCurrentScreen('resetPassword');
            }}
            onNavigateloginSuccess={() => setCurrentScreen('login')}
            onNavigateToReview={() => {
              setRegisterFormData(null);
              setCurrentScreen('review');
            }}
            onNavigateBack={() => {
              if (resetData?.message === 'register') setCurrentScreen('register');
              else setCurrentScreen('forgotPassword');
            }}
          />
        )}

        {currentScreen === 'resetPassword' && resetData && (
          <ResetPasswordScreen
            email={resetData.email}
            otp={resetData.otp!}
            onPasswordReset={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'mobileVerify' && (
          <MobileVerifyScreen onNavigateBack={() => setCurrentScreen('register')} />
        )}

        {!currentScreen && (
          <RegisterScreen
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToOtpVerify={() => setCurrentScreen('mobileVerify')}
            onNavigateBack={() => setCurrentScreen('login')}
          />
        )}

        <Toast config={toastConfig} position="top" />
      </>
      {/* Permission gate */}
      {/* {(permissionsGranted === null || !permissionsGranted) ? (
        <PermissionScreen onRequestPermissions={requestPermissions} />
      ) : } */}
    </View>
  );
}

function App() {
  return (
    <>
      <SafeAreaProvider>
        <SocketProvider>
          <ScreenProvider>
            <QuoteProvider>
              <AuthProvider>
                <AppServicesProvider>
                  <AppComp />
                </AppServicesProvider>
              </AuthProvider>
            </QuoteProvider>
          </ScreenProvider>
        </SocketProvider>
      </SafeAreaProvider>
    </>
  );
}
export default App;
