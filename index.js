/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

// ❗ DO NOT import directly (Android-only lib)
// import ReactNativeForegroundService from "@supersami/rn-foreground-service";

// ✅ Dynamic require (fix for iOS crash)
let ReactNativeForegroundService = null;

if (Platform.OS === 'android') {
  ReactNativeForegroundService =
    require('@supersami/rn-foreground-service').default;
}

/* ------------------ Firebase Background Handler ------------------ */
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(remoteMessage)
  await notifee.displayNotification({
    title: remoteMessage?.data?.title ?? 'TRUCKn Bike 🚚',
    body: remoteMessage?.data?.body ?? 'You have a new message',
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

/* ------------------ Create Notification Channel ------------------ */
async function createChannel() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'orders',
      name: 'Order Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'order',
    });
  }
}

createChannel();

/* ------------------ Notifee Background Events ------------------ */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('🔔 Background event:', type, detail);

  switch (type) {
    case EventType.PRESS:
      console.log('User pressed notification');
      break;

    case EventType.DISMISSED:
      console.log('Notification dismissed');
      break;
  }
});

/* ------------------ Foreground Service (Android Only) ------------------ */
if (Platform.OS === 'android' && ReactNativeForegroundService) {
  ReactNativeForegroundService.register({
    config: {
      alert: true,
      onServiceErrorCallBack: () => {
        console.error('Foreground service error occurred');
      },
    },
  });
}

/* ------------------ App Register ------------------ */
console.log('App registered', appName);

AppRegistry.registerComponent(appName, () => App);
