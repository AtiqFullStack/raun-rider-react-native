import { useCallback, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { requestLocationPermission } from '../utils/requestLocationPermission';

export default function usePermissions() {
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationModalCallback, setLocationModalCallback] = useState<(() => void) | null>(null);

  const openSettings = () => {
    Alert.alert(
      'Permission Required',
      'Please enable required permissions from settings',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  };

  const requestPermission = async (permission: any) => {
    try {
      if (Platform.OS !== 'android') return true;
      const check = await PermissionsAndroid.check(permission);
      if (check) return true;
      const result = await PermissionsAndroid.request(permission);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) openSettings();
      return false;
    } catch {
      return false;
    }
  };

  const checkLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      return requestLocationPermission();
    }

    const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    return fine || coarse;
  }, []);

  const checkFullLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') return requestLocationPermission('always');
    const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (!fine) return false;
    if (Platform.Version < 29) return true;
    const bg = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    return bg;
  }, []);

  // Background location with modal
  const requestLocationPermissionsBg = async () => {
    try {
      if (Platform.OS === 'ios') {
        return requestLocationPermission('always');
      }

      const alreadyGranted = await checkFullLocationPermission();
      if (alreadyGranted) return true;

      return new Promise(resolve => {
        setLocationModalCallback(() => async () => {
          setLocationModalVisible(false);

          const fineGranted = await requestPermission(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );

          if (!fineGranted) { resolve(false); return; }

          if (Platform.Version >= 29) {
            const bgStatus = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            );

            if (bgStatus !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                'Background Location Required',
                'Enable "Allow all the time" in settings',
                [
                  { text: 'Cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ],
              );
              resolve(false);
              return;
            }
          }

          resolve(true);
        });
        setLocationModalVisible(true);
      });
    } catch {
      return false;
    }
  };

  // Camera permission
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    return requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA);
  };

  // Notification permission (Android 13+)
  const requestNotificationPermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    return requestPermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  };

  const camerAndNotification = async () => {
    const camera = await requestCameraPermission();
    const notification = await requestNotificationPermission();
    return { camera, notification };
  }

  const LocationPermissionModal = () => (
  <Modal
    visible={locationModalVisible}
    transparent
    animationType="fade"
    onRequestClose={() => {}}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Location Access Required</Text>

        <Text style={styles.modalDescription}>
          This app requires access to your precise location to provide core driver functionalities.
        </Text>

        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>
            📍 Show nearby orders based on your current location
          </Text>
          <Text style={styles.featureItem}>
            🚚 Track your live location during active delivery for order updates
          </Text>
          <Text style={styles.featureItem}>
            🗺️ Enable navigation via Google Maps to reach delivery destinations
          </Text>
          <Text style={styles.featureItem}>
            🔄 Sync your location in the background during your active shift
          </Text>
        </View>

        <Text style={[styles.modalDescription, styles.permissionWarningText]}>
          ⚠️ Please select "Allow all the time" to ensure proper functionality
        </Text>

        <Text style={styles.consentText}>
          Your location is used only to connect you with customers and complete deliveries.
          We do not store your location history or share it with third parties. Location data
          is only used temporarily between you and the customer during an active order.
        </Text>

        <TouchableOpacity
          style={styles.allowButton}
          onPress={() => locationModalCallback?.()}
        >
          <Text style={styles.allowButtonText}>Allow & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  return {
    requestLocationPermissionsBg,
    requestCameraPermission,
    requestNotificationPermission,
    LocationPermissionModal,
    camerAndNotification,
    checkLocationPermission,
    checkFullLocationPermission,
  };
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionWarningText: {
    fontWeight: '600',
    color: '#0F172A',
  },
  featuresList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  consentText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  allowButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
