
import Geolocation from "react-native-geolocation-service";
let watchId: number | null = null;


export const startTracking = async ()=>{
    console.log(watchId)
   try {   if (watchId !== null) return;
     return watchId = Geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
    
          console.log("📍 Driver location:", latitude, longitude);
    
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
    
   } catch (error) {
    console.log(error)
   }

}

export const stopTracking = async ()=>{
    console.log('LOCation tracking stoped')
     if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        watchId = null;
      }
}