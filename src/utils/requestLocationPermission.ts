import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

type IOSLocationAuthorization = 'whenInUse' | 'always';

export const requestLocationPermission = async (
  iosAuthorization: IOSLocationAuthorization = 'whenInUse',
): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization(iosAuthorization);
    return auth === 'granted' || auth === 'restricted';
  }

  try {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

    if (Platform.Version >= 29) {
      const background = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
      if (background !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }

    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
};
