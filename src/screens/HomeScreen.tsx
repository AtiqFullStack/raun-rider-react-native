import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { use, useCallback, useEffect, useRef, useState } from 'react';
import { useQuotes } from '../context/QuoteContext';
import Header from '../components/common/Header';
import { Colors } from '../constants/Colors';
import { MY_STYLES } from '../constants/myStyles';
import { DollarSvg, GrowSvg, TruckSvg, WalletIcon } from '../utils/config';
import { fontScale, scale } from '../utils/scaling';
import RequestCard from '../components/RequestCard';

import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import useAxios from '../hooks/useAxios';
import SupportSvg from '../assets/svg/support.svg';
import VehicleSvg from '../assets/svg/vehicle.svg';
import BankSvg from '../assets/svg/bank.svg';
import SettingSvg from '../assets/svg/setting.svg';
import { AppEvents, EVENTS } from '../utils/events';
import { RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import SendQuoteModal from '../components/SendQuoteModal';
import Toast from 'react-native-toast-message';
import OrderDetailModal from '../components/OrderDetailModal';
import { api } from '../services/apiClient';
import PaynowModule from '../utils/PaynowModule';
import paymentService from '../services/paymentService';
import PayementWebView from '../components/PayementWebView';
import { useRoute } from '@react-navigation/native';
import { getCurrentLocation } from '../services/driverLocationTracker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { onlineCalculator } from '../utils/converter';

export interface OrderUI {
  _id: string;
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
  pickupAddress?: string;
  dropAddress?: string;
  estimatedPrice?: number;
  driverRequestStatus?: 'REQUESTED' | 'ACCEPTED' | 'REJECTED';
  isRequested?: boolean;
  isAccepted?: boolean;
}

interface DashboardData {
  todayEarnings: number;
  totalTrips: number;
  walletBalance: number;
  pendingRequests?: number;
  totalRating?: number;
  totalOnlineMinutes?: number;
}

export default function HomeScreen() {
  const { fcmToken, user, setUser } = useAuth();
  console.log(user)
  const { createPayment, getPaymenStatus } = paymentService();
  const { fetchData, loading } = useAxios();
  const { token, isOnline, setIsOnline } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );

  const [orders, setOrders] = React.useState<OrderUI[]>([]);
  const navigation = useNavigation();
  const { sentQuotes, addSentQuote } = useQuotes();
  const route = useRoute();


  const [selectedOrderForDetail, setSelectedOrderForDetail] =
    useState<OrderUI | null>(null);

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
 
  const [selectedOrderForQuote, setSelectedOrderForQuote] =
    React.useState<OrderUI | null>(null);

  const [isReplenishModalVisible, setIsReplenishModalVisible] = useState(false);
  const minimumBalance = 100;
  const currentBalance = dashboardData?.walletBalance ?? 0;
  const topUpAmount = Math.max(minimumBalance - currentBalance, 0);
  const [enteredAmount, setEnteredAmount] = useState(topUpAmount.toFixed(2));
  const [enteredEmail, setEnteredEmail] = useState(user?.email || '');
  const [enteredPhone, setEnteredPhone] = useState(
    user?.phone || user?.phoneNumber || '9122038950',
  );
const [syncLoading, setSyncLoading] = useState(false);
  const [paydetails, setPayDetails] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paynowInstructions, setPaynowInstructions] = useState('');
  const [paynowPollUrl, setPaynowPollUrl] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<
    'IDLE' | 'PENDING' | 'PAID' | 'FAILED'
  >('IDLE');
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
  } | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const refreshHomeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const getl = async () => {
      try {
        const loc = await getCurrentLocation()
        console.log(loc)

      } catch (error) {
        console.log(error, 'error')
      }
    }
    getl()
  }, [])
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;

    if (paynowPollUrl && paymentStatus === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const result = await PaynowModule.checkPaymentStatus(paynowPollUrl);
          console.log('Poll result:', JSON.stringify(result));

          if (result.paid === true) {
            clearInterval(interval);
            clearTimeout(timeout); // ✅ cancel the timeout on success
            setPaymentStatus('PAID');
            setPaynowPollUrl('');
            setPaynowInstructions('');
            setPaymentResult({ success: true });
            fetchDashboardData();
          } else if (
            result.status?.toLowerCase().includes('cancelled') ||
            result.status?.toLowerCase().includes('failed')
          ) {
            clearInterval(interval);
            clearTimeout(timeout); // ✅ cancel the timeout on failure too
            setPaymentStatus('FAILED');
            setPaynowPollUrl('');
            setPaymentResult({ success: false });
          }
        } catch (error) {
          console.log('Polling Error (will retry):', error);
        }
      }, 5000);

      timeout = setTimeout(() => {
        clearInterval(interval);
        setPaymentStatus('FAILED');
        setPaynowPollUrl('');
        setPaynowInstructions('');
        setPaymentResult({ success: false });
        Toast.show({
          type: 'error',
          text1: 'Payment Timed Out',
          text2: 'No response received. Please try again.',
        });
      }, 2 * 60 * 1000);

      pollingIntervalRef.current = interval;
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout); // ✅ this was missing
    };
  }, [paynowPollUrl, paymentStatus]);


  const syncPendingPayments = async () => {

  try {

    setSyncLoading(true);

    const res = await api.get(
      '/payment/check-all-pending-payments'
    );

    console.log(res.data, 'sync-result');

    fetchDashboardData();

  } catch (error) {

    console.log(error);

  } finally {

    setSyncLoading(false);

  }

};

  const handleReplenishPayment = async () => {
    setPayDetails(null);
    const amount = parseFloat(enteredAmount);
    if (!enteredPhone || !enteredEmail) {
      Toast.show({ type: 'error', text1: 'Please enter email and phone' });
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Enter a valid amount greater than 0',
      });
      return;
    }
    try {
      setPaymentLoading(true);
      console.log(
        'Paynow createPayment called with:',
        enteredAmount,
        enteredEmail,
        enteredPhone,
      );

      const resdata = await createPayment({
        type: 'mobile',
        amount: enteredAmount,
      });
      console.log(resdata);
      if (resdata.success) {
        setPayDetails(resdata);
        setIsReplenishModalVisible(false);
      }
      console.log(resdata);

    } catch (error: any) {
      console.log('Paynow Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: error?.message || error?.toString() || 'Unknown error',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const saveToken = async () => {
    try {
      const res = await authService.saveFcmToken(fcmToken);
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.REFRESH_ORDERS, () =>
      fetchDriverOrders('ACTIVE'),
    );

    return () => {
      subscription.remove();
    };
  }, [token]);
  useEffect(() => {
    if (fcmToken) {
      saveToken();
    }
  }, [fcmToken]);


  useEffect(() => {
    fetchDriverOrders('ACTIVE');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDriverOrders('ACTIVE'), fetchDashboardData()]);
    setRefreshing(false);
  };

  console.log(dashboardData)
  const checkIsOnline = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/user/auth/get-online?name=${user.firstName}`)
      console.log(res)
      if (res.data?.success) {
        if (res.data.data.isOnline) {
          console.log(res.data.data.isOnline, 'online')
          setIsOnline(true);
          setUser((prev: any) => ({ ...prev, isOnline: true }));
        } else {
          console.log(res.data.data.isOnline, 'offLine')
          setIsOnline(false)
          setUser((prev: any) => ({ ...prev, isOnline: false }));
        }
      }
    } catch (error) {
      console.log('error hai', error)
    }
  }

  useEffect(() => {
    fetchDashboardData();
    checkIsOnline()
  }, []);

  

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/user/auth/driver-dashboard');
      if (res.data?.success) setDashboardData(res.data.data);
    } catch (e) {
      console.log('Profile fetch error:', e);
    }
  };

  const statCards = [
    {
      label: "Today's Earnings",
      value: `$${Number(dashboardData?.todayEarnings || 0).toFixed(2)}`,
      icon: <DollarSvg width={scale(22)} height={scale(22)} />,
      iconBg: '#22C55E22',
      iconColor: '#22C55E',
      accent: '#22C55E',
      goto: 'Transactions',
    },
    {
      label: 'Completed Trips',
      value: `${dashboardData?.totalTrips ?? 0}`,
      icon: <TruckSvg width={scale(22)} height={scale(22)} />,
      iconBg: '#3B82F622',
      iconColor: '#3B82F6',
      accent: '#3B82F6',
      goto: null,
    },
  ];

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
  const quickActions = [
    {
      title: 'Support',
      icon: <SupportSvg width={scale(36)} height={scale(36)} />,
    },
    {
      title: 'Vehicle',
      icon: <VehicleSvg width={scale(36)} height={scale(36)} />,
    },
    {
      title: 'Bank',
      icon: <BankSvg width={scale(36)} height={scale(36)} />,
    },
    {
      title: 'Settings',
      icon: <SettingSvg width={scale(36)} height={scale(36)} />,
    },
  ];

  const fetchDriverOrders = async (type: 'ALL' | 'ACTIVE') => {
    if (!isOnline) {
      setOrders([]);
      return;
    }
    try {
      const location = await getCurrentLocation();
      console.log(location)

      const res = await fetchData({
        method: 'POST',
        url: '/user/order/driver-orders',
        data: {
          lat: location.lat,
          lng: location.long,
          type,
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

      setOrders(formatted);
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
    }
  };

  refreshHomeRef.current = () => {
    checkIsOnline();
    fetchDashboardData();
    fetchDriverOrders('ACTIVE');
  };

  useFocusEffect(
    useCallback(() => {
      refreshHomeRef.current();
    }, []),
  );
  // const visibleOrders = showAllRequests ? orders : orders.slice(0, 1); // 👈 only first request
  const acceptedOrders = orders.filter(
    order =>
      order.isAccepted ||
      order.driverRequestStatus === 'ACCEPTED' ||
      order.status === 'IN_PROGRESS',
  );
  const visibleOrders = orders
    .filter(
      order =>
        order.isAccepted ||
        order.driverRequestStatus === 'ACCEPTED' ||
        order.status === 'IN_PROGRESS',
    )
    .slice(0, 1);
  return (
    <View
      style={{
        backgroundColor: Colors.bg,

        flex: 1,
      }}
    >
      <Header showBadge={true} showBackButton={false} showNotification={false} simpleHeader={false} />
      <ScrollView
        style={MY_STYLES.CONTENT_CONTAINER}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.red]} // Android
            tintColor={Colors.red} // iOS
          />
        }
      >
        <View style={{ flex: 1 }}>
          {/* ---------- Pending Approval Banner ---------- */}
          {user?.status === 'PENDING' && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                ⏳ Your account is under review. You'll be able to receive orders once approved.
              </Text>
            </View>
          )}

          {/* --------------------Available Balance------------------------- */}

          {user?.driverType === 'INDIVIDUAL' && (
            <View style={[MY_STYLES.CARD, styles.CardContainer]}>
              <View style={styles.iconContainer}>
                <WalletIcon height={fontScale(24)} width={fontScale(22)} />
              </View>

              {/* MIDDLE CONTENT */}
              <View style={styles.balanceContent}>
                <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>

      <TouchableOpacity
                  style={styles.syncBtn}
                  onPress={syncPendingPayments}
                  disabled={syncLoading}
                  activeOpacity={0.8}
                >
                  {syncLoading ? (
                    <Ionicons name="sync" size={scale(16)} color={Colors.black} style={{ transform: [{ rotate: '45deg' }] }} />
                  ) : (
                    <Ionicons name="sync-outline" size={scale(16)} color={Colors.black} />
                  )}
                </TouchableOpacity>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceAmount} numberOfLines={1}>
                    ${(dashboardData?.walletBalance ?? 0).toFixed(2)}
                  </Text>

                  {/* <Text style={styles.balanceStatus}>(low)</Text> */}
                </View>
              </View>

              <TouchableOpacity
                style={styles.replenishBtn}
                onPress={() => setIsReplenishModalVisible(true)}
              >
                <Text style={styles.replenishText}>Top Up</Text>
              </TouchableOpacity>


        

            </View>
          )}

        

          {/* ── Stat Cards ── */}
          <View style={styles.statsGrid}>
            {statCards.map((card, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                style={styles.statCard}
                onPress={() => card.goto && navigation.navigate(card.goto as never)}
              >
                {/* accent left bar */}
                <View style={[styles.accentBar, { backgroundColor: card.accent }]} />

                <View style={[styles.statIconBox, { backgroundColor: card.iconBg }]}>
                  {card.icon}
                </View>

                <Text style={styles.statValue} numberOfLines={1}>{card.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ---------------------------- New Request--------------------------- */}
          <View style={{ marginTop: scale(20) }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: scale(15),
              }}
            >
              {/* LEFT: Title */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: scale(10),
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    borderColor: '#22C55E',
                    borderWidth: 1,
                    height: scale(22),
                    width: scale(22),
                    borderRadius: 50,
                  }}
                >
                  <View
                    style={{
                      width: scale(14),
                      height: scale(14),
                      backgroundColor: '#22C55E',
                      borderRadius: 50,
                      alignSelf: 'center',
                      marginTop: scale(4),
                    }}
                  />
                </View>

                <Text
                  style={{
                    fontFamily: 'Baloo2-ExtraBold',
                    fontSize: scale(16),
                    color: Colors.black,
                  }}
                >
                  Active Request
                </Text>
              </View>

        
            </View>
            {orders && (
              <FlatList
                data={visibleOrders}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedOrderForDetail(item);
                      setIsDetailModalVisible(true);
                    }}
                  >
                    <RequestCard
                      orderId={item._id}
                      status={
                        item.isAccepted
                          ? 'ACCEPTED'
                          : item.isRequested
                            ? 'BOOKING_REQUESTED'
                            : sentQuotes.includes(item._id)
                              ? 'QUOTE_SENT'
                              : 'PENDING'
                      }
                      name={item.customerId.fullName}
                      photo={item.customerId.portraitPhoto}
                      pickup={item.pickup}
                      drop={item.drop}
                      distance={item.distance}
                      weight={item.package.weight}
                      weightUnit={item.package.weightUnit}
                      itemName={item.package.itemName}
                      price={item.finalPrice}
                      createdAt={item.createdAt}
                      onCancel={() => console.log('Cancel', item._id)}
                      onSendQuote={() => {
                        console.log('Selected order ID:', item._id);
                        setSelectedOrderForQuote(item);
                      }}
                    />
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View
                    style={{ alignItems: 'center', paddingVertical: scale(20) }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Rubik-Regular',
                        fontSize: fontScale(14),
                        color: Colors.Textgray,
                      }}
                    >
                      No active request available
                    </Text>
                  </View>
                }
              />
            )}
            {/* Quick Action — temporarily disabled
            <View style={{ marginTop: scale(30), marginBottom: scale(20) }}>
              <Text
                style={{
                  fontFamily: 'Baloo2-ExtraBold',
                  fontSize: scale(16),
                  color: Colors.black,
                  marginBottom: scale(15),
                }}
              >
                Quick Action
              </Text>

              <View style={styles.quickActionsContainer}>
                {quickActions.map((action, index) => (
                  <View key={index} style={styles.quickActionItem}>
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => console.log(`${action.title} pressed`)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.quickActionIcon]}>
                        {action.icon}
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.quickActionText}>{action.title}</Text>
                  </View>
                ))}
              </View>
            </View>
            */}
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
                  selectedOrderForQuote.driverRequestStatus === 'REQUESTED' ||
                  sentQuotes.includes(selectedOrderForQuote._id)
                }
                onQuoteSuccess={orderId => addSentQuote(orderId)}
              />
            )}

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
        </View>
        
      </ScrollView>

   <Modal
  visible={isReplenishModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setIsReplenishModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
        style={{ width: '100%' }}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: scale(30),
            }}
          >
            <Text style={styles.modalTitle}>Replenish Balance</Text>

            <View style={styles.balanceInfoRow}>
              <View
                style={[
                  styles.balanceInfoCard,
                  styles.currentBalanceCard,
                ]}
              >
                <Text style={styles.balanceCardLabel}>Current</Text>

                <Text style={styles.balanceCardAmount}>
                  ${currentBalance.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Email</Text>

            <View style={styles.amountInputContainer}>
              <TextInput
                value={enteredEmail}
                onChangeText={setEnteredEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.amountInput, { paddingLeft: 0 }]}
                placeholder="Enter email"
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.inputLabel}>Phone</Text>

            <View style={styles.amountInputContainer}>
              <TextInput
                value={enteredPhone}
                onChangeText={setEnteredPhone}
                keyboardType="phone-pad"
                style={[styles.amountInput, { paddingLeft: 0 }]}
                placeholder="Enter phone"
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.inputLabel}>Top-up Amount</Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.dollarSign}>$</Text>

              <TextInput
                value={enteredAmount}
                onChangeText={setEnteredAmount}
                keyboardType="numeric"
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  setIsReplenishModalVisible(false)
                }
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  paymentLoading && { opacity: 0.7 },
                ]}
                onPress={handleReplenishPayment}
                disabled={paymentLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {paymentLoading
                    ? 'Processing...'
                    : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>
      {paydetails && (
        <PayementWebView
          onRefresh={fetchDashboardData}
          data={paydetails}
          onClose={() => setPayDetails(null)}
          params={route.params}
        />
      )}
      <Modal
        visible={paymentStatus === 'PENDING'}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPaymentStatus('IDLE');
          setPaynowPollUrl('');
          if (pollingIntervalRef.current)
            clearInterval(pollingIntervalRef.current);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <Text style={[styles.modalSubTitle, { marginBottom: scale(8) }]}>
              {paynowInstructions ||
                'Follow the EcoCash prompt on your phone to complete payment.'}
            </Text>
            <Text style={[styles.modalSubTitle, { color: Colors.Textgray }]}>
              Waiting for payment confirmation...
            </Text>
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: scale(16) }]}
              onPress={() => {
                setPaymentStatus('IDLE');
                setPaynowPollUrl('');
                if (pollingIntervalRef.current)
                  clearInterval(pollingIntervalRef.current);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!paymentResult}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentResult(null)}
      >
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIconCircle,
                {
                  backgroundColor: paymentResult?.success
                    ? '#22C55E22'
                    : '#EF444422',
                },
              ]}
            >
              <Text style={styles.resultIconText}>
                {paymentResult?.success ? '✓' : '✕'}
              </Text>
            </View>
            <Text style={styles.resultTitle}>
              {paymentResult?.success ? 'Payment Successful' : 'Payment Failed'}
            </Text>
            {paymentResult?.success ? (
              <Text style={styles.resultSubText}>
                Your wallet has been topped up successfully.
              </Text>
            ) : (
              <Text style={styles.resultSubText}>
                Your payment was not completed. Please try again.
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.resultBtn,
                {
                  backgroundColor: paymentResult?.success
                    ? '#22C55E'
                    : Colors.red,
                },
              ]}
              onPress={() => {
                setPaymentResult(null);
                setPaymentStatus('IDLE');
              }}
            >
              <Text style={styles.resultBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  CardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: fontScale(1),
    borderColor: Colors.red,
    marginVertical: 6,
    padding: scale(12),
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  pendingBanner: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: scale(8),
    padding: scale(12),
    marginVertical: scale(8),
  },
  pendingBannerText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: '#92400E',
    lineHeight: fontScale(20),
  },

  balanceContent: {
    flex: 1, // 🔥 THIS FIXES OVERLAP
    marginHorizontal: scale(10),
  },

  balanceLabel: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  balanceAmount: {
    fontSize: fontScale(20),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    marginRight: scale(6),
  },
  replenishBtn: {
    backgroundColor: Colors.red,
    borderRadius: scale(6),
    paddingHorizontal: scale(10),
    height: scale(32),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  replenishText: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(11),
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginVertical: scale(8),
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    width: '47%',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: scale(16),
    borderBottomLeftRadius: scale(16),
  },
  statIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  statValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: fontScale(22),
    color: Colors.black,
    marginBottom: scale(4),
  },
  statLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.Textgray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
  },
  modalTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(18),
    color: Colors.black,
    marginBottom: scale(16),
    textAlign: 'center',
  },
  modalSubTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.black,
    marginBottom: scale(16),
    textAlign: 'center',
  },
  balanceInfoRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(16),
  },
  balanceInfoCard: {
    flex: 1,
    backgroundColor: Colors.white,
    flexDirection:"row",
    justifyContent:"space-between",
    borderRadius: scale(16),
    padding: scale(14),
    shadowColor: '#b0b0c0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  currentBalanceCard: {
    backgroundColor: Colors.bg,
    shadowColor: '#b0b0c0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  balanceCardLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(17),
    color: Colors.Textgray,
    marginBottom: scale(4),
  },
  balanceCardAmount: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(18),
    color: Colors.black,
    textAlign:"center"
  },
  inputLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(13),
    color: Colors.black,
    marginBottom: scale(8),
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
    backgroundColor: Colors.white,
  },
  dollarSign: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(16),
    color: Colors.black,
    marginRight: scale(4),
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(16),
    color: Colors.black,
    paddingVertical: scale(10),
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(8),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: scale(10),
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.black1,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.red,
    borderRadius: scale(10),
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.white,
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
  },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: scale(20),
    padding: scale(24),
    width: '100%',
    alignItems: 'center',
  },
  resultIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  resultIconText: {
    fontSize: fontScale(28),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
  },
  resultTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(18),
    color: Colors.black,
    marginBottom: scale(20),
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: scale(8),
  },
  resultDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  resultLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.Textgray,
  },
  resultValue: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.black,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: scale(8),
  },
  resultSubText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.Textgray,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  resultBtn: {
    marginTop: scale(20),
    width: '100%',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  resultBtnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.white,
  },

  actionBtnsRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: scale(6),
  },
  syncBtn: {
    // backgroundColor: Colors.primary,
   paddingLeft: 10,
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
