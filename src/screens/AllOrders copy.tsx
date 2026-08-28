import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuotes } from '../context/QuoteContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/Colors';
import { scale, fontScale } from '../utils/scaling';
import Header from '../components/common/Header';
import RequestCard from '../components/RequestCard';
import { getLocation } from '../utils/location';
import { useAuth } from '../context/AuthContext';
import useAxios from '../hooks/useAxios';
import SendQuoteModal from '../components/SendQuoteModal';
import { AppEvents, EVENTS } from '../utils/events';
import Toast from 'react-native-toast-message';
import OrderDetailModal from '../components/OrderDetailModal';
import CustomAlert from '../components/CustomAlert';
import { getCurrentLocation } from '../services/driverLocationTracker';
import { DUMMY_TRIPS } from '../constants/dummyData';

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
  tripStatus: string;
  isRequested?: boolean;
  isAccepted?: boolean;
  finalPrice?: number;
  myQuote?: {
    price: number;
    eta: string;
  };
}

interface BookingRequestUI {
  orderId: string;
  orderCode: string;
  pickup: any;
  drop: any;
  package: any;
  customer: {
    _id: string;
    fullName: string;
    portraitPhoto: string;
  };
  quote: {
    price: number;
    eta: string;
  };
  bookingRequestedAt: string;
  driverRequestStatus: 'REQUESTED' | 'ACCEPTED';
}

type TabType = 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

type HomeStackParamList = {
  HomeMain: undefined;
  AllOrders: undefined;
  RideDetails: { order: OrderUI };
};

type NavigationProp = StackNavigationProp<HomeStackParamList>;

const SHOW_DUMMY = true;

