import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import CompassHeading from 'react-native-compass-heading';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Linking, Modal, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import MapView, { AnimatedRegion } from 'react-native-maps';
import Toast from 'react-native-toast-message';
import RideMap from '../components/ride/RideMap';
import TripInfoSheet from '../components/ride/TripInfoSheet';
import CancelReasonModal from '../components/ride/CancelReasonModal';
import CustomAlert from '../components/CustomAlert';
import { Colors } from '../constants/Colors';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { useDriverFoodOrderService } from '../services/driverFoodOrderService';
import {
  getCurrentLocation,
  startDriverLocationTracking,
  stopDriverLocationTracking,
} from '../services/driverLocationTracker';
import { requestLocationPermission } from '../utils/requestLocationPermission';
import Storage from '../utils/Storage';
import { BASE_URL } from '../utils/config';
import { fontScale, scale } from '../utils/scaling';

// ─── Types ────────────────────────────────────────────────────────────────────

type RideDetailsRouteProp = RouteProp<{ RideDetails: { order: any } }, 'RideDetails'>;

const TRIP_STATUS_FLOW: Record<string, string> = {
  CREATED: 'START_RIDE',
  START_RIDE: 'ARRIVED_AT_PICKUP',
  ARRIVED_AT_PICKUP: 'LOAD_COLLECTED',
  LOAD_COLLECTED: 'DELIVERY_STARTED',
  DELIVERY_STARTED: 'DELIVERY_COMPLETED',
};

const CANCELLABLE_STATUSES = ['CREATED', 'START_RIDE', 'ARRIVED_AT_PICKUP'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'object') return value._id || value.id || null;
  return String(value).replace(/"/g, '');
};

const getText = (...values: any[]): string => {
  const found = values.find(v => v !== null && v !== undefined && String(v).trim() && String(v).trim().toLowerCase() !== 'undefined');
  return found !== undefined ? String(found).trim() : '';
};

