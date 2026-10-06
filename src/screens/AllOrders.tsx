import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useQuotes } from '../context/QuoteContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/Colors';
import { scale, fontScale } from '../utils/scaling';
import Header from '../components/common/Header';
import UnifiedOrderCard from '../components/UnifiedOrderCard';
import { useAuth } from '../context/AuthContext';
import useAxios from '../hooks/useAxios';
import SendQuoteModal from '../components/SendQuoteModal';
import { AppEvents, EVENTS } from '../utils/events';
import Toast from 'react-native-toast-message';
import OrderDetailModal from '../components/OrderDetailModal';
import CustomAlert from '../components/CustomAlert';
import { getCurrentLocation } from '../services/driverLocationTracker';
import { DUMMY_TRIPS } from '../constants/dummyData';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import StorageService from '../utils/Storage';

interface OrderUI {
  _id: string;
  tripId?: string;
  customerId: {
    _id: string;
    fullName: string;
    portraitPhoto: string;
  };
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  drop: {
    lat: number;
    lng: number;
    address: string;
  };
  package: {
    itemName: string;
    weight: number;
    weightUnit: string;
    description: string;
    photos: Array<{ url: string; description: string }>;
    payer: string;
    paymentMode: string;
  };
  vehicleType: string;
  status: string;
  orderId: string;
  createdAt: string;
  distance: string;
  estimatedPrice?: number;
  tripStatus?: string;
  driverRequestStatus?: string;
  serviceType?: string; // 'CAB' | 'PARCEL'
  passenger?: { name: string; phone: string; countryCode: string };
  price?: { totalFare: number; distanceKm: number };
  // 🔥 ADD THESE
  isRequested?: boolean;
  isAccepted?: boolean;
  finalPrice?: number;
  myQuote?: {
    price: number;
    eta: string;
  };
  customerPhone?: string;
}

type HomeStackParamList = {
  HomeMain: undefined;
  AllOrders: undefined;
  RideDetails: { order: OrderUI };
};

type TabType = 'ACTIVE' | 'PENDING';

type NavigationProp = StackNavigationProp<HomeStackParamList>;

const EmptyTripsIcon = () => (
  <View style={styles.emptyIconContainer}>
    <MaterialCommunityIcons
      name="truck-delivery-outline"
      size={scale(46)}
      color={Colors.primary}
    />
  </View>
);

const SHOW_DUMMY = false
const SEARCH_DEBOUNCE_MS = 400;

