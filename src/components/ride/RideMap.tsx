import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
          coordinate={coordinate as any}
          flat
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={[styles.vehicleMarker, { transform: [{ rotate: `${currentHeading}deg` }] }]}>
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
