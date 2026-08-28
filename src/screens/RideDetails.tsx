import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  Animated,
  Alert,
  TextInput,
  Modal,
    PanResponder,
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import {
  getCurrentLocation,
  startDriverLocationTracking,
  stopDriverLocationTracking,
} from '../services/driverLocationTracker';
import { useNavigation } from '@react-navigation/native';
import CompassHeading from 'react-native-compass-heading';

import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Colors } from '../constants/Colors';
import { ScrollView } from 'react-native';
import { scale, fontScale } from '../utils/scaling';
import { BASE_URL, BlueLocation, RedLocation } from '../utils/config';
import ReceiverIcon from '../assets/svg/receiverIcon.svg';

import { PermissionsAndroid, Platform } from 'react-native';

import BottomBG1 from '../assets/svg/bottomBg1.svg';

import CallSvg from '../assets/svg/Icon.svg';
import MessageSvg from '../assets/svg/Comment.svg';
import NavigateSvg from '../assets/svg/navigateSvg.svg';
import CrossIcon from '../assets/svg/cross.svg';
import Toast from 'react-native-toast-message';
import messaging from '@react-native-firebase/messaging';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocketContext } from '../context/SocketContext';
import { requestLocationPermission } from '../utils/requestLocationPermission';
import { useAuth } from '../context/AuthContext';
import Storage from '../utils/Storage';
import { api } from '../services/apiClient';
import ChatSvgCode from '../assets/svg/ChatSvgCode';
import NavigateSvgCode from '../assets/svg/NavigateSvgCode';

type MarkerType = 'SENDER' | 'RECEIVER';
type RideDetailsRouteProp = RouteProp<
  {
    RideDetails: {
      order: any;
    };
  },
  'RideDetails'
>;

