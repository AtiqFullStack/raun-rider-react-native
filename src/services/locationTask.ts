import BackgroundService from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';

let watchId = null;

const locationTask = async (taskDataArguments) => {
  const { socket, tripId, driverId } = taskDataArguments;

  watchId = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      console.log("🔥 BG Location:", latitude, longitude);

      // 🔥 reconnect socket if needed
      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("DRIVER_LOCATION_UPDATE", {
        tripId,
        driverId,
        lat: latitude,
        lng: longitude,
      });

    },
    (error) => console.log("BG error:", error),
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 3000,
    }
  );

  // 👇 keep service alive
  await new Promise(() => {});
};