const decodePolyline = (encoded: string) => {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RideDetailsScreen() {
  const route = useRoute<RideDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);

  const { order } = route.params;
  const activeOrderId = normalizeId(order?._id || order?.id);

  // ── State ──────────────────────────────────────────────────────────────────
  const [orderDetails, setOrderDetails] = useState<any>(order);
  const [activeTripId, setActiveTripId] = useState<string | null>(
    normalizeId(order?.tripId || order?.trip?._id || order?.trip),
  );
  const [tripStatus, setTripStatus] = useState<string>(order?.tripStatus || order?.trip?.status || 'CREATED');
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [steps, setSteps] = useState<any[]>([]);
  const [rideStarted, setRideStarted] = useState(false);
  const [showSheet, setShowSheet] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelAlertVisible, setCancelAlertVisible] = useState(false);
  const [pendingCancelReason, setPendingCancelReason] = useState('');
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [statusTimestamps, setStatusTimestamps] = useState<Record<string, string>>({});
  const [currentHeading, setCurrentHeading] = useState(0);
  const [foodOrderStatus, setFoodOrderStatus] = useState<string>(
    order?.orderStatus ?? 'ready',
  );

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null);
  const tripStatusRef = useRef(tripStatus);
  const driverLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastHeadingRef = useRef(0);
  const lastCancelKeyRef = useRef<string | null>(null);
  const coordinate = useRef(new AnimatedRegion({ latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 0 })).current;
  const currentOrder = orderDetails || order;

  // ── Derived values (food order response se map) ────────────────────────────
  const isFoodOrder = String(currentOrder?.orderNumber || currentOrder?._id || order?._id || '').includes('R-FD');
  const { updateStatus: updateFoodStatus, cancelOrder: cancelFoodOrder } = useDriverFoodOrderService();

  // pickup = restaurant location, drop = deliveryAddress
  const pickup = useMemo(() => isFoodOrder ? {
    lat: currentOrder?.restaurantId?.location?.coordinates?.latitude ?? currentOrder?.restaurantSnapshot?.location?.coordinates?.latitude,
    lng: currentOrder?.restaurantId?.location?.coordinates?.longitude ?? currentOrder?.restaurantSnapshot?.location?.coordinates?.longitude,
    address: currentOrder?.restaurantId?.location?.address ?? currentOrder?.restaurantSnapshot?.location?.address,
  } : (currentOrder?.pickup || order?.pickup), [currentOrder, isFoodOrder, order?.pickup]);

  const drop = useMemo(() => isFoodOrder ? {
    lat: currentOrder?.deliveryAddress?.latitude,
    lng: currentOrder?.deliveryAddress?.longitude,
    address: currentOrder?.deliveryAddress?.formattedAddress ?? currentOrder?.deliveryAddress?.street,
  } : (currentOrder?.drop || order?.drop), [currentOrder, isFoodOrder, order?.drop]);

  const customerPhone = isFoodOrder
    ? currentOrder?.userAuthId?.fullPhoneNumber
    : (currentOrder?.sender?.phone ?? currentOrder?.receiver?.phone);

  const customerName = isFoodOrder
    ? (currentOrder?.deliveryAddress?.contactName ?? currentOrder?.userAuthId?.fullPhoneNumber)
    : (currentOrder?.customerId?.fullName ?? currentOrder?.sender?.name);

  const orderTitle = isFoodOrder
    ? currentOrder?.items?.map((i: any) => `${i.name} x${i.quantity}`).join(', ') || 'Food Order'
    : getText(currentOrder?.package?.itemName, currentOrder?.itemName, currentOrder?.subCategoryId?.name, 'Package');

  const orderInstruction = isFoodOrder
    ? getText(currentOrder?.notes, currentOrder?.deliveryAddress?.landmark, 'No instruction')
    : getText(currentOrder?.package?.description, currentOrder?.instruction, currentOrder?.notes, 'No instruction');

  const earning = isFoodOrder
    ? Number(currentOrder?.totalAmount?.$numberDecimal ?? currentOrder?.totalAmount ?? 0)
    : (currentOrder?.finalPrice ?? currentOrder?.myQuote?.price ?? 0);

  const orderNumber = isFoodOrder ? currentOrder?.orderNumber : null;
  const isCabOrder = currentOrder?.serviceType === 'CAB';

  const getButtonText = () => {
    if (isFoodOrder) {
      if (foodOrderStatus === 'ready') return 'Picked Up Order';
      if (foodOrderStatus === 'out_for_delivery') return 'Mark Delivered';
      return 'Order Completed';
    }
    const map: Record<string, string> = {
      CREATED: 'Start Ride',
      START_RIDE: 'Arrived at Pickup',
      ARRIVED_AT_PICKUP: isCabOrder ? 'Passenger Boarded' : 'Load Collected',
      LOAD_COLLECTED: 'Start Delivery',
      DELIVERY_STARTED: isCabOrder ? 'Complete Ride' : 'Complete Delivery',
    };
    return map[tripStatus] || 'Trip Completed';
  };

  // ── Sync tripStatusRef ─────────────────────────────────────────────────────
  useEffect(() => { tripStatusRef.current = tripStatus; }, [tripStatus]);

  // ── Sync foodOrderStatus → tripStatusRef so fetchRoute uses correct phase ──
  useEffect(() => {
    if (!isFoodOrder) return;
    // Map food order status to a key fetchRoute understands
    tripStatusRef.current = foodOrderStatus === 'out_for_delivery' ? 'DELIVERY_STARTED' : 'ready';
  }, [foodOrderStatus, isFoodOrder]);

  // ── Active statuses → rideStarted ─────────────────────────────────────────
  useEffect(() => {
    if (['START_RIDE', 'ARRIVED_AT_PICKUP', 'LOAD_COLLECTED', 'DELIVERY_STARTED'].includes(tripStatus)) {
      setRideStarted(true);
    }
  }, [tripStatus]);

  // food order: rideStarted = true always (driver already accepted)
  useEffect(() => {
    if (isFoodOrder) setRideStarted(true);
  }, [isFoodOrder]);

  // ── Compass ────────────────────────────────────────────────────────────────
  useEffect(() => {
    CompassHeading.start(3, ({ heading }) => {
      let diff = heading - lastHeadingRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      lastHeadingRef.current += diff;
      setCurrentHeading(lastHeadingRef.current);
    });
    return () => CompassHeading.stop();
  }, []);

  // ── Initial driver location ────────────────────────────────────────────────
  useEffect(() => {
    getCurrentLocation().then(loc => {
      if (!loc) return;
      const pos = { latitude: loc.lat, longitude: loc.long };
      driverLocationRef.current = pos;
      setDriverLocation(pos);
      coordinate.setValue({ ...pos, latitudeDelta: 0, longitudeDelta: 0 });
      fetchRoute(pos);
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch trip id from order ───────────────────────────────────────────────
  const fetchTripIdFromOrder = useCallback(async () => {
    if (!activeOrderId) return null;
    try {
      const endpoint = isFoodOrder ? `/driver/food-orders/${activeOrderId}` : `/driver/food-orders/${activeOrderId}`;
      const res = await api.get(endpoint);
      const detail = res?.data?.data?.order ?? res?.data?.data ?? res?.data;
      if (detail) {
        setOrderDetails((prev: any) => ({ ...(prev || {}), ...detail }));
        if (isFoodOrder && detail.orderStatus) setFoodOrderStatus(detail.orderStatus);
      }
      const tripId = normalizeId(detail?.tripId || detail?.trip?._id || detail?.trip);
      if (tripId) {
        setActiveTripId(tripId);
        const status = detail?.tripStatus || detail?.trip?.status;
        if (status) setTripStatus(status);
      }
      return tripId;
    } catch { return null; }
  }, [activeOrderId, isFoodOrder]);

  useEffect(() => { fetchTripIdFromOrder(); }, [fetchTripIdFromOrder]);

  // ── Order cancelled handler ────────────────────────────────────────────────
  const handleOrderCancelled = useCallback(async (data?: any) => {
    const key = `${data?.orderId || order?._id}:${data?.tripId || order?.tripId}:${data?.cancelledBy}`;
    if (lastCancelKeyRef.current === key) return;
    lastCancelKeyRef.current = key;
    stopDriverLocationTracking();
    await Storage.removeItem('tripId');
    Toast.show({ type: 'error', text1: data?.title || 'Order Cancelled', text2: data?.reason || 'This order has been cancelled.' });
    navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] });
  }, [navigation, order]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !activeTripId) return;
    socket.emit('JOIN_TRIP', { tripId: activeTripId, userId: user?._id });
    const onConnect = () => socket.emit('JOIN_TRIP', { tripId: activeTripId, userId: user?._id });
    const onCancelled = (data: any) => handleOrderCancelled(data);
    socket.on('connect', onConnect);
    socket.on('ORDER_CANCELLED', onCancelled);
    return () => { socket.off('connect', onConnect); socket.off('ORDER_CANCELLED', onCancelled); };
  }, [activeTripId, socket, user?._id, handleOrderCancelled]);

  // ── FCM ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = messaging().onMessage(async msg => {
      if (msg?.data?.type === 'ORDER_CANCELLED') handleOrderCancelled(msg.data);
    });
    const unsub2 = messaging().onNotificationOpenedApp(msg => {
      if (msg?.data?.type === 'ORDER_CANCELLED') handleOrderCancelled(msg.data);
    });
    messaging().getInitialNotification().then(msg => {
      if (msg?.data?.type === 'ORDER_CANCELLED') handleOrderCancelled(msg.data);
    });
    return () => { unsub1(); unsub2(); };
  }, [handleOrderCancelled]);

  // ── Fetch route ────────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (origin?: { latitude: number; longitude: number }) => {
    const loc = origin || driverLocationRef.current;
    if (!loc?.latitude || !loc?.longitude) return;

    // Food order: before DELIVERY_STARTED → driver→restaurant, after → restaurant→drop
    let destLat: number | undefined;
    let destLng: number | undefined;

    if (isFoodOrder) {
      if (tripStatusRef.current === 'DELIVERY_STARTED') {
        destLat = drop?.lat;
        destLng = drop?.lng;
      } else {
        destLat = pickup?.lat;
        destLng = pickup?.lng;
      }
    } else {
      const goToPickup = ['CREATED', 'START_RIDE', 'ARRIVED_AT_PICKUP', 'LOAD_COLLECTED'];
      if (goToPickup.includes(tripStatusRef.current)) {
        destLat = pickup?.lat;
        destLng = pickup?.lng;
      } else {
        destLat = drop?.lat;
        destLng = drop?.lng;
      }
    }

    if (!destLat || !destLng) return;

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${destLat},${destLng}&mode=driving&key=AIzaSyAEGcqEOyWEexZg3ArMIHw9rsAhnb1l3N4`,
      );
      const json = await res.json();
      if (!json.routes?.length) return;
      const leg = json.routes[0].legs[0];
      setRouteCoords(decodePolyline(json.routes[0].overview_polyline.points));
      setRouteDistance(leg.distance.text);
      setRouteDuration(leg.duration.text);
      setSteps(leg.steps);
    } catch {}
  }, [pickup, drop, isFoodOrder]);

  // ── Location tracking interval ─────────────────────────────────────────────
  useEffect(() => {
    startDriverLocationTracking(activeTripId, user?._id || null, socket, loc => {
      const pos = { latitude: loc.latitude, longitude: loc.longitude };

      (coordinate as any).timing({ ...pos, duration: 1500, useNativeDriver: false }).start();
      driverLocationRef.current = pos;
      setDriverLocation(pos);

      if (loc.heading >= 0) {
        lastHeadingRef.current = loc.heading;
        setCurrentHeading(loc.heading);
      }

      mapRef.current?.animateCamera(
        { center: pos, heading: loc.heading, pitch: 45, zoom: 17 },
        { duration: 1500 },
      );
    });

    const routeInterval = setInterval(() => {
      if (driverLocationRef.current) fetchRoute(driverLocationRef.current);
    }, 8000);

    return () => { clearInterval(routeInterval); stopDriverLocationTracking(); };
  }, [activeTripId, socket, user?._id, fetchRoute, coordinate]);

  // ── Update food order status (PICKED_UP / DELIVERED) ─────────────────────
  const updateFoodOrderStatus = async () => {
    if (!activeOrderId) return;
    const nextStatus = foodOrderStatus === 'ready' ? 'PICKED_UP' : foodOrderStatus === 'out_for_delivery' ? 'DELIVERED' : null;
    if (!nextStatus) { Toast.show({ type: 'info', text1: 'Order already completed' }); return; }
    try {
      const res: any = await updateFoodStatus(activeOrderId, nextStatus as 'PICKED_UP' | 'DELIVERED');
      const updatedOrder = res?.data?.data?.order ?? res?.data?.order ?? res?.data;
      const newOrderStatus = updatedOrder?.orderStatus ?? (nextStatus === 'PICKED_UP' ? 'out_for_delivery' : 'delivered');
      setFoodOrderStatus(newOrderStatus);
      if (updatedOrder) setOrderDetails((prev: any) => ({ ...(prev || {}), ...updatedOrder }));
      Toast.show({ type: 'success', text1: nextStatus === 'PICKED_UP' ? 'Order Picked Up! Heading to customer.' : 'Order Delivered! 🎉' });
      if (nextStatus === 'PICKED_UP') {
        // route switch: restaurant → delivery address
        tripStatusRef.current = 'DELIVERY_STARTED';
        fetchRoute();
      }
      if (nextStatus === 'DELIVERED') {
        stopDriverLocationTracking();
        Storage.removeItem('tripId');
        navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update order status' });
    }
  };

  // ── Update trip status ─────────────────────────────────────────────────────
  const updateTripStatus = async () => {
    const nextStatus = TRIP_STATUS_FLOW[tripStatus];
    const tripId = activeTripId || (await fetchTripIdFromOrder());
    if (!tripId) { Toast.show({ type: 'error', text1: 'Trip ID missing' }); return null; }
    if (!nextStatus) { Toast.show({ type: 'info', text1: 'Trip already completed' }); return null; }

    try {
      const res = await fetch(`${BASE_URL}/user/trip/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await AsyncStorage.getItem('token')}` },
        body: JSON.stringify({ tripId, status: nextStatus }),
      });
      const data = await res.json();
      if (!data.success) { Toast.show({ type: 'error', text1: data.message }); return null; }

      const now = new Date().toISOString();
      setTripStatus(data.data.status);
      setTripData(data);
      setStatusTimestamps(prev => ({ ...prev, [data.data.status]: now }));
      Toast.show({ type: 'success', text1: `Status: ${data.data.status.replace(/_/g, ' ')}` });

      if (data.data.status === 'DELIVERY_COMPLETED') {
        stopDriverLocationTracking();
        Storage.removeItem('tripId');
        const timestamps = { ...statusTimestamps, [data.data.status]: now };
        const tripPayload = {
          tripId, orderId: activeOrderId,
          customerName: order?.customerId?.fullName || order?.sender?.name,
          dropAddress: order?.drop?.address,
          pickup: order.pickup, drop: order.drop,
          earning: order?.finalPrice ?? order?.myQuote?.price ?? 0,
          orderAcceptedAt: order?.createdAt,
          pickedUpAt: timestamps['LOAD_COLLECTED'],
          arrivedAtDropAt: timestamps['DELIVERY_COMPLETED'],
          totalDistance: routeDistance, totalDuration: routeDuration,
          walletDeductAmount: data.data?.walletDeductAmount ?? 0,
        };
        if (user.driverType !== 'COMPANY') {
          setTripData({ walletDeductAmount: data.data?.walletDeductAmount ?? 0 });
          setCompleteModalVisible(true);
        } else {
          navigation.navigate('TripComplete', { trip: tripPayload });
        }
      }
      return data.data.status;
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to update status' });
      return null;
    }
  };

  // ── Status button press ────────────────────────────────────────────────────
  const handleStatusPress = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Location Required', 'Enable location permission to continue.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    if (isFoodOrder) { await updateFoodOrderStatus(); return; }
    const newStatus = await updateTripStatus();
    if (newStatus === 'START_RIDE') { setRideStarted(true); fetchRoute(); }
    if (newStatus === 'DELIVERY_STARTED') { fetchRoute(); }
  };

  // ── Cancel order ───────────────────────────────────────────────────────────
  const handleCancelConfirm = async (reason: string) => {
    setCancelModalVisible(false);
    setPendingCancelReason(reason);
    setTimeout(() => setCancelAlertVisible(true), 200);
  };

  const submitCancel = async () => {
    setCancelAlertVisible(false);
    if (!activeOrderId) return;
    try {
      if (isFoodOrder) {
        await cancelFoodOrder(activeOrderId, pendingCancelReason);
        Toast.show({ type: 'success', text1: 'Order cancelled' });
        stopDriverLocationTracking();
        navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] });
        return;
      }
      const res = await fetch(`${BASE_URL}/user/order/order-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await AsyncStorage.getItem('token')}` },
        body: JSON.stringify({ orderId: activeOrderId, reason: pendingCancelReason }),
      });
      const data = await res.json();
      if (data.success) {
        Toast.show({ type: 'success', text1: 'Order cancelled' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: data.message || 'Failed to cancel' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to cancel order' });
    }
  };

  // ── Navigate ───────────────────────────────────────────────────────────────
  const openGoogleNavigation = async () => {
    const goToPickup = ['CREATED', 'START_RIDE', 'ARRIVED_AT_PICKUP', 'LOAD_COLLECTED'];
    const dest = goToPickup.includes(tripStatus) ? pickup : drop;
    const lat = dest?.lat, lng = dest?.lng;
    if (!lat || !lng) return;
    const googleUrl = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
    })!;
    const supported = await Linking.canOpenURL(googleUrl);
    Linking.openURL(supported ? googleUrl : `http://maps.apple.com/?daddr=${lat},${lng}`);
  };

  // ── Call ───────────────────────────────────────────────────────────────────
  const callCustomer = () => {
    if (customerPhone) Linking.openURL(`tel:${customerPhone}`);
    else Toast.show({ type: 'error', text1: 'Phone number not available' });
  };

  // ── Chat ───────────────────────────────────────────────────────────────────
  const openChat = () => {
    if (!activeTripId) { Toast.show({ type: 'error', text1: 'Trip not active yet' }); return; }
    navigation.navigate('ChatScreen', {
      tripId: activeTripId,
      otherUserId: currentOrder?.userAuthId?._id ?? currentOrder?.customerId?._id ?? currentOrder?.customerId,
      otherUserName: customerName,
      otherUserPhoto: currentOrder?.customerId?.portraitPhoto,
      role: 'DRIVER',
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Map — full screen */}
      <RideMap
        mapRef={mapRef}
        coordinate={coordinate}
        driverLocation={driverLocation}
        pickup={pickup}
        drop={drop}
        routeCoords={routeCoords}
        currentHeading={currentHeading}
        rideStarted={rideStarted}
        isFoodOrder={isFoodOrder}
        tripStatus={tripStatus}
        style={showSheet ? styles.mapPartial : styles.mapFull}
      />

      {/* Show Details pill when sheet is hidden */}
      {!showSheet && (
        <TouchableOpacity style={styles.showDetailsBtn} onPress={() => setShowSheet(true)}>
          <Text style={styles.showDetailsBtnText}>Show Details</Text>
        </TouchableOpacity>
      )}

      {/* Bottom sheet */}
      {showSheet && (
        <View style={styles.sheet}>
          {/* Drag handle + hide */}
          <TouchableOpacity style={styles.handleWrap} onPress={() => setShowSheet(false)}>
            <View style={styles.handle} />
          </TouchableOpacity>

          <TripInfoSheet
            pickup={pickup || {}}
            drop={drop || {}}
            orderTitle={orderTitle}
            orderInstruction={orderInstruction}
            orderNumber={orderNumber}
            customerName={customerName}
            earning={earning}
            tripStatus={tripStatus}
            isFoodOrder={isFoodOrder}
            foodOrderStatus={foodOrderStatus}
            buttonText={getButtonText()}
            isCancellable={isFoodOrder ? foodOrderStatus === 'ready' : CANCELLABLE_STATUSES.includes(tripStatus)}
            onStatusPress={handleStatusPress}
            onCancel={() => setCancelModalVisible(true)}
            onChat={openChat}
            onCall={callCustomer}
            onNavigate={openGoogleNavigation}
          />
        </View>
      )}

      {/* Cancel reason modal */}
      <CancelReasonModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelConfirm}
      />

      {/* Cancel confirm alert */}
      <CustomAlert
        visible={cancelAlertVisible}
        title="Cancel Trip"
        message="Are you sure you want to cancel this trip?"
        onDismiss={() => setCancelAlertVisible(false)}
        buttons={[
          { text: 'No', style: 'cancel', onPress: () => setCancelAlertVisible(false) },
          { text: 'Yes, Cancel', style: 'destructive', onPress: submitCancel },
        ]}
      />

      {/* Trip complete modal */}
      <Modal visible={completeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Trip Completed 🎉</Text>
            <Text style={styles.completeSub}>
              {tripData?.walletDeductAmount
                ? `Wallet deducted\n$${Number(tripData.walletDeductAmount).toFixed(2)} (Commission)`
                : 'No wallet deduction'}
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setCompleteModalVisible(false);
                navigation.navigate('TripComplete', {
                  trip: {
                    tripId: activeTripId, orderId: activeOrderId,
                    customerName: order?.customerId?.fullName || order?.sender?.name,
                    dropAddress: order?.drop?.address,
                    pickup: order.pickup, drop: order.drop,
                    earning, orderAcceptedAt: order?.createdAt,
                    pickedUpAt: statusTimestamps['LOAD_COLLECTED'],
                    arrivedAtDropAt: statusTimestamps['DELIVERY_COMPLETED'],
                    totalDistance: routeDistance, totalDuration: routeDuration,
                    walletDeductAmount: tripData?.walletDeductAmount ?? 0,
                  },
                });
              }}
            >
              <Text style={styles.confirmText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  mapPartial: { height: '45%' },
  mapFull: { flex: 1 },
  sheet: { flex: 1 },
  handleWrap: { alignItems: 'center', paddingVertical: scale(10), backgroundColor: Colors.surface },
  handle: { width: scale(40), height: scale(4), borderRadius: scale(2), backgroundColor: Colors.border },
  showDetailsBtn: {
    position: 'absolute', bottom: scale(30), left: scale(20), right: scale(20),
    backgroundColor: Colors.primaryDark, height: scale(52), borderRadius: scale(14),
    justifyContent: 'center', alignItems: 'center',
  },
  showDetailsBtnText: { color: Colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  completeCard: {
    width: '82%', backgroundColor: Colors.surface,
    borderRadius: scale(16), padding: scale(24), alignItems: 'center',
  },
  completeTitle: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(18), color: Colors.text, marginBottom: scale(8) },
  completeSub: { fontFamily: 'Rubik-Regular', fontSize: fontScale(14), color: Colors.textMuted, textAlign: 'center', marginBottom: scale(20) },
  confirmBtn: { backgroundColor: Colors.primaryDark, paddingVertical: scale(14), paddingHorizontal: scale(40), borderRadius: scale(12) },
  confirmText: { color: Colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14) },
});
