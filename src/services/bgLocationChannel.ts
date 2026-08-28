import { NativeModules, NativeEventEmitter } from 'react-native';
// import AsyncStorageHelper from '../storage/AsyncStorageHelper';
// import { BASE_URL, LOCATION_LOG_KEY, STAY_LOG_KEY } from '../Utils';
import axios from 'axios';
import { BASE_URL } from '../utils/config';
import StorageService from '../utils/Storage'
// import { API_ROUTES } from '../Utils/apiRoutes';

const { LocationModule } = NativeModules;

const DISTANCE_THRESHOLD = 100; // meters
const SAVE_INTERVAL = 60; // 1 minute

// const { appendData } = AsyncStorageHelper;

const emitter = LocationModule
  ? new NativeEventEmitter(LocationModule)
  : null;

let sub: any = null;

// 🔥 tracking variables
export let lastLocation: any = null;
let startTime: any = null;
let lastSavedTime: number = 0;


// 📏 distance calculator (meters)
const getDistance = (loc1: any, loc2: any) => {
  const R = 6371e3;
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;


  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
    Math.cos(φ2) *
    Math.sin(Δλ / 2) *
    Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// ⏱️ duration formatter
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} min ${secs} sec`;
};

// 🌐 API CALL
const apiCall = async (data: any) => {
  const storedToken = await StorageService.getItem('token')
  const tripId = await StorageService.getItem('tripId')

  try {
    await axios.post(
      `${BASE_URL}/user/auth/updateLatLong?lat=${data.latitude}&long=${data.longitude}&timestamp=${data.timestamp}&tripId=${tripId}`,
      {
        lat: data.latitude,
        long: data.longitude,
        timestamp: data.timestamp,
        tripId:tripId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${storedToken}`
        }
      }
    );
  } catch (error) {
    console.log('❌ API Error:', error?.response?.data || error.message);
  }
};

// 🚀 START TRACKING
export const startTracking = async () => {
  try {
    if (!LocationModule) {
      console.log('❌ Module missing');
      return;
    }

    console.log('🚀 Starting tracking...');

    LocationModule.startTracking();

    if (sub) {
      sub.remove();
      sub = null;
    }

    sub = emitter?.addListener('locationUpdate', async (data) => {
      const now = new Date();
      const currentTime = Date.now();
      const payload = {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: now.toISOString(),
        };
        // console.log(payload)

      // 👉 FIRST LOCATION INIT
      if (!lastLocation) {
        lastLocation = payload;
        startTime = now;
        lastSavedTime = currentTime;

        // await appendData(LOCATION_LOG_KEY, payload);
        // await apiCall(payload);

        return;
      }

      // 📏 DISTANCE CHECK
      const distance = getDistance(lastLocation, payload);

      // ⏱️ TIME CHECK (1 MIN)
      const isTimePassed = currentTime - lastSavedTime >= SAVE_INTERVAL;

      // ✅ CONDITION: Save only if 1 min passed (AND movement optional)
      if (isTimePassed) {
        console.log('✅ Saving (1 min interval)', payload);

        lastSavedTime = currentTime;

   
        await apiCall(payload);
      }

      // 🛑 STAY TRACKING (only if moved)
      if (distance >= DISTANCE_THRESHOLD) {
        const durationSec = (now.getTime() - startTime.getTime()) / 1000;

        const stayData = {
          location: {
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
          },
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          durationSeconds: durationSec,
          durationText: formatDuration(durationSec),
        };

        console.log('🛑 Stay Data:', stayData);

        // 🔄 RESET
        lastLocation = payload;
        startTime = now;
      }
    });
  } catch (err) {
    console.log('❌ startTracking error:', err);
  }
};

// 🛑 STOP TRACKING
export const stopTracking = () => {
  try {
    if (!LocationModule) return;

    console.log('🛑 Stopping tracking...');

    LocationModule.stopTracking();

    if (sub) {
      sub.remove();
      sub = null;
    }

    // 🔄 RESET
    lastLocation = null;
    startTime = null;
    lastSavedTime = 0;
  } catch (err) {
    console.log('❌ stopTracking error:', err);
  }
};