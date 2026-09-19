import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { AnimatedRegion, Marker, Polyline } from 'react-native-maps';

interface Props {
  mapRef: React.RefObject<MapView>;
  coordinate: AnimatedRegion;
  driverLocation: { latitude: number; longitude: number } | null;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  routeCoords: { latitude: number; longitude: number }[];
  currentHeading: number;
  rideStarted: boolean;
  isFoodOrder?: boolean;
  tripStatus?: string;
  style?: any;
}

export default function RideMap({
  mapRef, coordinate, driverLocation, pickup, drop,
  routeCoords, currentHeading, rideStarted, isFoodOrder, tripStatus, style,
}: Props) {
  const deliveryStarted = isFoodOrder && (tripStatus === 'DELIVERY_STARTED' || tripStatus === 'DELIVERY_COMPLETED');
  const showPickupMarker = isFoodOrder ? true : !rideStarted;
  const showDropMarker = isFoodOrder ? deliveryStarted : true;
  const scooterHeading = useMemo(() => {
    if (!driverLocation) return currentHeading;

    // Find the nearest route segment and follow its start-to-destination bearing.
    const longitudeScale = Math.cos(driverLocation.latitude * Math.PI / 180);
    let nearestDistance = Infinity;
    let heading = currentHeading;
    for (let i = 0; i < routeCoords.length - 1; i += 1) {
      const start = routeCoords[i];
      const end = routeCoords[i + 1];
      const x = (start.longitude - driverLocation.longitude) * longitudeScale;
      const y = start.latitude - driverLocation.latitude;
      const dx = (end.longitude - start.longitude) * longitudeScale;
      const dy = end.latitude - start.latitude;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared === 0) continue;
      const progress = Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared));
      const distance = (x + progress * dx) ** 2 + (y + progress * dy) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      }
    }
    return heading;
  }, [driverLocation, routeCoords, currentHeading]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={{
        latitude: driverLocation?.latitude ?? pickup.lat,
        longitude: driverLocation?.longitude ?? pickup.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {showPickupMarker && pickup?.lat ? (
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pinMarker}>
            <Text style={[styles.pinIcon, deliveryStarted && styles.visitedIcon]}>
              {isFoodOrder ? (deliveryStarted ? '🍽️' : '🏁') : '📍'}
            </Text>
          </View>
        </Marker>
      ) : null}

      {showDropMarker && drop?.lat ? (
        <Marker
          coordinate={{ latitude: drop.lat, longitude: drop.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pinMarker}><Text style={styles.pinIcon}>🏁</Text></View>
        </Marker>
      ) : null}

      {routeCoords.length > 0 && (
        <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#014D4D" />
      )}

      {driverLocation && (
        <Marker.Animated
          coordinate={Platform.OS === 'android' ? driverLocation : coordinate as any}
          // The scooter emoji faces left; offset it to match a north-based bearing.
          rotation={isFoodOrder ? (scooterHeading + 90) % 360 : currentHeading}
          flat
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.vehicleMarker}>
            <Text style={styles.vehicleIcon}>{isFoodOrder ? '🛵' : '🚗'}</Text>
          </View>
        </Marker.Animated>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  pinMarker: { justifyContent: 'center', alignItems: 'center' },
  pinIcon: { fontSize: 28 },
  visitedIcon: { opacity: 0.5 },
  vehicleMarker: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  vehicleIcon: { fontSize: 28 },
});