export default function RideDetailsScreen() {
  const route = useRoute<RideDetailsRouteProp>();
  const { order } = route.params;
  const normalizeId = (value: any) => {
    if (!value) return null;
    if (typeof value === 'object') {
      return value._id || value.id || null;
    }
    return String(value).replace(/"/g, '');
  };
  const activeOrderId = normalizeId(order?._id || order?.id);
  const [activeTripId, setActiveTripId] = useState<string | null>(
    normalizeId(order?.tripId || order?.trip?._id || order?.trip),
  );
  const [navigationMode, setNavigationMode] = useState(false);
  const coordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const [tripData, setTripData] = useState<any>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [customReason, setCustomReason] = useState('');
  const [heading, setHeading] = useState(0);
  const [rideStarted, setRideStarted] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [tripStatus, setTripStatus] = useState(
    order?.tripStatus || order?.trip?.status || 'CREATED',
  );
  const [cancelAlertVisible, setCancelAlertVisible] = useState(false);
  const [statusTimestamps, setStatusTimestamps] = useState<
    Record<string, string>
  >({});
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [cancelReasonModalVisible, setCancelReasonModalVisible] =
    useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const CANCEL_REASONS = [
    'Vehicle breakdown',
    'Personal emergency',
    'Wrong location',
    'Customer not responding',
    'Other',
  ];
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(order);


  const currentOrder = orderDetails || order;
  const getTextValue = (...values: any[]) => {
    const value = values.find(item => {
      if (item === null || item === undefined) return false;
      const text = String(item).trim();
      return text.length > 0 && text.toLowerCase() !== 'undefined';
    });

    return value === null || value === undefined ? '' : String(value).trim();
  };


const tripDetailsPanResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 15 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 60) {
        setShowContent(false);
      }
    },
  }),
).current;

  const packageInfo = currentOrder?.package || {};
  const packagePhotoDescription = Array.isArray(packageInfo?.photos)
    ? getTextValue(...packageInfo.photos.map((photo: any) => photo?.description))
    : '';
  const packageWeight = getTextValue(
    packageInfo?.weight && `${packageInfo.weight} ${packageInfo?.weightUnit || ''}`,
  );
  const orderTitle = getTextValue(
    packageInfo?.itemName,
    packageInfo?.name,
    currentOrder?.itemName,
    currentOrder?.subCategoryId?.name,
    currentOrder?.categoryId?.name,
    packageWeight,
    'Package',
  );
  const orderInstruction = getTextValue(
    packageInfo?.description,
    currentOrder?.instruction,
    currentOrder?.instructions,
    currentOrder?.orderInstruction,
    currentOrder?.deliveryInstruction,
    currentOrder?.specialInstruction,
    currentOrder?.notes,
    packagePhotoDescription,
    'No instruction added',
  );

  const mapRef = useRef<MapView | null>(null);
  const tripStatusRef = useRef(tripStatus);
  const lastOrderCancelNoticeRef = useRef<string | null>(null);
  // 1. Add rotation animated value ref
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastHeadingRef = useRef(0);
  const [currentHeading, setCurrentHeading] = React.useState(0);

  const { socket } = useContext(SocketContext);
  // const driverIdRef = useRef<string | null>(null);

  const fetchTripIdFromOrder = async () => {
    if (!activeOrderId) return null;

    try {
      const res = await api.get(`/user/order/orderDetail/${activeOrderId}`);
      const detail = res?.data?.data || res?.data;
      if (detail) {
        setOrderDetails((prev: any) => ({
          ...(prev || {}),
          ...detail,
        }));
      }
      const recoveredTripId = normalizeId(
        detail?.tripId || detail?.trip?._id || detail?.trip,
      );

      if (recoveredTripId) {
        setActiveTripId(recoveredTripId);
        if (detail?.tripStatus || detail?.trip?.status) {
          setTripStatus(detail.tripStatus || detail.trip.status);
        }
      }

      return recoveredTripId;
    } catch (error) {
      console.log('Recover trip id failed:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!activeOrderId) return;
    fetchTripIdFromOrder();
  }, [activeOrderId]);

  const openNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.pickup.lat},${order.pickup.lng}`;
    Linking.openURL(url);
  };
  const isCabOrder = currentOrder?.serviceType === 'CAB';

  const TRIP_STATUS_FLOW = {
    CREATED: 'START_RIDE',
    START_RIDE: 'ARRIVED_AT_PICKUP',
    ARRIVED_AT_PICKUP: 'LOAD_COLLECTED',
    LOAD_COLLECTED: 'DELIVERY_STARTED',
    DELIVERY_STARTED: 'DELIVERY_COMPLETED',
  };

  const handleOrderCancelled = async (data?: any) => {
    const cancelKey = `${data?.orderId || order?._id || ''}:${
      data?.tripId || order?.tripId || ''
    }:${data?.cancelledBy || ''}`;

    if (lastOrderCancelNoticeRef.current === cancelKey) return;
    lastOrderCancelNoticeRef.current = cancelKey;

    stopDriverLocationTracking();
    await Storage.removeItem('tripId');

    Toast.show({
      type: 'error',
      text1: data?.title || 'Order Cancelled',
      text2:
        data?.cancelledBy === 'CUSTOMER'
          ? data?.reason || 'The customer has cancelled this order.'
          : data?.reason || data?.message || 'This order has been cancelled.',
    });

    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', params: { screen: 'Home' } }],
    });
  };

  // Load driverId once on mount
  // useEffect(() => {
  //   const loadDriverId = async () => {
  //     const id = await AsyncStorage.getItem('driverId');
  //     driverIdRef.current = id;
  //   };
  //   loadDriverId();
  // }, []);

  // JOIN_TRIP is already handled in RequestCard when accepting delivery
  // No need to join again here

  useEffect(() => {
    if (!socket || !activeTripId) return;

    socket.emit('JOIN_TRIP', {
      tripId: activeTripId,
      userId: user?._id,
    });

    socket.on('connect', () => {
      console.log('Socket connected again');

      socket.emit('JOIN_TRIP', {
        tripId: activeTripId,
        userId: user?._id,
      });
    });

    socket.on('ORDER_CANCELLED', (data: any) => {
      console.log('ORDER_CANCELLED received:', data);
      handleOrderCancelled(data);
    });

    return () => {
      socket.off('connect');
      socket.off('ORDER_CANCELLED');
    };
  }, [activeTripId, socket, user?._id]);

  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      const data: any = remoteMessage?.data || {};
      if (data.type === 'ORDER_CANCELLED') {
        handleOrderCancelled(data);
      }
    });

    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      remoteMessage => {
        const data: any = remoteMessage?.data || {};
        if (data.type === 'ORDER_CANCELLED') {
          handleOrderCancelled(data);
        }
      },
    );

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        const data: any = remoteMessage?.data || {};
        if (data.type === 'ORDER_CANCELLED') {
          handleOrderCancelled(data);
        }
      });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, []);

  useEffect(() => {
    tripStatusRef.current = tripStatus;
  }, [tripStatus]);

  const updateTripStatus = async () => {
    console.log("laoidflsdhfshfdioh")
    const nextStatus = TRIP_STATUS_FLOW[tripStatus];
    const tripIdForRequest = activeTripId || (await fetchTripIdFromOrder());

    if (!tripIdForRequest) {
      Toast.show({
        type: 'error',
        text1: 'Trip ID missing',
        text2: 'Please refresh the active ride and try again.',
      });
      return null;
    }

    if (!nextStatus) {
      Toast.show({
        type: 'info',
        text1: 'Trip already completed',
      });
      return null;
    }

    try {
      console.log(nextStatus, "nestatus")
      const res = await fetch(`${BASE_URL}/user/trip/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },

        body: JSON.stringify({
          tripId: tripIdForRequest,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      console.log('Update status response:', data);

      if (data.success) {
        const newStatus = data.data.status;
        const now = new Date().toISOString();
        setTripData(data)
        setTripStatus(newStatus);
        setStatusTimestamps(prev => ({ ...prev, [newStatus]: now }));

        Toast.show({
          type: 'success',
          text1: `Status updated: ${newStatus.replace(/_/g, ' ')}`,
        });

        if (newStatus === 'DELIVERY_COMPLETED') {
          stopDriverLocationTracking();
          Storage.removeItem('tripId');
          const updatedTimestamps = { ...statusTimestamps, [newStatus]: now };
          const walletDeductAmount = data.data?.walletDeductAmount ?? 0;

          const tripPayload = {
            tripId: tripIdForRequest,
            orderId: activeOrderId,
            customerName: order?.customerId?.fullName || order?.sender?.name,
            dropAddress: order?.drop?.address,
            pickup: order.pickup,
            drop: order.drop,
            earning: order?.finalPrice ?? order?.myQuote?.price ?? 0,
            orderAcceptedAt: order?.createdAt,
            pickedUpAt: updatedTimestamps['LOAD_COLLECTED'],
            arrivedAtDropAt: updatedTimestamps['DELIVERY_COMPLETED'],
            totalDistance: routeDistance,
            totalDuration: routeDuration,
            walletDeductAmount,
          };

          if (user.driverType !== 'COMPANY') {
            setTripData({ walletDeductAmount });
            setCompleteModalVisible(true);
          } else {
            navigation.navigate('TripComplete', { trip: tripPayload });
          }
        }

     
        return newStatus;
      }else{
        Toast.show({
        type: 'error',
        text1: data.message,
        })
      }
    } catch (error) {
      console.log('Update status error:', error);
      const err = error as any
      Toast.show({
        type: 'error',
        text1: err.response.data.message,
      });
    }
    return null;
  };

  const navigation = useNavigation<any>();

  const messageCustomer = () => {
    if (!activeTripId) {
      Toast.show({
        type: 'error',
        text1: 'Trip not active yet',
      });
      return;
    }

    const tripId = activeTripId;
    const customerId = order?.customerId?._id || order?.customerId;
    const customerName = order?.customerId?.fullName || order?.sender?.name;
    const customerPhoto =
      order?.customerId?.portraitPhoto || order?.sender?.portraitPhoto;



    navigation.navigate('ChatScreen', {
      tripId,
      otherUserId: customerId,
      otherUserName: customerName,
      otherUserPhoto: customerPhoto,
      role: 'DRIVER',
    });
  };
  const getButtonText = () => {
    switch (tripStatus) {
      case 'CREATED':
        return 'Start Ride';
      case 'START_RIDE':
        return 'Arrived at Pickup';
      case 'ARRIVED_AT_PICKUP':
        return isCabOrder ? 'Passenger Boarded' : 'Load Collected';
      case 'LOAD_COLLECTED':
        return 'Start Delivery';
      case 'DELIVERY_STARTED':
        return isCabOrder ? 'Complete Ride' : 'Complete Delivery';
      default:
        return 'Trip Completed';
    }
  };

  const StackedLocationMarker = ({ type }: { type: MarkerType }) => {
    if (type === 'RECEIVER') {
      return (
        <View style={styles.receiverMarker}>
          <ReceiverIcon />
        </View>
      );
    }

    return (
      <View>
        <BottomBG1 />
        {/* <BottomBG2 />
        <Location /> */}
      </View>
    );
  };
  // useEffect(() => {
  //   const fetchTripStatus = async () => {
  //     try {
  //       const res = await fetch(`${BASE_URL}/user/trip/${order.tripId}`, {
  //         headers: {
  //           Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
  //         },
  //       });

  //       const data = await res.json();

  //       if (data.success) {
  //         setTripStatus(data.trip.tripStatus);
  //       }
  //     } catch (error) {
  //       console.log('Trip status fetch error:', error);
  //     }
  //   };

  //   if (order?.tripId) {
  //     fetchTripStatus();
  //   }
  // }, []);
  // 5. Also update compass to use the same rotation animation
  useEffect(() => {
    CompassHeading.start(3, ({ heading }) => {
      let diff = heading - lastHeadingRef.current;

      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      const newHeading = lastHeadingRef.current + diff;

      lastHeadingRef.current = newHeading;
      setCurrentHeading(newHeading);
    });

    return () => CompassHeading.stop();
  }, []);

  // Check if ride should be started based on trip status
  useEffect(() => {
    const activeStatuses = [
      'START_RIDE',
      'ARRIVED_AT_PICKUP',
      'LOAD_COLLECTED',
      'DELIVERY_STARTED',
    ];

    if (activeStatuses.includes(tripStatus)) {
      setRideStarted(true);
    }
  }, [tripStatus]);

