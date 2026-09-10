import { Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import React from 'react';
import { imgaeUrlConverter } from '../utils/converter';
import { fontScale, scale, verticalScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import StorageService from '../utils/Storage';
import { getCurrentLocation } from '../services/driverLocationTracker';

interface RequestCardProps {
  name: string;
  pickup: any;
  drop: any;
  createdAt: string;
  distance?: string;
  weight?: number;
  weightUnit?: string;
  photo: string;
  itemName?: string;
  itemDescription?: string;
  disableSendQuote?: boolean;
  status?: 'PENDING' | 'QUOTE_SENT' | 'BOOKING_REQUESTED' | 'ACCEPTED' | 'COMPLETED';
  disableActions?: boolean;
  price?: number;
  estimatedTime?: string;
  service?: string;
  orderId?: string;
  orderIdNormal?: string;
  isCab?: boolean;
  passengerName?: string;
  onCancel?: () => void;
  onSendQuote?: () => void;
  onRemove?: (orderId: string) => void;
  onAcceptDelivery?: (tripId: string) => void;
}

const SERVICE_CONFIG = {
  cab: { label: 'CAB', bg: '#E8F4FD', color: '#1565C0', dot: '#1565C0' },
  parcel: { label: 'PARCEL', bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:           { label: 'New Request',      bg: '#FFF0EB', color: '#E85D04' },
  QUOTE_SENT:        { label: 'Quote Sent',        bg: '#E3F2FD', color: '#1565C0' },
  BOOKING_REQUESTED: { label: 'Booking Request',   bg: '#FFF8E1', color: '#F57F17' },
  ACCEPTED:          { label: 'Accepted',          bg: '#E8F5E9', color: '#2E7D32' },
  COMPLETED:         { label: 'Completed',         bg: '#F3F4F6', color: '#374151' },
};

export default function RequestCard({
  name, pickup, drop, photo, createdAt, distance,
  weight, weightUnit, itemName, status = 'PENDING',
  price, estimatedTime, orderId, orderIdNormal,
  disableActions = false, isCab = false, passengerName,
  onCancel, onSendQuote, onRemove, onAcceptDelivery,
  service
}: RequestCardProps) {

  const { socket, isSocketConnected } = useSocket();
  const { user } = useAuth();

  const getImageSource = () => {
    if (photo?.trim()) return { uri: imgaeUrlConverter(photo) };
    return { uri: 'https://via.placeholder.com/48' };
  };

  const timeAgo = (date: string | number | Date) => {
    let seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const m = Math.floor(seconds / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const normalizeId = (v: any) => {
    if (!v) return null;
    if (typeof v === 'object') return v._id || v.id || null;
    return String(v).replace(/"/g, '');
  };

  const getTripIdFromPayload = (payload: any) =>
    normalizeId(
      payload?.data?.tripId || payload?.tripId ||
      payload?.data?.trip?._id || payload?.trip?._id ||
      payload?.data?.order?.tripId || payload?.order?.tripId,
    );

  const getActiveTripId = async () => {
    try {
      const res = await api.get('/user/order/driver/active-order');
      return getTripIdFromPayload(res.data);
    } catch { return null; }
  };

  const handleAcceptDelivery = async () => {
    console.log(isCab)
    if (!orderId) { Toast.show({ type: 'error', text1: 'Order ID missing' }); return; }
    try {
      let url =isCab ?"/user/order/acceptOrderCAB":"/user/order/acceptOrder"
      const response = await api.post(url, { orderId });
      const tripId = getTripIdFromPayload(response.data) || (await getActiveTripId());
      console.log(tripId)
      if (tripId) await StorageService.setItem('tripId', tripId);
      Toast.show({ type: 'success', text1: response.data?.message || 'Accepted!' });
      if (!tripId) { Alert.alert('Error', 'Trip ID not received'); return; }
      // Remove card from pending list on success
      if (orderId) onRemove?.(orderId);
      if (socket && isSocketConnected) {
        socket.emit('JOIN_TRIP', { tripId, userId: user?._id }, (ack: any) => {
          if (ack?.error) Toast.show({ type: 'error', text1: 'Chat room not joined' });
        });
        try {
          const loc = await getCurrentLocation();
          socket.emit('DRIVER_LOCATION_UPDATE', { tripId, driverId: user?._id, lat: loc.lat, lng: loc.long });
        } catch {}
      }
      setTimeout(() => onAcceptDelivery?.(tripId), 0);
    } catch (error: any) {
      let message = 'Something went wrong';
      if (error?.response?.data?.message) message = error.response.data.message;
      else if (error?.message) {
        try {
          const match = error.message.match(/\{.*\}/);
          message = match ? JSON.parse(match[0]).message || message : error.message;
        } catch { message = error.message; }
      }
      if (message.toLowerCase().includes('complete') || message.toLowerCase().includes('unable')) {
        const activeTripId = await getActiveTripId();
        if (activeTripId) {
          await StorageService.setItem('tripId', activeTripId);
          setTimeout(() => onAcceptDelivery?.(activeTripId), 0);
          return;
        }
      }
      Toast.show({ type: 'error', text1: message });
    }
  };

  const svc = isCab ? SERVICE_CONFIG.cab : SERVICE_CONFIG.parcel;
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const isAccepted = status === 'ACCEPTED';

  return (
    <View style={[styles.card, isAccepted && styles.cardAccepted]}>

      {/* ── TOP BAR: orderId + service badge ── */}
      <View style={styles.topBar}>
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.serviceDot, { backgroundColor: svc.dot }]} />
          <Text style={[styles.serviceLabel, { color: svc.color }]}>{service}</Text>
        </View>
        <Text style={styles.orderId}>{orderIdNormal}</Text>
      </View>

      {/* ── HEADER: avatar + name + status ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Image style={styles.avatar} source={getImageSource()} />
          <View style={[styles.onlineDot]} />
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.time}>{timeAgo(createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* ── DIVIDER ── */}
      <View style={styles.divider} />

      {/* ── ROUTE ── */}
      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={styles.routeIconCol}>
            <View style={styles.dotBlue} />
            <View style={styles.routeLine} />
            <View style={styles.dotRed} />
          </View>
          <View style={styles.routeAddresses}>
            <View style={styles.addressBlock}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>{pickup?.address}</Text>
            </View>
            <View style={[styles.addressBlock, { marginTop: verticalScale(10) }]}>
              <Text style={styles.routeLabel}>DROP OFF</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>{drop?.address}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── META CHIPS ── */}
      {!isAccepted && (
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipLabel}>📍 Distance</Text>
            <Text style={styles.metaChipValue}>{distance || '—'}</Text>
          </View>
          {isCab ? (
            passengerName ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>👤 Passenger</Text>
                <Text style={styles.metaChipValue} numberOfLines={1}>{passengerName}</Text>
              </View>
            ) : null
          ) : (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>⚖️ Weight</Text>
              <Text style={styles.metaChipValue}>{weight} {weightUnit}</Text>
            </View>
          )}
          {!isCab && itemName ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>📦 Item</Text>
              <Text style={styles.metaChipValue} numberOfLines={1}>{itemName}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── ACCEPTED PRICE BAR ── */}
      {isAccepted && (
        <View style={styles.priceBar}>
          <Text style={styles.priceBarLabel}>Total Fare</Text>
          <Text style={styles.priceBarValue}>${price ?? '—'}</Text>
        </View>
      )}

      {/* ── QUOTE BOX (BOOKING_REQUESTED) ── */}
      {status === 'BOOKING_REQUESTED' && (
        <View style={styles.quoteBox}>
          <View style={styles.quoteItem}>
            <Text style={styles.quoteLabel}>Your Quote</Text>
            <Text style={styles.quoteValue}>${price ?? '—'}</Text>
          </View>
          <View style={styles.quoteDivider} />
          <View style={styles.quoteItem}>
            <Text style={styles.quoteLabel}>ETA</Text>
            <Text style={styles.quoteValue}>{estimatedTime ? `${estimatedTime} min` : '—'}</Text>
          </View>
        </View>
      )}

      {/* ── ACTIONS ── */}
      {!disableActions && status === 'PENDING' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.ignoreBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.ignoreText}>{isCab ? 'Ignore' : 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={isCab ? handleAcceptDelivery : onSendQuote}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptBtnText}>{isCab ? 'Accept Ride' : 'Send Quote'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'BOOKING_REQUESTED' && (
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptDelivery} activeOpacity={0.8}>
          <Text style={styles.acceptBtnText}>Accept Delivery</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  cardAccepted: {
    borderColor: '#C8E6C9',
    borderWidth: 1.5,
  },

  // top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(20),
    gap: scale(5),
  },
  serviceDot: { width: 7, height: 7, borderRadius: 4 },
  serviceLabel: { fontSize: fontScale(11), fontFamily: 'Rubik-SemiBold', letterSpacing: 0.5 },
  orderId: { fontSize: fontScale(11), fontFamily: 'Rubik-Regular', color: '#9CA3AF' },

  // header
  header: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  avatarWrap: { position: 'relative' },
  avatar: { width: scale(46), height: scale(46), borderRadius: scale(23), backgroundColor: '#EEE' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  nameBlock: { flex: 1 },
  name: { fontSize: fontScale(15), fontFamily: 'Rubik-SemiBold', color: '#111827' },
  time: { fontSize: fontScale(12), fontFamily: 'Rubik-Regular', color: '#9CA3AF', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: scale(10), paddingVertical: scale(5),
    borderRadius: scale(20),
  },
  statusText: { fontSize: fontScale(11), fontFamily: 'Rubik-SemiBold' },

  // divider
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: scale(12) },

  // route
  routeBlock: { paddingHorizontal: scale(2) },
  routeRow: { flexDirection: 'row', gap: scale(12) },
  routeIconCol: { alignItems: 'center', paddingTop: scale(4), width: 14 },
  dotBlue: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#BFDBFE' },
  routeLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3, minHeight: scale(24) },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FECACA' },
  routeAddresses: { flex: 1 },
  addressBlock: {},
  routeLabel: { fontSize: fontScale(10), fontFamily: 'Rubik-SemiBold', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 2 },
  routeAddress: { fontSize: fontScale(13), fontFamily: 'Rubik-Medium', color: '#1F2937', lineHeight: 18 },

  // meta chips
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: scale(8),
    marginTop: scale(14),
  },
  metaChip: {
    backgroundColor: '#F9FAFB', borderRadius: scale(10),
    paddingHorizontal: scale(12), paddingVertical: scale(8),
    borderWidth: 1, borderColor: '#F0F0F5', minWidth: scale(90),
  },
  metaChipLabel: { fontSize: fontScale(10), fontFamily: 'Rubik-Regular', color: '#9CA3AF', marginBottom: 2 },
  metaChipValue: { fontSize: fontScale(13), fontFamily: 'Rubik-SemiBold', color: '#374151' },

  // price bar (accepted)
  priceBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: scale(10),
    paddingHorizontal: scale(14), paddingVertical: scale(10),
    marginTop: scale(12), borderWidth: 1, borderColor: '#BBF7D0',
  },
  priceBarLabel: { fontSize: fontScale(13), fontFamily: 'Rubik-Regular', color: '#166534' },
  priceBarValue: { fontSize: fontScale(18), fontFamily: 'Rubik-Bold', color: '#15803D' },

  // quote box
  quoteBox: {
    flexDirection: 'row', backgroundColor: '#FFFBEB',
    borderRadius: scale(10), marginTop: scale(12),
    borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden',
  },
  quoteItem: { flex: 1, alignItems: 'center', paddingVertical: scale(10) },
  quoteDivider: { width: 1, backgroundColor: '#FDE68A' },
  quoteLabel: { fontSize: fontScale(11), fontFamily: 'Rubik-Regular', color: '#92400E', marginBottom: 3 },
  quoteValue: { fontSize: fontScale(16), fontFamily: 'Rubik-Bold', color: '#B45309' },

  // actions
  actionRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(14) },
  ignoreBtn: {
    flex: 1, height: scale(46), borderRadius: scale(12),
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  ignoreText: { fontSize: fontScale(14), fontFamily: 'Rubik-Medium', color: '#6B7280' },
  acceptBtn: {
    flex: 1, height: scale(46), borderRadius: scale(12),
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: scale(4),
  },
  acceptBtnText: { fontSize: fontScale(14), fontFamily: 'Rubik-SemiBold', color: '#FFFFFF' },
});
