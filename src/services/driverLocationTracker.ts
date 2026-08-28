import Geolocation from "react-native-geolocation-service";
import { requestLocationPermission } from '../utils/requestLocationPermission';

let watchId: number | null = null;

export const startDriverLocationTracking = (
  tripId: string,
  driverId: string | null,
  socket: any
) => {

  if (!tripId || !driverId) {
    console.log("Missing tripId or driverId");
    return;
  }
console.log('called')
console.log(watchId)
  if (watchId !== null) return;

  requestLocationPermission().then(hasPermission => {
    if (!hasPermission) {
      console.log("Location permission denied");
      return;
    }

    watchId = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;

        console.log("📍 Driver location:", latitude, longitude);

        if (socket?.connected) {
          socket.emit("DRIVER_LOCATION_UPDATE", {
            tripId,
            driverId,
            lat: latitude,
            lng: longitude,
          });
        }
      },
      error => {
        console.log("Location error:", error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // update every 10 meters
        interval: 5000,
        fastestInterval: 3000,
        showsBackgroundLocationIndicator: true,
      }
    );
  });
};

export const stopDriverLocationTracking = () => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
};

export const getCurrentLocation = (): Promise<{
  lat: number;
  long: number;
  heading: number;
}> => new Promise((resolve, reject) => {
  requestLocationPermission().then(hasPermission => {
    if (!hasPermission) {
      reject({
        code: 1,
        message: 'Location permission denied',
      });
      return;
    }

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, heading } = position.coords;

        console.log("📍 Current Location:", latitude, longitude);

        resolve({
          lat: latitude,
          long: longitude,
          heading: heading ?? 0, // fallback
        });
      },
      error => {
        console.log("❌ Location error:", error);

        reject({
          code: error.code,
          message: error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
        forceRequestLocation: true, // 🔥 important for emulator
        showLocationDialog: true,
      }
    );
  }).catch(error => {
    reject({
      code: error?.code || 1,
      message: error?.message || 'Location permission denied',
    });
  });
});