export default function AllOrders() {
  const navigation = useNavigation<NavigationProp>();
  const { token, isOnline } = useAuth();
  const { fetchData } = useAxios();
  const [cancelledOrderIds, setCancelledOrderIds] = useState<string[]>([]);
  const [selectedOrderForQuote, setSelectedOrderForQuote] =
    useState<OrderUI | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [selectedOrderForDetail, setSelectedOrderForDetail] =
    useState<OrderUI | null>(null);

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const { sentQuotes, addSentQuote } = useQuotes();
  const [orders, setOrders] = useState<OrderUI[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [cancelAlertOrderId, setCancelAlertOrderId] = useState<string | null>(
    null,
  );
  const searchRef = useRef('');
  const cancelledOrderIdsRef = useRef<string[]>([]);
  const didRunInitialSearchEffect = useRef(false);
  console.log(orders)

  useEffect(() => {
    searchRef.current = search.trim();
  }, [search]);

  useEffect(() => {
    cancelledOrderIdsRef.current = cancelledOrderIds;
  }, [cancelledOrderIds]);

  const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchDriverOrders = useCallback(async (searchQuery = searchRef.current) => {
    if (!isOnline) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const location = await getCurrentLocation();
      console.log(location)
      const query = searchQuery.trim();

      const formatOrders = (data: any): OrderUI[] => {
        const items = Array.isArray(data) ? data : data?.orders || [];

        return items.map((i: any) => {
          // Detect order type
          const isFoodOrder = i._orderType === 'food' || i.restaurantId || i.orderNumber?.startsWith('R-FD');
          const isParcelOrder = i._orderType === 'parcel' || i.loadRequestNumber;

          // ── FOOD ORDER: pickup from restaurant, drop from delivery address ──
          let pickup, drop;
          if (isFoodOrder) {
            const restaurantLocation = i.restaurantId?.location || i.restaurantSnapshot?.location;
            const address = i.deliveryAddress;
            pickup = i.pickup || {
              lat: restaurantLocation?.coordinates?.latitude,
              lng: restaurantLocation?.coordinates?.longitude,
              address: restaurantLocation?.address || '',
            };
            drop = i.drop || {
              lat: address?.latitude,
              lng: address?.longitude,
              address: address?.formattedAddress || address?.street || '',
            };
          }
          // ── PARCEL ORDER: pickup from pickupLocation, drop from dropoffLocation ──
          else if (isParcelOrder) {
            pickup = i.pickup || {
              lat: i.pickupLocation?.latitude,
              lng: i.pickupLocation?.longitude,
              address: i.pickupLocation?.address || '',
            };
            drop = i.drop || {
              lat: i.dropoffLocation?.latitude,
              lng: i.dropoffLocation?.longitude,
              address: i.dropoffLocation?.address || '',
            };
          }
          // ── Fallback ──
          else {
            pickup = i.pickup || { lat: undefined, lng: undefined, address: '' };
            drop = i.drop || { lat: undefined, lng: undefined, address: '' };
          }
       
          const hasCoordinates = [pickup.lat, pickup.lng, drop.lat, drop.lng]
            .every(value => typeof value === 'number' && Number.isFinite(value));
          const tripDistanceKm = i.distanceKm ?? (hasCoordinates
            ? calculateDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng)
            : undefined);

          const orderStatus = i.status || i.orderStatus || 'pending';
          const isAccepted = Boolean(
            i.isAccepted ||
            ['assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'confirmed', 'ready'].includes(
              String(orderStatus).toLowerCase(),
            )
          );

          return {
            ...i,
            // Keep the Mongo ID for actions; show the readable order number.
            _id: i._id,
            orderId: i.orderNumber || i.loadRequestNumber || i.orderId || i._id,
            status: orderStatus,
            orderStatus,
            isAccepted,
            isSelectedByCustomer: i.isSelectedByCustomer,
            // Mark food orders explicitly so the UI renders the right card
            serviceType: i._orderType || i.serviceType || (i.orderNumber?.startsWith('R-FD') || i.restaurantId || i.restaurantSnapshot ? 'food' : i.loadRequestNumber ? 'parcel' : 'other'),
            customerId: i.customerId || {
              _id: i.userAuthId?._id || i.userAuthId || '',
              fullName: i.deliveryAddress?.contactName || i.userAuthId?.fullName || '',
              portraitPhoto: i.userAuthId?.portraitPhoto || '',
            },
            // Preserve phone for active food order detail modal
            customerPhone: i.customerPhone
              || i.userAuthId?.fullPhoneNumber
              || (i.userAuthId?.countryCode && i.userAuthId?.phoneNumber
                ? `${i.userAuthId.countryCode} ${i.userAuthId.phoneNumber}`
                : undefined),
            pickup,
            drop,
            package: i.package || {
              itemName: (i.items || [])
                .map((item: any) => `${item.name} × ${item.quantity}`)
                .join(', '),
              weight: 0,
              weightUnit: '',
              description: i.notes || '',
              photos: [],
              payer: 'SENDER',
              paymentMode: i.paymentMethod || '',
            },
            distance: tripDistanceKm && typeof tripDistanceKm === 'number' && Number.isFinite(tripDistanceKm)
              ? tripDistanceKm < 1 
                ? `${Math.round(tripDistanceKm * 1000)}m`
                : `${tripDistanceKm.toFixed(2)}km`
              : '',
          };
        });
      };

      const fetchOrdersByType = (type: 'ALL' | 'ACTIVE') =>
        fetchData({
          method: 'GET',
          url: '/driver/orders/unified?sourceModel=all',
          params: {
            latitude: location.lat,
            longitude: location.long,
            status: type === 'ACTIVE' ? 'active' : 'all',
            search: query,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      const res = await fetchOrdersByType('ALL');
      let activeOrders: OrderUI[] = [];

      try {
        const activeRes = await fetchOrdersByType('ACTIVE');
        activeOrders = formatOrders(activeRes.data || []).map(o => ({
          ...o,
          isAccepted: true, // these are confirmed active — driver owns them
        }));
      } catch (activeError) {
        console.log('Active driver orders error', activeError);
      }

      const pendingOrders = formatOrders(res.data || []);

      // Merge: active first, then pending. Deduplicate by _id (active wins).
      const activeIds = new Set(activeOrders.map(o => o._id));
      const formatted = [
        ...activeOrders,
        ...pendingOrders.filter(o => !activeIds.has(o._id)),
      ];

      console.log('Pending Response', res);
      console.log('Active orders', activeOrders);

      const uniqueOrders = formatted.filter(
        (order, index, self) =>
          index === self.findIndex(o => o._id === order._id),
      );

      const filteredOrders = uniqueOrders.filter(
        (order: OrderUI) => !cancelledOrderIdsRef.current.includes(order._id),
      );

      setOrders(filteredOrders);
    } catch (err: any) {
      console.log('Driver orders error', err);
      const message = err?.response?.data?.message || err?.message || '';
      if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('pending')) {
        return;
      }
      Toast.show({
        type: 'error',
        text1: message || 'Failed to fetch orders',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData, isOnline, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverOrders(searchRef.current);
    setRefreshing(false);
  };

  useEffect(() => {
    if (SHOW_DUMMY) {
      setLoading(true);
      setOrders(Object.values(DUMMY_TRIPS).flat() as OrderUI[]);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDriverOrders(searchRef.current);
    }, [fetchDriverOrders])
  );

  useEffect(() => {
    if (!didRunInitialSearchEffect.current) {
      didRunInitialSearchEffect.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      setLoading(true);
      fetchDriverOrders(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [fetchDriverOrders, search]);

  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.REFRESH_ORDERS, () => {
      fetchDriverOrders(searchRef.current);
    });

    return () => subscription.remove();
  }, [fetchDriverOrders]);

  // When a new food order notification arrives, snap to PENDING tab and refresh
  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.NEW_FOOD_ORDER, () => {
      setActiveTab('PENDING');
      fetchDriverOrders(searchRef.current);
    });

    return () => subscription.remove();
  }, [fetchDriverOrders]);

  const normalizeStatus = (status?: string) =>
    (status || '').replace(/[\s-]/g, '_').toUpperCase();

  const activeStatuses = [
    'ASSIGNED',
    'CONFIRMED',
    'ACCEPTED',
    'READY',
    'OUT_FOR_DELIVERY',
    'IN_PROGRESS',
    'INPROGRESS',
    'START_RIDE',
    'ARRIVED_AT_PICKUP',
    'LOAD_COLLECTED',
    'DELIVERY_STARTED',
    'PICKED_UP',
    'IN_TRANSIT',
    'ARRIVED',
  ];

  const closedStatuses = [
    'COMPLETED',
    'DELIVERY_COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'CANCELED',
    'REJECTED',
  ];

  const isActiveOrder = (order: OrderUI) =>
    order.isAccepted === true ||
    normalizeStatus(order.driverRequestStatus) === 'ACCEPTED' ||
    activeStatuses.includes(normalizeStatus(order.status)) ||
    activeStatuses.includes(normalizeStatus(order.orderStatus));

  const isClosedOrder = (order: OrderUI) =>
    normalizeStatus(order.driverRequestStatus) === 'REJECTED' ||
    closedStatuses.includes(normalizeStatus(order.status)) ||
    closedStatuses.includes(normalizeStatus(order.tripStatus));

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ACTIVE') {
      return isActiveOrder(order);
    }

    return !isActiveOrder(order) && !isClosedOrder(order);
  });

  const goToTrip = async (order: OrderUI) => {
    await StorageService.setItem('tripId', order._id);
    navigation.navigate('RideDetails' as never, {
      order: {
        ...order,
        tripId: order.tripId || order._id,
        tripStatus: order.tripStatus || 'CREATED',
      },
    } as never);
  };

  const openOrderDetail = (order: OrderUI) => {
    setSelectedOrderForDetail(
      isActiveOrder(order) ? { ...order, isAccepted: true } : order,
    );
    setIsDetailModalVisible(true);
  };

  const renderEmptyList = () => {
    if (!isOnline) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyTripsIcon />
          <Text style={styles.emptyTitle}>
            No {activeTab.toLowerCase()} trips yet.
          </Text>
          <Text style={styles.emptySubText}>
            Go online to receive trip requests.
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondaryDark} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyTripsIcon />
        <Text style={styles.emptyTitle}>
          {activeTab === 'ACTIVE'
            ? 'No active trips yet'
            : 'No pending trips yet'}
        </Text>

        <Text style={styles.emptySubText}>
          {activeTab === 'ACTIVE'
            ? 'Go online to start receiving ride and delivery requests.'
            : 'Pending trip requests will appear here.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBadge={true} simpleHeaderTitle='Trips' showNotification={true} simpleHeader={false} />
      <View style={styles.tabWrapper}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIconEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="by Trip ID / customer name / pickup / destination"
            placeholderTextColor={Colors.Textgray}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: scale(8), bottom: scale(8), left: scale(8), right: scale(8) }}
            >
              <Text style={styles.clearX}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.tabContainer}>
          {(['ACTIVE', 'PENDING'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab === 'ACTIVE' ? 'Active' : 'Pending'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondaryDark} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchDriverOrders(searchRef.current)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item._id}
          contentContainerStyle={[
            styles.listContainer,
            filteredOrders.length === 0 ? styles.emptyListContainer : null,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.secondaryDark]} // Android
              tintColor={Colors.secondaryDark} // iOS
            />
          }
          ListEmptyComponent={renderEmptyList}
          renderItem={({ item }) => (
            <UnifiedOrderCard
              _id={item._id}
              _orderType={item.serviceType === 'food' ? 'food' : 'parcel'}
              orderNumber={item.orderNumber}
              orderStatus={item.orderStatus}
              loadRequestNumber={item?.loadRequestNumber}
              status={item.status}
              restaurantId={item.restaurantId}
              deliveryAddress={item.deliveryAddress}
              items={item.items}
              pickupLocation={item.pickupLocation}
              dropoffLocation={item.dropoffLocation}
              sender={item.sender}
              receiver={item.receiver}
              loadItems={item.loadItems}
              weight={item.weight}
              totalAmount={item.totalAmount ? Number(item.totalAmount?.$numberDecimal ?? item.totalAmount) : undefined}
              currency={item.currency || 'BND'}
              createdAt={item.createdAt}
              assignedDriverId={item.assignedDriverId}
              driverId={item.driverId}
              isSelectedByCustomer={item.isSelectedByCustomer}
              isAccepted={item.isAccepted}
              distance={item.distance}
              pickup={item.pickup}
              drop={item.drop}
              onPress={() => openOrderDetail(item)}
              onGoToTrip={() => goToTrip(item)}
              onAccept={() => {
                setCancelledOrderIds(prev => [...prev, item._id]);
                setOrders(prev => prev.filter(o => o._id !== item._id));
                fetchDriverOrders(searchRef.current);
              }}
              onIgnore={() => {
                setCancelledOrderIds(prev => [...prev, item._id]);
                setOrders(prev => prev.filter(o => o._id !== item._id));
              }}
            />
          )}
        />
      )}
      {selectedOrderForQuote && (
        <SendQuoteModal
          visible={true}
          onClose={() => setSelectedOrderForQuote(null)}
          orderMongoId={selectedOrderForQuote._id}
          orderDetails={{
            distance: selectedOrderForQuote.distance,
            weight: selectedOrderForQuote.package.weight,
            itemName: selectedOrderForQuote.package.itemName,
            weightUnit: selectedOrderForQuote.package.weightUnit,
          }}
          defaultPrice={selectedOrderForQuote.estimatedPrice}
          alreadySent={
            sentQuotes.includes(selectedOrderForQuote._id) ||
            selectedOrderForQuote.isRequested
          }
          onQuoteSuccess={orderId => addSentQuote(orderId)}
        />
      )}
      <CustomAlert
        visible={!!cancelAlertOrderId}
        title="Cancel Order"
        message="Are you sure you want to cancel this order?"
        buttons={[
          {
            text: 'No',
            style: 'cancel',
            onPress: () => setCancelAlertOrderId(null),
          },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              if (cancelAlertOrderId) {
                setCancelledOrderIds(prev => [...prev, cancelAlertOrderId]);

                setOrders(prev =>
                  prev.filter(o => o._id !== cancelAlertOrderId),
                );
              }

              setCancelAlertOrderId(null);
            },
          },
        ]}
        onDismiss={() => setCancelAlertOrderId(null)}
      />
      {selectedOrderForDetail && (
        <OrderDetailModal
          visible={isDetailModalVisible}
          order={selectedOrderForDetail}
          sentQuotes={sentQuotes}
          onClose={() => {
            setIsDetailModalVisible(false);
            setSelectedOrderForDetail(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  listContainer: {
    marginTop: scale(20),
    paddingHorizontal: scale(10),
    paddingBottom: scale(20),
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Baloo2-ExtraBold',
    color: Colors.black,
    marginTop: scale(15),
    marginBottom: scale(10),
  },
  headerContainer: {
    paddingVertical: scale(20),
    paddingHorizontal: scale(5),
  },
  tabWrapper: {
    paddingHorizontal: scale(10),
    paddingTop: scale(12),
    paddingBottom: scale(16),
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: scale(50),
    borderWidth: 1,
    borderColor: Colors.borderColor2,
    paddingHorizontal: scale(10),
    marginBottom: scale(12),
  },

  searchIconEmoji: {
    fontSize: fontScale(14),
    marginRight: scale(6),
  },

  searchInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.black,
    paddingVertical: scale(8),
  },

  clearX: {
    fontSize: fontScale(13),
    color: Colors.Textgray,
    paddingLeft: scale(6),
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: scale(10),
    padding: scale(4),
  },

  tabButton: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(10),
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: Colors.primary,
  },

  tabText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black1,
  },

  activeTabText: {
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
    paddingVertical: scale(50),
  },

  emptyIconContainer: {
    width: scale(84),
    height: scale(84),
    borderRadius: scale(42),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryWithOpacity(0.08),
    marginBottom: scale(18),
  },

  emptyTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    marginBottom: scale(8),
    textAlign: 'center',
  },

  emptySubText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    textAlign: 'center',
  },
  title: {
    fontSize: fontScale(24),
    fontFamily: 'Baloo2-ExtraBold',
    color: Colors.black,
    marginBottom: scale(5),
  },
  subtitle: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  separator: {
    height: scale(15),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  errorText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.secondaryDark,
    textAlign: 'center',
    marginBottom: scale(20),
  },
  emptyText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    textAlign: 'center',
    marginBottom: scale(20),
  },
  retryButton: {
    backgroundColor: Colors.secondaryDark,
    paddingHorizontal: scale(30),
    paddingVertical: scale(12),
    borderRadius: scale(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
  },
});