const openGoogleNavigation = async (status?: string) => {
  const currentStatus = status ?? tripStatus;

  let lat;
  let lng;

  if (
    currentStatus === 'CREATED' ||
    currentStatus === 'START_RIDE' ||
    currentStatus === 'ARRIVED_AT_PICKUP' ||
    currentStatus === 'LOAD_COLLECTED'
  ) {
    lat = order.pickup.lat;
    lng = order.pickup.lng;
  } else if (currentStatus === 'DELIVERY_STARTED') {
    lat = order.drop.lat;
    lng = order.drop.lng;
  }

  const googleMapsUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
  });

  const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;

  try {
    const supported = await Linking.canOpenURL(googleMapsUrl!);

    if (supported) {
      await Linking.openURL(googleMapsUrl!);
    } else {
      // fallback to Apple Maps on iOS
      await Linking.openURL(appleMapsUrl);
    }
  } catch (error) {
    console.log('Navigation error:', error);

    Toast.show({
      type: 'error',
      text1: 'Unable to open navigation',
    });
  }
};
  // Unified interval for location updates
  useEffect(() => {
    let interval: any;
    let routeInterval: any;

    if (activeTripId) {
      startDriverLocationTracking(activeTripId, user?._id || null, socket);

      interval = setInterval(async () => {
        const location = await getCurrentLocation();
        if (!location) return;

        const driver = { latitude: location.lat, longitude: location.long };
        console.log(
          '🚚 DRIVER LOCATION EMIT:',
          activeTripId,
          user?._id,
          location.lat,
          location.long,
        );

        // Emit socket event with validation
        if (socket?.connected && user?._id) {
          socket.emit('DRIVER_LOCATION_UPDATE', {
            tripId: activeTripId,
            driverId: user._id,
            lat: location.lat,
            lng: location.long,
          });
        }

        // Smooth coordinate animation
        (coordinate as any)
          .timing({
            latitude: driver.latitude,
            longitude: driver.longitude,
            duration: 1500,
            useNativeDriver: false,
          })
          .start();

        setDriverLocation(driver);

        // Update heading from GPS when available
        if (
          location.heading !== null &&
          location.heading !== undefined &&
          location.heading >= 0
        ) {
          lastHeadingRef.current = location.heading;
          setCurrentHeading(location.heading);
        }

        // Camera follow
        mapRef.current?.animateCamera(
          {
            center: driver,
            heading: location.heading || 0,
            pitch: 45,
            zoom: 17,
          },
          { duration: 1500 },
        );

        if (rideStarted) {
          checkNavigationStep(driver);
        }
      }, 2000);

      // Route refresh separately - less frequent
      routeInterval = setInterval(async () => {
        const location = await getCurrentLocation();
        if (!location) return;
        fetchRoute({ latitude: location.lat, longitude: location.long });
      }, 8000);

      return () => {
        clearInterval(interval);
        clearInterval(routeInterval);
        stopDriverLocationTracking();
      };
    }
  }, [activeTripId, rideStarted, socket, user?._id]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };
  const checkNavigationStep = driver => {
    if (!steps.length) return;

    const next = steps[0];

    const distance = getDistance(
      driver.latitude,
      driver.longitude,
      next.end_location.lat,
      next.end_location.lng,
    );

    if (distance < 30) {
      const remaining = steps.slice(1);
      setSteps(remaining);
      setCurrentStep(remaining[0]);
    }
  };

  useEffect(() => {
    if (rideStarted && driverLocation) {
      fetchRoute(driverLocation);
    }
  }, [rideStarted]);

  useEffect(() => {
    const loadDriverLocation = async () => {
      try {
        const location = await getCurrentLocation();

        if (location) {
          console.log('Driver location from util:', location);
          setDriverLocation({
            latitude: location.lat,
            longitude: location.long,
          });

          coordinate.setValue({
            latitude: location.lat,
            longitude: location.long,
            latitudeDelta: 0,
            longitudeDelta: 0,
          });
        }
      } catch (error) {
        console.log('Location error:', error);
      }
    };

    loadDriverLocation();
  }, []);

  const callCustomer = () => {
    const phone =
      tripStatus === 'DELIVERY_STARTED'
        ? order?.receiver?.phone
        : order?.sender?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Phone number not available',
      });
    }
  };
  const decodePolyline = (encoded: string) => {
    let points = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  console.log('Pickup:', order.pickup);
  console.log('Driver:', driverLocation);

  // const fetchRoute = async (driver?: any) => {
  //   const origin = driver || driverLocation;

  //   if (!origin?.latitude || !origin?.longitude) {
  //     console.log('Driver location not available yet');
  //     return;
  //   }

  //   try {
  //     let destination;

  //     if (tripStatus === 'CREATED' || tripStatus === 'START_RIDE') {
  //       destination = `${order.pickup.lat},${order.pickup.lng}`;
  //     } else {
  //       destination = `${order.drop.lat},${order.drop.lng}`;
  //     }

  //     const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&key=AIzaSyAEGcqEOyWEexZg3ArMIHw9rsAhnb1l3N4`;

  //     const res = await fetch(url);
  //     const json = await res.json();
  //     console.log('Directions API response:', json);

  //     if (!json?.routes?.length) return;

  //     const polyline = json.routes[0].overview_polyline.points;

  //     const points = decodePolyline(polyline);

  //     setRouteCoords(points);
  //     setTimeout(() => {
  //       mapRef.current?.fitToCoordinates(points, {
  //         edgePadding: { top: 100, right: 50, bottom: 120, left: 50 },
  //         animated: true,
  //       });
  //     }, 300);
  //   } catch (e) {
  //     console.log('Route error:', e);
  //   }
  // };
  // 1. Fix destination logic in fetchRoute — use tripStatusRef
  const fetchRoute = async (driver?: any) => {
    const origin = driver || driverLocation;
    if (!origin?.latitude || !origin?.longitude) return;

    try {
      let destination;

      // Driver → Pickup for these statuses
      const goToPickup = [
        'CREATED',
        'START_RIDE',
        'ARRIVED_AT_PICKUP',
        'LOAD_COLLECTED',
      ];

      if (goToPickup.includes(tripStatusRef.current)) {
        destination = `${order.pickup.lat},${order.pickup.lng}`;
      } else {
        // DELIVERY_STARTED → Drop
        destination = `${order.drop.lat},${order.drop.lng}`;
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&mode=driving&key=AIzaSyAEGcqEOyWEexZg3ArMIHw9rsAhnb1l3N4`;

      const res = await fetch(url);
      const json = await res.json();
      if (!json.routes?.length) return;

      const route = json.routes[0];
      const points = decodePolyline(route.overview_polyline.points);
      setRouteCoords(points);

      const leg = route.legs[0];
      setRouteDistance(leg.distance.text);
      setRouteDuration(leg.duration.text);
      setSteps(leg.steps);
      setCurrentStep(leg.steps[0]);
    } catch (e) {
      console.log('Route error:', e);
    }
  };
  useEffect(() => {
    console.log('Updated routeCoords:', routeCoords.length);
  }, [routeCoords]);

  useEffect(() => {
    if (navigationMode && driverLocation && routeCoords.length === 0) {
      fetchRoute();
    }
  }, [navigationMode, driverLocation]);

  return (
    <View style={styles.container}>
      {navigationMode && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setNavigationMode(false);
            setRouteCoords([]);
          }}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}
      {/* ---------- MAP ---------- */}
      {currentStep && navigationMode && (
        <View style={styles.navigationBox}>
          <Text style={styles.navText}>
            {currentStep.html_instructions.replace(/<[^>]*>?/gm, '')}
          </Text>

          <Text style={styles.navDistance}>{currentStep.distance.text}</Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={[
          styles.map,
          navigationMode && { height: '100%' },
          !navigationMode && !showContent && { height: '100%' },
        ]}
          onPress={() => {
    if (!navigationMode && showContent) {
      setShowContent(false);
    }
  }}
        initialRegion={{
          latitude: driverLocation?.latitude || order.pickup.lat,
          longitude: driverLocation?.longitude || order.pickup.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Pickup Marker */}
        {/* Pickup Marker */}
        {!rideStarted && (
          <Marker
            coordinate={{
              latitude: order.pickup.lat,
              longitude: order.pickup.lng,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <StackedLocationMarker type="SENDER" />
          </Marker>
        )}
        {/* Drop Marker */}
        <Marker
          coordinate={{
            latitude: order.drop.lat,
            longitude: order.drop.lng,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={true}
        >
          <StackedLocationMarker type="RECEIVER" />
        </Marker>
        {/* Route Line */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={6}
            strokeColor="blue"
          />
        )}
        {driverLocation && (
          <Marker.Animated
            coordinate={coordinate as any}
            flat
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <Image
              source={require('../assets/images/navigate.png')}
              style={{
                width: 40,
                height: 40,
                resizeMode: 'contain',
                transform: [{ rotate: `${currentHeading - 90}deg` }],
              }}
            />
          </Marker.Animated>
        )}
      </MapView>
      {navigationMode && (
        <TouchableOpacity
          style={styles.startRideBtn}
          onPress={async () => {
            await updateTripStatus();
          }}
        >
          <Text style={styles.startText}>{getButtonText()}</Text>
        </TouchableOpacity>
      )}

      {/* ---------- CONTENT ---------- */}
      {!navigationMode && showContent && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: scale(40) }}
          showsVerticalScrollIndicator={false}
            {...tripDetailsPanResponder.panHandlers}
        >
          <View style={styles.content}>
            {/* Pickup */}
            <TouchableOpacity
  style={styles.hideModalBtn}
  onPress={() => setShowContent(false)}
>
  <Text style={styles.hideModalBtnText}>Hide</Text>
</TouchableOpacity>
            <View style={styles.locationCard}>
              <View style={styles.rowBetween}>
                <View style={[styles.row, { flex: 1 }]}>
                  <BlueLocation />
                  <View style={{ marginLeft: scale(10), flex: 1 }}>
                    <Text style={styles.label}>Pickup</Text>
                    <Text style={styles.address}>
                      {currentOrder?.pickup?.address || 'Pickup address not available'}
                    </Text>
                  </View>
                </View>
                {!!currentOrder?.pickup?.time && (
                  <Text style={styles.time}>{currentOrder.pickup.time}</Text>
                )}
              </View>

              <View style={styles.actionRow}>
                 {/* <View style={styles.actionIcons}> */}
                     <TouchableOpacity
                 style={[styles.navigateBtn,{
                  gap: scale(5),
                  alignItems:"center"
                 }]}
                    onPress={messageCustomer}
                  >
                    {/* <MessageSvg 
                    color={'white'}
                    height={40} width={40}
                    /> */}
                    <Text style={styles.navigateText}> Chat</Text>
                    <ChatSvgCode/>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={callCustomer}
                  >
                    <CallSvg  
                    // height={30} width={30} 
                    />
                  </TouchableOpacity>

                {/* </View> */}
                <TouchableOpacity
                  style={[styles.callBtn ,{
                    transform: [{ rotate: '35deg' }],
                  }]}
                  onPress={async () => {
                    const granted = await requestLocationPermission();
                    if (!granted) {
                      Alert.alert(
                        'Location Permission Required',
                        'Please enable location permission from settings to use navigation.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ],
                      );
                      return;
                    }

                    // setNavigationMode(true);
                    await fetchRoute();
                    await openGoogleNavigation()
                  }}
                >
                  {/* <NavigateSvg  color={'red'}/> */}
                  <NavigateSvgCode height={30} width={20} />
                  {/* <Text style={styles.navigateText}> Navigate</Text> */}
                </TouchableOpacity>

               
              </View>

              {/* Delivery */}
              <View style={[styles.row, { marginTop: scale(15) }]}>
                <RedLocation />
                <View style={{ marginLeft: scale(10) }}>
                  <Text style={styles.label}>Delivery</Text>
                  <Text style={styles.address}>
                    {currentOrder?.drop?.address || 'Delivery address not available'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trip Details */}
            <Text style={styles.sectionTitle}>Trip Details</Text>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailTitle}>Order</Text>
                <Text style={styles.detailSubtitle}>{orderTitle}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailTitle}>Instruction</Text>
                <Text style={styles.detailSubtitle}>{orderInstruction}</Text>
              </View>
            </View>

            {/* Earnings */}
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Earning</Text>
              <Text style={styles.earningAmount}>
                ${order.finalPrice ?? order.myQuote?.price ?? 0}
              </Text>
            </View>

            {/* Start Ride */}
            {!navigationMode && (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={async () => {
                    try {
                      const tripIdForAction =
                        activeTripId || (await fetchTripIdFromOrder());

                      if (!tripIdForAction) {
                        Toast.show({
                          type: 'error',
                          text1: 'Trip ID missing',
                          text2: 'Please refresh the active ride and try again.',
                        });
                        return;
                      }

                      if (!order?.pickup?.lat || !order?.drop?.lat) {
                        Toast.show({
                          type: 'error',
                          text1: 'Location data missing',
                        });
                        return;
                      }

                      const granted = await requestLocationPermission();
                      if (!granted) {
                        Alert.alert(
                          'Location Permission Required',
                          'Please enable location permission from settings to start the ride.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                          ],
                        );
                        return;
                      }

                      const newStatus = await updateTripStatus();

                      if (!newStatus) return;

                      if (newStatus === 'START_RIDE') {
                        setRideStarted(true);
                        // setNavigationMode(true);
                        await fetchRoute();
                      }

                      if (newStatus === 'DELIVERY_STARTED') {
                        setNavigationMode(true);
                        await fetchRoute();
                      }
                    } catch (error) {
                      console.log('Start ride error:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Failed to start ride',
                      });
                    }
                  }}
                >
                  <Text style={styles.startText}>{getButtonText()}</Text>
                </TouchableOpacity>
                {!['LOAD_COLLECTED', 'DELIVERY_STARTED'].includes(
                  tripStatus,
                ) && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCancelReasonModalVisible(true)}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                <CustomAlert
                  visible={cancelAlertVisible}
                  title="Cancel Trip"
                  message="Are you sure you want to cancel this trip?"
                  onDismiss={() => setCancelAlertVisible(false)}
                  buttons={[
                    {
                      text: 'No',
                      style: 'cancel',
                      onPress: () => setCancelAlertVisible(false),
                    },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: async () => {
                        setCancelAlertVisible(false);
                        if (!activeOrderId) {
                          Toast.show({
                            type: 'error',
                            text1: 'Order ID missing',
                            text2: 'Please refresh the active ride and try again.',
                          });
                          return;
                        }
                        try {
                          const res = await fetch(
                            `${BASE_URL}/user/order/order-cancel`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${await AsyncStorage.getItem(
                                  'token',
                                )}`,
                              },
                              body: JSON.stringify({
                                orderId: activeOrderId,
                                reason:
                                  selectedReason === 'Other'
                                    ? customReason
                                    : selectedReason,
                              }),
                            },
                          );
                          const data = await res.json();
                          if (data.success) {
                            Toast.show({
                              type: 'success',
                              text1: 'Order cancelled successfully',
                            });
                            setSelectedReason(null);
                            navigation.goBack();
                          } else {
                            Toast.show({
                              type: 'error',
                              text1: data.message || 'Failed to cancel order',
                            });
                          }
                        } catch (error) {
                          console.log('Cancel order error:', error);
                          Toast.show({
                            type: 'error',
                            text1: 'Failed to cancel order',
                          });
                        }
                      },
                    },
                  ]}
                />
              </View>
            )}
          </View>
        </ScrollView>
        
      )}
      {!navigationMode && !showContent && (
  <TouchableOpacity
    style={styles.tripDetailsBtn}
    onPress={() => setShowContent(true)}
  >
    <Text style={styles.tripDetailsBtnText}>Show Details</Text>
  </TouchableOpacity>
)}
      {cancelReasonModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Cancel Reason</Text>
              <TouchableOpacity onPress={() => { setCancelReasonModalVisible(false); setSelectedReason(null); }}>
                <CrossIcon width={20} height={20} />
              </TouchableOpacity>
            </View>

            {CANCEL_REASONS.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reasonItem}
                onPress={() => {
                  if (reason === 'Other') {
                    setSelectedReason('Other');
                  } else {
                    setSelectedReason(reason);
                    setCancelReasonModalVisible(false);

                    setTimeout(() => {
                      setCancelAlertVisible(true);
                    }, 200);
                  }
                }}
              >
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            {selectedReason === 'Other' && (
              <TextInput
                placeholder="Enter reason"
                placeholderTextColor={Colors.black}
                value={customReason}
                onChangeText={setCustomReason}
                style={styles.input}
              />
            )}
            {selectedReason === 'Other' && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  if (!customReason.trim()) {
                    Toast.show({
                      type: 'error',
                      text1: 'Please enter a reason',
                    });
                    return;
                  }

                  setCancelReasonModalVisible(false);

                  setTimeout(() => {
                    setCancelAlertVisible(true);
                  }, 200);
                }}
              >
                <Text style={styles.confirmText}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <Modal visible={completeModalVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.completeModal}>
      <Text style={styles.completeTitle}>Trip Completed</Text>
      <Text style={styles.completeSubtitle}>
        {tripData?.walletDeductAmount
          ? `Wallet deducted\n$${Number(tripData.walletDeductAmount).toFixed(2)} (Trip Commission)`
          : 'No wallet deduction'}
      </Text>
      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => {
          setCompleteModalVisible(false);
          const updatedTimestamps = { ...statusTimestamps, DELIVERY_COMPLETED: new Date().toISOString() };
          navigation.navigate('TripComplete', {
            trip: {
              tripId: activeTripId,
              orderId: activeOrderId,
              customerName: order?.customerId?.fullName || order?.sender?.name,
              dropAddress: order?.drop?.address,
              pickup: order.pickup,
              drop: order.drop,
              earning: order?.finalPrice ?? order?.myQuote?.price ?? 0,
              orderAcceptedAt: order?.createdAt,
              pickedUpAt: updatedTimestamps['LOAD_COLLECTED'],
              arrivedAtDropAt: updatedTimestamps['DELIVERY_COMPLETED'],
              totalDistance: routeDistance,
              totalDuration: routeDuration,
              walletDeductAmount: tripData?.walletDeductAmount ?? 0,
            },
          });
        }}
      >
        <Text style={styles.confirmText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  map: {
    height: scale(220),
  },
  startRideBtn: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Colors.red,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  startRideText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
  },
  navigationBox: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    zIndex: 999,
  },

  navText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    fontFamily: 'Rubik-Regular',
  },
  navDistance: {
    fontSize: 14,
    color: '#666',
  },
  backBtn: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
  },
  content: {
    padding: scale(8),
    
  },
  hideModalBtn: {
  position: 'absolute',
  top: scale(15),
  right: scale(15),
  width: 60,
  height: scale(20),
  borderRadius: scale(16),
  backgroundColor:"#e8e4e4",
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
  elevation: 5,
},

