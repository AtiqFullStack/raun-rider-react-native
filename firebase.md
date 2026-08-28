paste  google services json in  android/app

# Using npm
npm install --save @react-native-firebase/app

# Using Yarn
yarn add @react-native-firebase/app

# Configure Firebase with Android credentials
/android/build.gradle

    buildscript {
    dependencies {
        // ... other dependencies
        classpath 'com.google.gms:google-services:4.4.4'
        // Add me --- /\
    }
    }

# 
/android/app/build.gradle
apply plugin: 'com.google.gms.google-services'



# Install & setup the app module
yarn add @react-native-firebase/app

# Install the messaging module
yarn add @react-native-firebase/messaging


# App.tsx

import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid } from 'react-native';


  const getToken = async () => {
    try {
      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();
      console.log(token)
    } catch (error) {

    }
  }

  const requestPermission = async () => {
    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        getToken()
      } else {
        Alert.alert('Permission Denied')
      }
    } catch (error) {

    }
  }
  
    useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
    });

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });
    return unsubscribe;
  }, [])

  useEffect(() => {
    requestPermission()
  }, [])



  