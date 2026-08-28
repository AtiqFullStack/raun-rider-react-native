// import Geolocation from '@react-native-community/geolocation';
// import { PermissionsAndroid, Platform } from 'react-native';

// const requestLocationPermission = async () => {
//   if (Platform.OS === 'android') {
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//     );
//     return granted === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// };

// export const getLocation = async () => {
//   const hasPermission = await requestLocationPermission();
//   if (!hasPermission) {
//     throw new Error('Location permission denied');
//   }

//   return new Promise<{ lat: number; long: number }>((resolve, reject) => {
//     Geolocation.getCurrentPosition(
//       position => {
//         resolve({
//           lat: position.coords.latitude,
//           long: position.coords.longitude,
//         });
//       },
//       error => {
//         reject(error);
//       },
//       {
//         enableHighAccuracy: false,
//         timeout: 20000,
//         maximumAge: 10000,
//       }
//     );
//   });
// };
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

export const getLocation = async () => {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise<{
    lat: number;
    long: number;
    heading: number;
  }>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          heading: position.coords.heading ?? 0, // ✅ safe fallback
        });
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: false, // keep your working config
        timeout: 20000,
        maximumAge: 10000,
      }
    );
  });
};