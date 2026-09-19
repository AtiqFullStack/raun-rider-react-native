import Geolocation from "react-native-geolocation-service";
import { requestLocationPermission } from '../utils/requestLocationPermission';

let watchId: number | null = null;
let trackingGeneration = 0;

export const startDriverLocationTracking = (
  tripId: string | null,
  driverId: string | null,
  socket: any,
  onLocationChange?: (location: {
    latitude: number;
    longitude: number;
    heading: number;
  }) => void,
) => {

  if (watchId !== null) return;
  const generation = ++trackingGeneration;

  requestLocationPermission().then(hasPermission => {
    if (generation !== trackingGeneration) return;
    if (!hasPermission) {
      console.log("Location permission denied");
      return;
    }

    watchId = Geolocation.watchPosition(
      position => {
        if (generation !== trackingGeneration) return;
        const { latitude, longitude, heading } = position.coords;

        console.log("📍 Driver location:", latitude, longitude);

        onLocationChange?.({
          latitude,
          longitude,
          heading: heading ?? 0,
        });

        if (tripId && driverId && socket?.connected) {
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
        distanceFilter: 0,
        interval: 1000,
        fastestInterval: 1000,
        showsBackgroundLocationIndicator: true,
      }
    );
  }).catch(error => {
    console.log('Location permission error:', error);
  });
};

export const stopDriverLocationTracking = () => {
  trackingGeneration += 1;
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
