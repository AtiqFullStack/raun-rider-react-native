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
import RequestCard from '../components/RequestCard';
import NewOrderCard from '../components/NewOrderCard';
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

const SHOW_DUMMY=false
const SEARCH_DEBOUNCE_MS = 400;

export default function  AllOrders() {
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
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
          const restaurantLocation =
            i.restaurantId?.location || i.restaurantSnapshot?.location;
          const address = i.deliveryAddress;
          const pickup = i.pickup || {
            lat: restaurantLocation?.coordinates?.latitude,
            lng: restaurantLocation?.coordinates?.longitude,
            address: restaurantLocation?.address || '',
          };
          const drop = i.drop || {
            lat: address?.latitude,
            lng: address?.longitude,
            address: address?.formattedAddress || address?.street || '',
          };
          const hasCoordinates = [pickup.lat, pickup.lng, drop.lat, drop.lng]
            .every(value => typeof value === 'number' && Number.isFinite(value));
          const tripDistanceKm = i.distanceKm ?? (hasCoordinates
            ? calculateDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng)
            : undefined);

          return {
            ...i,
            // Keep the Mongo ID for actions; show the readable order number.
            _id: i._id,
            orderId: i.orderNumber || i.orderId || i._id,
            status: i.orderStatus || i.status,
            // Mark food orders explicitly so the UI renders the right card
            serviceType: i.serviceType || (i.orderNumber?.startsWith('R-FD') || i.restaurantId || i.restaurantSnapshot ? 'food' : i.serviceType),
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
            distance: typeof tripDistanceKm === 'number' && Number.isFinite(tripDistanceKm)
              ? `${Number(tripDistanceKm.toFixed(2))} KM`
              : '',
          };
        });
      };

      const fetchOrdersByType = (type: 'ALL' | 'ACTIVE') =>
        fetchData({
          method: 'GET',
          url: '/driver/food-orders',
          params: {
            latitude: location.lat,
            longitude: location.long,
            type,
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
    if(SHOW_DUMMY){
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
    'ACCEPTED',
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
    activeStatuses.includes(normalizeStatus(order.status));

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
          renderItem={({ item }) => {
            const isCab = item.serviceType === 'CAB';
            const isFoodOrder = item.serviceType === 'food' || item.serviceType === 'FOOD';
            const commonProps = {
              name: item.customerId?.fullName || 'Unknown Customer',
              photo: item.customerId?.portraitPhoto || '',
              pickup: item.pickup,
              drop: item.drop,
              distance: item.distance,
              weight: item.package?.weight || 0,
              weightUnit: item.package?.weightUnit || '',
              itemName: item.package?.itemName || '',
              itemDescription: item.package?.description || '',
              createdAt: item.createdAt,
              orderId: item._id,
              orderIdNormal: item.orderId,
              isCab,
              passengerName: item.passenger?.name,
              service: item?.serviceId?.name,
            };

            // 🔵 ACCEPTED
            if (isActiveOrder(item)) {
              const totalAmount = item.totalAmount
                ? Number(item.totalAmount?.$numberDecimal ?? item.totalAmount)
                : undefined;
              const displayPrice = item.finalPrice ?? item.price?.totalFare ?? totalAmount;
              return (
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOrderDetail(item)}>
                  <RequestCard
                    {...commonProps}
                    status={item.status === 'COMPLETED' ? 'COMPLETED' : 'ACCEPTED'}
                    price={displayPrice}
                  />
                </TouchableOpacity>
              );
            }

            // 🍕 FOOD ORDER — Accept / Ignore buttons
            if (isFoodOrder) {
              return (
                <NewOrderCard
                  orderId={item.orderId}
                  orderMongoId={item._id}
                  serviceType="food"
                  serviceName={item?.serviceId?.name}
                  customerName={item.customerId?.fullName || 'Customer'}
                  pickupAddress={item.pickup?.address || ''}
                  dropAddress={item.drop?.address || ''}
                  distance={item.distance}
                  itemSummary={item.package?.itemName}
                  totalAmount={item.totalAmount ? Number(item.totalAmount?.$numberDecimal ?? item.totalAmount) : undefined}
                  currency={item.currency || 'BND'}
                  createdAt={item.createdAt}
                  status="PENDING"
                  onPress={() => openOrderDetail(item)}
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
              );
            }

            // 🟡 BOOKING REQUESTED
            if (item.isRequested) {
              return (
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOrderDetail(item)}>
                  <RequestCard
                    {...commonProps}
                    status="BOOKING_REQUESTED"
                    price={item.myQuote?.price}
                    estimatedTime={item.myQuote?.eta}
                    onAcceptDelivery={tripId =>
                      navigation.navigate('RideDetails', { order: { ...item, tripId, tripStatus: 'CREATED' } })
                    }
                  />
                </TouchableOpacity>
              );
            }

            // 🟢 QUOTE SENT
            if (!isCab && sentQuotes.includes(item._id)) {
              return (
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOrderDetail(item)}>
                  <RequestCard
                    {...commonProps}
                    status="QUOTE_SENT"
                    price={item.myQuote?.price}
                    estimatedTime={item.myQuote?.eta}
                  />
                </TouchableOpacity>
              );
            }

            // 🔴 PENDING (parcel / cab)
            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => openOrderDetail(item)}>
                <RequestCard
                  {...commonProps}
                  status="PENDING"
                  onCancel={() => setCancelAlertOrderId(item._id)}
                  onSendQuote={isCab ? undefined : () => setSelectedOrderForQuote(item)}
                  onRemove={id => {
                    setCancelledOrderIds(prev => [...prev, id]);
                    setOrders(prev => prev.filter(o => o._id !== id));
                  }}
                />
              </TouchableOpacity>
            );
          }}
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