export default function AllOrders() {
  const navigation = useNavigation<NavigationProp>();
  const { token, isOnline, setIsOnline } = useAuth();
  const { fetchData } = useAxios();
  const [cancelledOrderIds, setCancelledOrderIds] = useState<string[]>([]);
  const [selectedOrderForQuote, setSelectedOrderForQuote] = useState<OrderUI | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [bookingRequests, setBookingRequests] = useState<BookingRequestUI[]>([]);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OrderUI | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const { sentQuotes, addSentQuote } = useQuotes();
  const [orders, setOrders] = useState<OrderUI[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelAlertOrderId, setCancelAlertOrderId] = useState<string | null>(null);

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

  const fetchDriverOrders = async () => {
    if (!isOnline) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const location = await getCurrentLocation();

      const res = await fetchData({
        method: 'POST',
        url: '/user/order/driver-orders',
        data: {
          lat: location.lat,
          lng: location.long,
          type: 'ALL',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const formatted =
        res.data?.map((i: any) => {
          const tripDistanceKm = calculateDistanceKm(
            i.pickup.lat,
            i.pickup.lng,
            i.drop.lat,
            i.drop.lng,
          );

          return {
            ...i,
            distance: `${tripDistanceKm} KM`,
          };
        }) || [];

      const filteredOrders = formatted.filter(
        (order: OrderUI) => !cancelledOrderIds.includes(order._id),
      );

      setOrders(filteredOrders);
    } catch (error: any) {
      console.log('Driver orders error', error);
      const message = error?.response?.data?.message || error?.message || '';
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    if (SHOW_DUMMY) {
      // Transform DUMMY_TRIPS to match the expected format
      const allDummyOrders: OrderUI[] = [];
      Object.values(DUMMY_TRIPS).forEach((orders: any) => {
        allDummyOrders.push(...orders);
      });
      setOrders(allDummyOrders);
      setLoading(false);
    } else {
      fetchDriverOrders();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!SHOW_DUMMY) {
        fetchDriverOrders();
      }
    }, [isOnline])
  );

  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.REFRESH_ORDERS, () => {
      if (!SHOW_DUMMY) {
        fetchDriverOrders();
      }
    });

    return () => subscription.remove();
  }, []);

  // Filter orders based on active tab
  const getFilteredOrders = () => {
    if (!isOnline && activeTab === 'ACTIVE') {
      return [];
    }

    // Map the status to the correct category
    const statusMap: Record<TabType, string[]> = {
      'ACTIVE': ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'],
      'PENDING': ['PENDING', 'REQUESTED', 'QUOTE_SENT'],
      'COMPLETED': ['COMPLETED', 'DELIVERED'],
      'CANCELLED': ['CANCELLED', 'REJECTED']
    };

    const validStatuses = statusMap[activeTab] || [];
    
    let filtered = orders.filter(order => {
      // For active tab, also include orders that have been accepted
      if (activeTab === 'ACTIVE') {
        return order.isAccepted === true || validStatuses.includes(order.status);
      }
      // For pending tab, include orders that are not accepted and not completed/cancelled
      if (activeTab === 'PENDING') {
        return !order.isAccepted && 
               !['COMPLETED', 'CANCELLED'].includes(order.status) &&
               validStatuses.includes(order.status);
      }
      // For completed and cancelled tabs, filter by status
      return validStatuses.includes(order.status);
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const renderTabContent = () => {
    const filteredOrders = getFilteredOrders();

    // Offline state for active tab
    if (!isOnline && activeTab === 'ACTIVE') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>You're Offline</Text>
          <Text style={styles.emptySubText}>
            Go online to receive trip requests
          </Text>
        </View>
      );
    }

    // Loading state
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text style={styles.loadingText}>Loading {activeTab.toLowerCase()} trips...</Text>
        </View>
      );
    }

    // Empty state
    if (filteredOrders.length === 0) {
      const emptyMessages: Record<TabType, { title: string; sub: string }> = {
        'ACTIVE': {
          title: 'No active trips yet',
          sub: 'Go online to receive trip requests'
        },
        'PENDING': {
          title: 'No pending trips',
          sub: 'All your orders have been attended to'
        },
        'COMPLETED': {
          title: 'No completed trips',
          sub: 'Complete a trip to see it here'
        },
        'CANCELLED': {
          title: 'No cancelled trips',
          sub: 'Any cancelled trips will appear here'
        }
      };

      const emptyState = emptyMessages[activeTab];
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptySubText}>{emptyState.sub}</Text>
        </View>
      );
    }

    // Orders list
    return (
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.red]}
            tintColor={Colors.red}
          />
        }
        renderItem={({ item }) => {
          const commonProps = {
            name: item.customerId?.fullName || 'Unknown Customer',
            photo: item.customerId?.portraitPhoto || '',
            pickup: item.pickup,
            drop: item.drop,
            distance: item.distance,
            weight: item.package?.weight || 0,
            weightUnit: item.package?.weightUnit || 0,
            itemName: item.package?.itemName || 'Unknown Item',
            itemDescription: item.package?.description || '',
            createdAt: item.createdAt,
            orderId: item._id,
          };

          // ACCEPTED or COMPLETED
          if (item.isAccepted || item.status === 'COMPLETED') {
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedOrderForDetail(item);
                  setIsDetailModalVisible(true);
                }}
              >
                <RequestCard
                  {...commonProps}
                  status={item.status === 'COMPLETED' ? 'COMPLETED' : 'ACCEPTED'}
                  price={item.finalPrice}
                />
              </TouchableOpacity>
            );
          }

          // BOOKING REQUESTED
          if (item.isRequested) {
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedOrderForDetail(item);
                  setIsDetailModalVisible(true);
                }}
              >
                <RequestCard
                  {...commonProps}
                  status="BOOKING_REQUESTED"
                  price={item.myQuote?.price}
                  estimatedTime={item.myQuote?.eta}
                  onAcceptDelivery={tripId =>
                    navigation.navigate('RideDetails', {
                      order: {
                        ...item,
                        tripId,
                        tripStatus: 'CREATED',
                      },
                    })
                  }
                />
              </TouchableOpacity>
            );
          }

          // QUOTE SENT
          if (sentQuotes.includes(item._id)) {
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedOrderForDetail(item);
                  setIsDetailModalVisible(true);
                }}
              >
                <RequestCard
                  {...commonProps}
                  status="QUOTE_SENT"
                  price={item.myQuote?.price}
                  estimatedTime={item.myQuote?.eta}
                />
              </TouchableOpacity>
            );
          }

          // PENDING (New Order)
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setSelectedOrderForDetail(item);
                setIsDetailModalVisible(true);
              }}
            >
              <RequestCard
                {...commonProps}
                status="PENDING"
                onCancel={() => setCancelAlertOrderId(item._id)}
                onSendQuote={() => setSelectedOrderForQuote(item)}
              />
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header showBadge={false} simpleHeader={false} />
      
      {/* Tab Header */}
      <View style={styles.tabHeaderContainer}>
        <Text style={styles.tripsTitle}>Trips</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchText}>🔍 Search trips</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {(['ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
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
  tabHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(10),
    paddingBottom: scale(5),
  },
  tripsTitle: {
    fontSize: fontScale(22),
    fontFamily: 'Baloo2-ExtraBold',
    color: Colors.black,
  },
  searchButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    backgroundColor: Colors.white,
    borderRadius: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  listContainer: {
    paddingHorizontal: scale(10),
    paddingBottom: scale(80), // Add extra padding for bottom navigation
  },
  tabWrapper: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
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
    backgroundColor: '#F13A1A33',
  },
  tabText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black1,
  },
  activeTabText: {
    color: Colors.red,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
    paddingBottom: scale(100),
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: scale(100),
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
});