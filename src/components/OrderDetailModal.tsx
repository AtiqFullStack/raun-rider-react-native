import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { Colors } from '../constants/Colors';
import { scale, fontScale, verticalScale } from '../utils/scaling';
import useAxios from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { useQuotes } from '../context/QuoteContext';
import { OrderUI } from '../screens/HomeScreen';
import SendQuoteModal from './SendQuoteModal';
import { IMAGE_URL } from '../utils/config';
import { useNavigation } from '@react-navigation/native';
import { AppEvents, EVENTS } from '../utils/events';
import Toast from 'react-native-toast-message';
import { api } from '../services/apiClient';
import { StorageService } from '../utils/Storage';

interface Props {
  visible: boolean;
  order: OrderUI;
  onClose: () => void;
  sentQuotes?: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatMoney(value: any, currency = 'BND') {
  const n = Number(value?.$numberDecimal ?? value ?? 0);
  return `${currency} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

const SERVICE_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  food:   { label: 'FOOD',   bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
  FOOD:   { label: 'FOOD',   bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
  CAB:    { label: 'CAB',    bg: '#E8F4FD', color: '#1565C0', dot: '#1565C0' },
  cab:    { label: 'CAB',    bg: '#E8F4FD', color: '#1565C0', dot: '#1565C0' },
  parcel: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
  PARCEL: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
};
const DEFAULT_SVC = { label: 'ORDER', bg: '#F3F4F6', color: '#374151', dot: '#374151' };

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={infoRowStyles.row}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={infoRowStyles.value}>{value}</Text>
    </View>
  );
}
const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: verticalScale(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: { fontSize: fontScale(12), fontFamily: 'Rubik-Regular', color: '#6B7280', flex: 1 },
  value: { fontSize: fontScale(13), fontFamily: 'Rubik-SemiBold', color: '#111827', flex: 2, textAlign: 'right' },
});

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  wrap: {
    marginTop: verticalScale(14),
    backgroundColor: '#FAFAFA',
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  title: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-SemiBold',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: verticalScale(6),
  },
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrderDetailModal({ visible, order, onClose, sentQuotes = [] }: Props) {
  const { fetchData } = useAxios();
  const { token } = useAuth();
  const { addSentQuote } = useQuotes();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSent, setQuoteSent] = useState(order?.isRequested || sentQuotes.includes(order?._id));

  useEffect(() => {
    if (visible && order?._id) {
      fetchDetails();
      setQuoteSent(order.isRequested || sentQuotes.includes(order._id));
    }
  }, [visible, order?._id]);

  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.REFRESH_ORDERS, fetchDetails);
    return () => subscription.remove();
  }, []);

  const fetchDetails = async () => {
    if (!order?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/driver/orders/unified/${order._id}`);
      if (res.data?.data?.order || res.data?.order) {
        setOrderDetail(res.data?.data?.order || res.data?.order);
      }
    } catch (error: any) {
      // Fallback for legacy endpoints
      try {
        const res = await fetchData({
          method: 'GET',
          url: `/user/order/orderDetail/${order._id}`,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res?.data) {
          setOrderDetail(res.data);
        }
      } catch (err) {
        // Ignore fallback error
      }
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  // Merge prop order and fetched orderDetail
  const merged: any = {
    ...order,
    ...(orderDetail || {}),
    orderDetails: orderDetail?.orderDetails || order?.orderDetails,
  };

  const isCab = merged.serviceType === 'CAB' || merged.serviceType === 'cab';
  const isFoodOrder =
    merged.sourceModel === 'FoodOrder' ||
    merged._orderType === 'food' ||
    merged.serviceType === 'food' ||
    merged.serviceType === 'FOOD' ||
    merged.orderStatus === 'ready' ||
    merged.serviceId?.serviceType === 'food' ||
    merged.serviceId?.name?.toLowerCase().includes('food') ||
    !!merged.restaurantId ||
    !!merged.orderDetails?.restaurantId;

  const isParcelOrder =
    !isFoodOrder &&
    !isCab &&
    (merged.sourceModel === 'LoadRequest' ||
      merged._orderType === 'parcel' ||
      merged.serviceType === 'parcel' ||
      merged.serviceType === 'PARCEL' ||
      merged.serviceId?.serviceType === 'parcel' ||
      merged.serviceId?.name?.toLowerCase().includes('parcel') ||
      !!merged.loadRequestNumber ||
      merged.sender !== undefined ||
      merged.loadItems !== undefined ||
      merged.orderDetails?.loadItems !== undefined);

  const rawStatus = String(merged.orderStatus || merged.status || 'pending').toLowerCase();
  const isActive =
    merged.isAccepted ||
    ['assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'confirmed', 'ready'].includes(rawStatus);

  const isSelectedByCustomer =
    merged.isSelectedByCustomer ||
    ((rawStatus === 'waiting' || rawStatus === 'pending') && !!merged.driverId);

  const svcKey = isFoodOrder ? 'food' : isCab ? 'CAB' : isParcelOrder ? 'parcel' : (merged.serviceId?.serviceType || merged.serviceId?.name || '');
  const svc = SERVICE_CONFIG[svcKey] || SERVICE_CONFIG[svcKey.toLowerCase()] || DEFAULT_SVC;

  const handleAcceptFood = async () => {
    try {
      setAccepting(true);
      await api.post(`/driver/orders/unified/${order._id}/accept`);
      Toast.show({ type: 'success', text1: 'Order accepted successfully!' });
      AppEvents.emit(EVENTS.REFRESH_ORDERS);
      onClose();
      await StorageService.setItem('tripId', order._id);
      navigation.navigate('RideDetails', {
        order: {
          ...merged,
          status: 'assigned',
          isAccepted: true,
          tripId: merged.tripId || merged._id,
          tripStatus: 'ASSIGNED',
        },
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to accept order';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptCab = async () => {
    try {
      setAccepting(true);
      const response = await fetchData({
        method: 'POST',
        url: '/user/order/acceptOrderCAB',
        data: { orderId: order._id },
        headers: { Authorization: `Bearer ${token}` },
      });
      const tripId =
        response.data?.data?.tripId?._id ||
        response.data?.tripId?._id ||
        response.data?.tripId;
      onClose();
      if (tripId) {
        navigation.navigate('RideDetails', { order: { ...merged, tripId, tripStatus: 'CREATED' } });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Failed to accept' });
    } finally {
      setAccepting(false);
    }
  };

  const handleGoToTrip = async () => {
    onClose();
    await StorageService.setItem('tripId', merged._id);
    navigation.navigate('RideDetails', {
      order: {
        ...merged,
        tripId: merged.tripId || merged._id,
        tripStatus: merged.tripStatus || 'CREATED',
      },
    });
  };

  // Pricing
  const displayAmount =
    merged.totalAmount?.$numberDecimal ??
    merged.totalAmount ??
    merged.finalPrice ??
    merged.estimatedPrice ??
    merged.myQuote?.price ??
    merged.orderDetails?.totalAmount ??
    merged.orderDetails?.fare ??
    merged.orderDetails?.price?.totalFare ??
    merged.price?.totalFare;

  // Addresses
  const pickupAddress =
    merged.pickup?.address ||
    merged.pickupLocation?.address ||
    merged.restaurantId?.location?.address ||
    merged.restaurantId?.address ||
    merged.orderDetails?.pickupLocation?.address ||
    '—';

  const dropAddress =
    merged.drop?.address ||
    merged.dropoffLocation?.address ||
    merged.deliveryAddress?.formattedAddress ||
    merged.deliveryAddress?.street ||
    merged.orderDetails?.dropoffLocation?.address ||
    merged.orderDetails?.deliveryAddress?.formattedAddress ||
    '—';

  const distanceText =
    merged.distance ||
    (merged.orderDetails?.distance ? `${merged.orderDetails.distance} km` : undefined) ||
    (merged.price?.distanceKm ? `${merged.price.distanceKm} km` : undefined);

  // Customer info
  const customerName =
    merged.customerId?.fullName ||
    merged.userAuthId?.fullName ||
    merged.orderDetails?.userAuthId?.fullName ||
    merged.sender?.name ||
    merged.orderDetails?.sender?.name ||
    'Customer';

  const customerPhone =
    merged.customerId?.phoneNumber ||
    merged.customerId?.fullPhoneNumber ||
    merged.userAuthId?.phoneNumber ||
    merged.userAuthId?.fullPhoneNumber ||
    merged.deliveryAddress?.contactPersonNumber ||
    merged.orderDetails?.deliveryAddress?.contactPersonNumber ||
    (merged as any).customerPhone;

  const customerPhoto =
    merged.customerId?.portraitPhoto ||
    merged.userAuthId?.portraitPhoto ||
    merged.orderDetails?.userAuthId?.portraitPhoto;

  // Restaurant info
  const restName =
    merged.restaurantId?.restaurantName ||
    merged.restaurantId?.name ||
    merged.orderDetails?.restaurantId?.restaurantName ||
    merged.orderDetails?.restaurantId?.name;

  const restPhone =
    merged.restaurantId?.phoneNumber ||
    merged.restaurantId?.restaurantPhone ||
    merged.orderDetails?.restaurantId?.phoneNumber ||
    merged.orderDetails?.restaurantId?.restaurantPhone;

  // Food Items
  const foodItems: any[] =
    merged.items ||
    merged.orderItems ||
    merged.orderDetails?.items ||
    merged.orderDetails?.orderItems ||
    [];

  // Photos
  const photos: any[] =
    merged.package?.photos ||
    merged.photos ||
    merged.orderDetails?.package?.photos ||
    merged.orderDetails?.photos ||
    [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* ── drag handle ── */}
          <View style={styles.handle} />

          {/* ── header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
                <View style={[styles.dot, { backgroundColor: svc.dot }]} />
                <Text style={[styles.serviceLabel, { color: svc.color }]}>{svc.label}</Text>
              </View>
              <Text style={styles.orderId} numberOfLines={1}>
                {merged.orderNumber || merged.orderId || merged.loadRequestNumber || merged._id}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Customer Banner ── */}
            <View style={styles.customerRow}>
              <View style={styles.avatarWrap}>
                {customerPhoto ? (
                  <Image
                    source={{ uri: `${IMAGE_URL}/${customerPhoto}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {(customerName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {customerName}
                </Text>
                <Text style={styles.timeAgo}>
                  {timeAgo(merged.createdAt)} • <Text style={{ color: Colors.primary, textTransform: 'uppercase' }}>{rawStatus}</Text>
                </Text>
              </View>
              {displayAmount !== undefined && displayAmount !== null && (
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>
                    {formatMoney(displayAmount, merged.currency)}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Customer Selected You Alert ── */}
            {isSelectedByCustomer && !isActive && (
              <View style={styles.selectedAlertBox}>
                <Text style={styles.selectedAlertTitle}>🎉 Customer Selected You!</Text>
                <Text style={styles.selectedAlertSub}>
                  The customer accepted your quote. Tap Accept below to confirm and start the trip.
                </Text>
              </View>
            )}

            {/* ── divider ── */}
            <View style={styles.divider} />

            {/* ── Restaurant Details (Food) ── */}
            {isFoodOrder && !!restName && (
              <Section title="RESTAURANT">
                <InfoRow label="Name" value={restName} />
                {!!restPhone && <InfoRow label="Phone" value={restPhone} />}
              </Section>
            )}

            {/* ── Route ── */}
            <Section title="ROUTE">
              <View style={styles.routeRow}>
                <View style={styles.routeIconCol}>
                  <View style={styles.dotBlue} />
                  <View style={styles.routeLine} />
                  <View style={styles.dotRed} />
                </View>
                <View style={styles.routeTexts}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeAddress}>{pickupAddress}</Text>
                  <View style={{ height: verticalScale(12) }} />
                  <Text style={styles.routeLabel}>DROP OFF</Text>
                  <Text style={styles.routeAddress}>{dropAddress}</Text>
                </View>
              </View>
              {!!distanceText && (
                <View style={styles.distanceChip}>
                  <Text style={styles.distanceText}>📍 {distanceText}</Text>
                </View>
              )}
            </Section>

            {/* ── Loading indicator ── */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Fetching details…</Text>
              </View>
            ) : null}

            {/* ── Food Items ── */}
            {isFoodOrder && foodItems.length > 0 && (
              <Section title={`ORDER ITEMS (${foodItems.length})`}>
                {foodItems.map((item: any, i: number) => {
                  const qty = item.quantity || 1;
                  const name = item.name || item.menuItemId?.name || item.itemName || 'Item';
                  const price = item.price?.$numberDecimal ?? item.price;
                  return (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.itemBullet}>
                        <Text style={styles.itemBulletText}>{qty}x</Text>
                      </View>
                      <Text style={styles.itemSummary} numberOfLines={2}>
                        {name}
                      </Text>
                      {price ? (
                        <Text style={styles.itemPriceText}>
                          {formatMoney(Number(price) * Number(qty), merged.currency)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </Section>
            )}

            {/* ── Contact Details ── */}
            {isFoodOrder && (
              <Section title="CUSTOMER CONTACT">
                <InfoRow label="Name" value={customerName} />
                {!!customerPhone && <InfoRow label="Phone" value={customerPhone} />}
                {!!merged.deliveryAddress?.notes && (
                  <InfoRow label="Note" value={merged.deliveryAddress.notes} />
                )}
              </Section>
            )}

            {/* ── Parcel Contacts ── */}
            {isParcelOrder && (
              <Section title="CONTACTS">
                <InfoRow
                  label="Sender"
                  value={merged.sender?.name || merged.orderDetails?.sender?.name || merged.pickupLocation?.name || customerName}
                />
                <InfoRow
                  label="Sender Phone"
                  value={merged.sender?.phone || merged.orderDetails?.sender?.phone || merged.pickupLocation?.phone || customerPhone}
                />
                <InfoRow
                  label="Receiver"
                  value={merged.receiver?.name || merged.orderDetails?.receiver?.name || merged.dropoffLocation?.name}
                />
                <InfoRow
                  label="Receiver Phone"
                  value={merged.receiver?.phone || merged.orderDetails?.receiver?.phone || merged.dropoffLocation?.phone}
                />
              </Section>
            )}

            {/* ── Parcel Package Details ── */}
            {isParcelOrder && (
              <Section title="PACKAGE DETAILS">
                <InfoRow
                  label="Items"
                  value={
                    merged.loadItems && merged.loadItems.length > 0
                      ? `${merged.loadItems.length}x item${merged.loadItems.length > 1 ? 's' : ''}`
                      : merged.package?.itemName || merged.orderDetails?.package?.itemName
                  }
                />
                <InfoRow
                  label="Weight"
                  value={
                    merged.weight?.value
                      ? `${merged.weight.value} ${merged.weight.unit}`
                      : merged.package?.weight
                      ? `${merged.package.weight} ${merged.package.weightUnit || 'kg'}`
                      : merged.orderDetails?.weight?.value
                      ? `${merged.orderDetails.weight.value} ${merged.orderDetails.weight.unit}`
                      : undefined
                  }
                />
                <InfoRow
                  label="Type"
                  value={merged.typeOfProduct || merged.orderDetails?.typeOfProduct || merged.package?.category}
                />
                <InfoRow
                  label="Description"
                  value={
                    merged.loadDescription ||
                    merged.package?.description ||
                    merged.orderDetails?.loadDescription ||
                    merged.orderDetails?.package?.description
                  }
                />
                <InfoRow
                  label="Payment"
                  value={merged.paymentMethod || merged.orderDetails?.paymentMethod || merged.package?.paymentMode}
                />
                <InfoRow
                  label="Payer"
                  value={merged.payerType || merged.orderDetails?.payerType}
                />
              </Section>
            )}

            {/* ── CAB Passenger ── */}
            {isCab && (
              <Section title="PASSENGER">
                <InfoRow label="Name" value={merged.passenger?.name || customerName} />
                <InfoRow
                  label="Phone"
                  value={
                    merged.passenger?.phone
                      ? `${merged.passenger.countryCode || ''} ${merged.passenger.phone}`
                      : customerPhone
                  }
                />
                {!!merged.price?.distanceKm && (
                  <InfoRow label="Distance" value={`${merged.price.distanceKm} km`} />
                )}
              </Section>
            )}

            {/* ── Driver Quote ── */}
            {merged.myQuote && (
              <Section title="YOUR QUOTE">
                <InfoRow
                  label="Quoted Price"
                  value={formatMoney(merged.myQuote.price, merged.currency)}
                />
                {!!merged.myQuote.eta && (
                  <InfoRow label="ETA" value={`${merged.myQuote.eta} min`} />
                )}
              </Section>
            )}

            {/* ── Photos ── */}
            {photos.length > 0 && (
              <Section title="PHOTOS">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: scale(4) }}>
                  {photos.map((p: any, i: number) => {
                    const uri = p.url ? `${IMAGE_URL}/${p.url}` : typeof p === 'string' ? `${IMAGE_URL}/${p}` : null;
                    if (!uri) return null;
                    return (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={styles.photo}
                      />
                    );
                  })}
                </ScrollView>
              </Section>
            )}

            {/* ── spacer so actions don't cover content ── */}
            <View style={{ height: verticalScale(100) }} />
          </ScrollView>

          {/* ── action bar (pinned to bottom) ── */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.ignoreBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.ignoreText}>
                {isActive ? 'Close' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            {/* Active order: Go to Trip */}
            {isActive ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGoToTrip}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Go to Trip 🚀</Text>
              </TouchableOpacity>
            ) : isSelectedByCustomer ? (
              /* Customer selected this driver: Accept */
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#16A34A' }, accepting && { opacity: 0.7 }]}
                onPress={handleAcceptFood}
                disabled={accepting}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {accepting ? 'Accepting…' : 'Accept Order'}
                </Text>
              </TouchableOpacity>
            ) : isFoodOrder ? (
              /* Food Order: Direct Accept */
              <TouchableOpacity
                style={[styles.primaryBtn, accepting && { opacity: 0.7 }]}
                onPress={handleAcceptFood}
                disabled={accepting}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {accepting ? 'Accepting…' : 'Accept Order'}
                </Text>
              </TouchableOpacity>
            ) : isCab ? (
              /* CAB: Accept */
              <TouchableOpacity
                style={[styles.primaryBtn, accepting && { opacity: 0.7 }]}
                onPress={handleAcceptCab}
                disabled={accepting}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {accepting ? 'Accepting…' : 'Accept Ride'}
                </Text>
              </TouchableOpacity>
            ) : isParcelOrder ? (
              /* Parcel: Send Quote */
              quoteSent || sentQuotes.includes(order._id) ? (
                <View style={[styles.primaryBtn, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={styles.primaryBtnText}>Quote Sent ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowQuoteModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>Send Quote</Text>
                </TouchableOpacity>
              )
            ) : null}
          </View>
        </View>
      </View>

      {showQuoteModal && (
        <SendQuoteModal
          visible
          onClose={() => setShowQuoteModal(false)}
          orderMongoId={order._id}
          orderDetails={{
            distance: merged.distance,
            weight: merged.weight?.value || merged.package?.weight,
            itemName: merged.package?.itemName || merged.loadItems?.[0]?.name,
            weightUnit: merged.weight?.unit || merged.package?.weightUnit,
          }}
          defaultPrice={displayAmount}
          alreadySent={quoteSent || sentQuotes.includes(order._id)}
          onQuoteSuccess={(orderId) => {
            setQuoteSent(true);
            addSentQuote(orderId);
            setShowQuoteModal(false);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── overlay & sheet ──────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? verticalScale(30) : verticalScale(16),
  },
  handle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(4),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
  },

  // ── header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(9),
    paddingVertical: scale(4),
    borderRadius: scale(20),
    gap: scale(4),
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  serviceLabel: { fontSize: fontScale(10), fontFamily: 'Rubik-SemiBold', letterSpacing: 0.6 },
  orderId: { fontSize: fontScale(12), fontFamily: 'Rubik-Regular', color: '#9CA3AF', flex: 1 },
  closeBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: { fontSize: fontScale(13), color: '#6B7280', fontFamily: 'Rubik-Medium' },

  // ── customer ─────────────────────────────────────────────────────────────
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginTop: verticalScale(14),
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '22',
  },
  avatarInitial: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Bold',
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: fontScale(15), fontFamily: 'Rubik-SemiBold', color: '#111827' },
  timeAgo: { fontSize: fontScale(11), fontFamily: 'Rubik-Regular', color: '#9CA3AF', marginTop: 2 },
  amountBadge: {
    backgroundColor: Colors.lightgreen || '#F0FDF4',
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountText: { fontSize: fontScale(13), fontFamily: 'Rubik-Bold', color: Colors.green || '#15803D' },

  selectedAlertBox: {
    marginTop: verticalScale(12),
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: scale(10),
    padding: scale(12),
  },
  selectedAlertTitle: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Bold',
    color: '#15803D',
    marginBottom: 2,
  },
  selectedAlertSub: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: '#166534',
  },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginTop: verticalScale(12) },

  // ── route ────────────────────────────────────────────────────────────────
  routeRow: { flexDirection: 'row', gap: scale(12) },
  routeIconCol: { alignItems: 'center', paddingTop: scale(3), width: 12 },
  dotBlue: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#BFDBFE',
  },
  routeLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3, minHeight: scale(24) },
  dotRed: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FECACA',
  },
  routeTexts: { flex: 1 },
  routeLabel: {
    fontSize: fontScale(9), fontFamily: 'Rubik-SemiBold',
    color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 2,
  },
  routeAddress: { fontSize: fontScale(13), fontFamily: 'Rubik-Medium', color: '#1F2937', lineHeight: 18 },
  distanceChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginTop: verticalScale(10),
  },
  distanceText: { fontSize: fontScale(12), fontFamily: 'Rubik-SemiBold', color: '#374151' },

  // ── items summary ────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(4),
    gap: scale(8),
  },
  itemBullet: {
    backgroundColor: '#F3F4F6',
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
  },
  itemBulletText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Bold',
    color: '#374151',
  },
  itemSummary: {
    flex: 1,
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Medium',
    color: '#374151',
  },
  itemPriceText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-SemiBold',
    color: '#4B5563',
  },

  // ── loading ──────────────────────────────────────────────────────────────
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    gap: scale(8),
  },
  loadingText: { fontSize: fontScale(12), fontFamily: 'Rubik-Regular', color: '#9CA3AF' },

  // ── photos ───────────────────────────────────────────────────────────────
  photo: {
    width: scale(85),
    height: scale(85),
    borderRadius: scale(10),
    marginRight: scale(10),
    backgroundColor: '#F3F4F6',
  },

  // ── action bar ───────────────────────────────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ignoreBtn: {
    flex: 1,
    height: scale(48),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ignoreText: { fontSize: fontScale(14), fontFamily: 'Rubik-Medium', color: '#6B7280' },
  primaryBtn: {
    flex: 2,
    height: scale(48),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { fontSize: fontScale(15), fontFamily: 'Rubik-SemiBold', color: '#FFFFFF' },
});