hideModalBtnText: {
  fontSize: fontScale(15),
  color: Colors.red,
  fontWeight: 700,
  lineHeight: scale(24),
},
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: scale(15),
  },
tripDetailsBtn: {
  position: 'absolute',
  bottom: scale(25),
  left: scale(20),
  right: scale(20),
  backgroundColor: Colors.red,
  height: scale(50),
  borderRadius: scale(12),
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100,
},

tripDetailsBtnText: {
  color: '#fff',
  fontFamily: 'Rubik-SemiBold',
  fontSize: fontScale(16),
},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
  },
  address: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(12),
    color: Colors.subtitle,
    flexShrink: 1,
  },
  time: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(12),
    color: Colors.gray,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  actionRow: {
    justifyContent: "space-around",
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(12),
  },
  navigateBtn: {
    // flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.red,
    height: scale(45),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  receiverMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateText: {
    color: '#fff',
    fontFamily: 'Rubik-SemiBold',
  },
  callBtn: {
    height: scale(45),
    width: scale(60),
    borderRadius: scale(21),

    justifyContent: 'center',
    // backgroundColor: '#e8e4e4',
    alignItems: 'center',
   
  },
  sectionTitle: {
    marginTop: scale(20),
    marginBottom: scale(10),
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(16),
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: scale(15),
  },
  detailRow: {
    marginBottom: scale(10),
  },
  detailTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
  },
  detailSubtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(12),
    color: Colors.subtitle,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: scale(10),
  },
  earningCard: {
    marginTop: scale(15),
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: scale(15),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningLabel: {
    fontFamily: 'Rubik-SemiBold',
  },
  earningAmount: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1BAA5C',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: scale(20),
    gap: scale(10),
  },
  startBtn: {
    flex: 1,
    backgroundColor: Colors.red,
    height: scale(50),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e0e0e0',
    height: scale(44),
    paddingHorizontal: scale(18),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  cancelText: {
    color: '#333',
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
  },
  startText: {
    color: '#fff',
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(16),
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
  },

  reasonItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  completeModal: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
},

completeTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},

completeSubtitle: {
  fontSize: 16,
  color: '#555',
  marginBottom: 20,
  textAlign: 'center',
},

  reasonText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },

  confirmBtn: {
    marginTop: 15,
    backgroundColor: Colors.red,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  confirmText: {
    color: '#fff',
    fontFamily: 'Rubik-SemiBold',
  },
});
