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

interface Props {
  visible: boolean;
  order: OrderUI;
  onClose: () => void;
  sentQuotes?: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
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
  parcel: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
  PARCEL: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
};
const DEFAULT_SVC = { label: 'ORDER', bg: '#F3F4F6', color: '#374151', dot: '#374151' };

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string }) {
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
    marginTop: verticalScale(16),
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
  const [quoteSent, setQuoteSent] = useState(order.isRequested || sentQuotes.includes(order._id));

  const isCab = order.serviceType === 'CAB';
  const isFoodOrder = order.orderStatus === 'ready' ||
    order.serviceId?.serviceType === 'food' ||
    order.serviceId?.name === 'food';

  const svc = SERVICE_CONFIG[order.serviceId?.serviceType || order.serviceId?.name || (isFoodOrder ? 'food' : '')] || DEFAULT_SVC;

  const getStatus = () => {
    if (order.isAccepted) return 'ACCEPTED';
    if (order.isRequested) return 'BOOKING_REQUESTED';
    if (quoteSent || sentQuotes.includes(order._id)) return 'QUOTE_SENT';
    return 'PENDING';
  };

  useEffect(() => {
    if (visible && order) {
      fetchDetails();
      setQuoteSent(order.isRequested || sentQuotes.includes(order._id));
    }
  }, [visible, order]);

  useEffect(() => {
    const subscription = AppEvents.addListener(EVENTS.REFRESH_ORDERS, fetchDetails);
    return () => subscription.remove();
  }, []);

  const fetchDetails = async () => {
    if (isFoodOrder) return; // food orders don't have /orderDetail endpoint
    try {
      setLoading(true);
      const res = await fetchData({
        method: 'GET',
        url: `/user/order/orderDetail/${order._id}`,
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderDetail(res.data);
    } catch (error) {
      console.log('OrderDetailModal fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFood = async () => {
    try {
      setAccepting(true);
      await api.patch(`/driver/food-orders/${order._id}/accept`);
      Toast.show({ type: 'success', text1: 'Order accepted!' });
      onClose();
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
        navigation.navigate('RideDetails', { order: { ...order, tripId, tripStatus: 'CREATED' } });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Failed to accept' });
    } finally {
      setAccepting(false);
    }
  };

  // ── price to show ─────────────────────────────────────────────────────────
  const displayAmount = order.totalAmount?.$numberDecimal ?? order.totalAmount
    ?? orderDetail?.finalPrice ?? orderDetail?.myQuote?.price
    ?? order.myQuote?.price ?? order.price?.totalFare;

  const status = getStatus();

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
                {order.orderId || order._id}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── customer row ── */}
            <View style={styles.customerRow}>
              <View style={styles.avatarWrap}>
                {order.customerId?.portraitPhoto ? (
                  <Image
                    source={{ uri: `${IMAGE_URL}/${order.customerId.portraitPhoto}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {(order.customerId?.fullName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {order.customerId?.fullName || '—'}
                </Text>
                <Text style={styles.timeAgo}>{timeAgo(order.createdAt)}</Text>
              </View>
              {displayAmount !== undefined && displayAmount !== null && (
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>
                    {formatMoney(displayAmount, order.currency)}
                  </Text>
                </View>
              )}
            </View>

            {/* ── divider ── */}
            <View style={styles.divider} />

            {/* ── route ── */}
            <Section title="ROUTE">
              <View style={styles.routeRow}>
                <View style={styles.routeIconCol}>
                  <View style={styles.dotBlue} />
                  <View style={styles.routeLine} />
                  <View style={styles.dotRed} />
                </View>
                <View style={styles.routeTexts}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeAddress}>{order.pickup?.address || '—'}</Text>
                  <View style={{ height: verticalScale(12) }} />
                  <Text style={styles.routeLabel}>DROP OFF</Text>
                  <Text style={styles.routeAddress}>{order.drop?.address || '—'}</Text>
                </View>
              </View>
              {!!order.distance && (
                <View style={styles.distanceChip}>
                  <Text style={styles.distanceText}>📍 {order.distance}</Text>
                </View>
              )}
            </Section>

            {/* ── order info ── */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading details…</Text>
              </View>
            ) : (
              <>
                {/* Food order items */}
                {isFoodOrder && order.package?.itemName && (
                  <Section title="ORDER ITEMS">
                    <Text style={styles.itemSummary}>{order.package.itemName}</Text>
                  </Section>
                )}

                {/* Food order: customer phone when active */}
                {isFoodOrder && order.isAccepted && (order as any).customerPhone && (
                  <Section title="CUSTOMER">
                    <InfoRow label="Phone" value={(order as any).customerPhone} />
                  </Section>
                )}

                {/* CAB: passenger info */}
                {isCab && (
                  <Section title="PASSENGER">
                    <InfoRow label="Name" value={order.passenger?.name || orderDetail?.passenger?.name} />
                    <InfoRow
                      label="Phone"
                      value={
                        order.passenger
                          ? `${order.passenger.countryCode} ${order.passenger.phone}`
                          : undefined
                      }
                    />
                    {order.price && (
                      <InfoRow label="Distance" value={`${order.price.distanceKm} km`} />
                    )}
                  </Section>
                )}

                {/* Parcel: sender + receiver */}
                {!isCab && !isFoodOrder && (
                  <Section title="CONTACTS">
                    <InfoRow label="Sender" value={orderDetail?.sender?.name || '—'} />
                    <InfoRow label="Sender Phone" value={orderDetail?.sender?.phone} />
                    <InfoRow label="Receiver" value={orderDetail?.receiver?.name || '—'} />
                    <InfoRow label="Receiver Phone" value={orderDetail?.receiver?.phone} />
                  </Section>
                )}

                {/* Package details */}
                {!isCab && !isFoodOrder && (
                  <Section title="PACKAGE">
                    <InfoRow label="Item" value={order.package?.itemName} />
                    <InfoRow
                      label="Weight"
                      value={order.package?.weight ? `${order.package.weight} ${order.package.weightUnit}` : undefined}
                    />
                    <InfoRow label="Description" value={order.package?.description} />
                    <InfoRow label="Payment" value={order.package?.paymentMode} />
                  </Section>
                )}

                {/* Quote details */}
                {status === 'BOOKING_REQUESTED' && (
                  <Section title="YOUR QUOTE">
                    <InfoRow
                      label="Price"
                      value={orderDetail?.myQuote?.price ? formatMoney(orderDetail.myQuote.price, order.currency) : undefined}
                    />
                    <InfoRow
                      label="ETA"
                      value={orderDetail?.myQuote?.eta ? `${orderDetail.myQuote.eta} min` : undefined}
                    />
                  </Section>
                )}

                {/* Package photos */}
                {!isCab && orderDetail?.package?.photos?.length > 0 && (
                  <Section title="PHOTOS">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: scale(4) }}>
                      {orderDetail.package.photos.map((p: any, i: number) => (
                        <Image
                          key={i}
                          source={{ uri: `${IMAGE_URL}/${p.url}` }}
                          style={styles.photo}
                        />
                      ))}
                    </ScrollView>
                  </Section>
                )}
              </>
            )}

            {/* ── spacer so actions don't cover content ── */}
            <View style={{ height: verticalScale(100) }} />
          </ScrollView>

          {/* ── action bar (pinned to bottom) ── */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.ignoreBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.ignoreText}>
                {status === 'ACCEPTED' ? 'Close' : isCab ? 'Ignore' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            {/* Food: Accept */}
            {isFoodOrder && status === 'PENDING' && (
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
            )}

            {/* CAB: Accept */}
            {isCab && status === 'PENDING' && (
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
            )}

            {/* Parcel: Send Quote */}
            {!isCab && !isFoodOrder && status === 'PENDING' && !quoteSent && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowQuoteModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Send Quote</Text>
              </TouchableOpacity>
            )}

            {/* Accepted: See Ride */}
            {status === 'ACCEPTED' && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  onClose();
                  navigation.navigate('RideDetails', {
                    order: {
                      ...order,
                      tripId: orderDetail?.tripId,
                      sender: orderDetail?.sender,
                      tripStatus: orderDetail?.tripStatus ?? 'CREATED',
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>See Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {showQuoteModal && (
        <SendQuoteModal
          visible
          onClose={() => setShowQuoteModal(false)}
          orderMongoId={order._id}
          orderDetails={{
            distance: order.distance,
            weight: order.package?.weight,
            itemName: order.package?.itemName,
            weightUnit: order.package?.weightUnit,
          }}
          defaultPrice={order.estimatedPrice}
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
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '22',
  },
  avatarInitial: {
    fontSize: fontScale(20),
    fontFamily: 'Rubik-Bold',
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: fontScale(16), fontFamily: 'Rubik-SemiBold', color: '#111827' },
  timeAgo: { fontSize: fontScale(12), fontFamily: 'Rubik-Regular', color: '#9CA3AF', marginTop: 2 },
  amountBadge: {
    backgroundColor: Colors.lightgreen || '#F0FDF4',
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountText: { fontSize: fontScale(13), fontFamily: 'Rubik-Bold', color: Colors.green || '#15803D' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginTop: verticalScale(14) },

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

  // ── item summary (food) ──────────────────────────────────────────────────
  itemSummary: { fontSize: fontScale(13), fontFamily: 'Rubik-Medium', color: '#374151' },

  // ── loading ──────────────────────────────────────────────────────────────
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: verticalScale(24),
    gap: scale(8),
  },
  loadingText: { fontSize: fontScale(13), fontFamily: 'Rubik-Regular', color: '#9CA3AF' },

  // ── photos ───────────────────────────────────────────────────────────────
  photo: {
    width: scale(90),
    height: scale(90),
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
    height: scale(50),
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
    height: scale(50),
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
