import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { fontScale, scale } from '../utils/scaling';
import { api } from '../services/apiClient';
import Toast from 'react-native-toast-message';

interface NewOrderCardProps {
  orderId: string;          // readable order number e.g. "R-FD-MTR96TE3"
  orderMongoId?: string;    // actual _id for API calls
  serviceType?: string;     // "food" | "CAB" | "parcel" etc.
  serviceName?: string;     // human-readable name from serviceId.name e.g. "Food Delivery"
  customerName: string;
  pickupAddress: string;
  dropAddress: string;
  distance?: string;
  itemSummary?: string;     // "1x pizza +2" or weight label for parcels
  totalAmount?: number | string;
  currency?: string;
  createdAt: string;
  status?: 'PENDING' | 'QUOTE_SENT' | 'BOOKING_REQUESTED';
  onPress: () => void;
  onAccept?: () => void;    // called after successful accept
  onIgnore?: () => void;    // called after ignore
}

const SERVICE_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  food:   { label: 'FOOD',   bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
  FOOD:   { label: 'FOOD',   bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
  CAB:    { label: 'CAB',    bg: '#E8F4FD', color: '#1565C0', dot: '#1565C0' },
  parcel: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
  PARCEL: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
};
const DEFAULT_SVC = { label: 'ORDER', bg: '#F3F4F6', color: '#374151', dot: '#374151' };

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:           { label: 'New',          bg: '#FFF0EB', color: '#E85D04' },
  QUOTE_SENT:        { label: 'Quote Sent',   bg: '#E3F2FD', color: '#1565C0' },
  BOOKING_REQUESTED: { label: 'Booking Req.', bg: '#FFF8E1', color: '#F57F17' },
};

function timeAgo(dateStr: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewOrderCard({
  orderId,
  orderMongoId,
  serviceType,
  serviceName,
  customerName,
  pickupAddress,
  dropAddress,
  distance,
  itemSummary,
  totalAmount,
  currency = 'BND',
  createdAt,
  status = 'PENDING',
  onPress,
  onAccept,
  onIgnore,
}: NewOrderCardProps) {
  const [actionLoading, setActionLoading] = React.useState<'accept' | 'ignore' | null>(null);
  const svc = SERVICE_CONFIG[serviceType ?? ''] || DEFAULT_SVC;
  const badgeLabel = serviceName || svc.label;
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const isFoodOrder = serviceType === 'food' || serviceType === 'FOOD';

  const handleAccept = async () => {
    if (!orderMongoId) { Toast.show({ type: 'error', text1: 'Order ID missing' }); return; }
    try {
      setActionLoading('accept');
      await api.patch(`/driver/food-orders/${orderMongoId}/accept`);
      Toast.show({ type: 'success', text1: 'Order accepted!' });
      onAccept?.();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to accept order';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async () => {
    if (!orderMongoId) { onIgnore?.(); return; }
    try {
      setActionLoading('ignore');
      await api.patch(`/driver/food-orders/${orderMongoId}/reject`);
      onIgnore?.();
    } catch {
      // silently remove from list even if reject fails
      onIgnore?.();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}
    >
      {/* ── top row: service badge + order id + time ── */}
      <View style={styles.topRow}>
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.dot, { backgroundColor: svc.dot }]} />
          <Text style={[styles.serviceLabel, { color: svc.color }]}>{badgeLabel}</Text>
        </View>
        <Text style={styles.orderId} numberOfLines={1}>{orderId}</Text>
        <Text style={styles.timeText}>{timeAgo(createdAt)}</Text>
      </View>

      {/* ── customer name + status ── */}
      {/* <View style={styles.nameRow}>
        <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View> */}

      {/* ── divider ── */}
      <View style={styles.divider} />

      {/* ── route ── */}
      <View style={styles.routeRow}>
        <View style={styles.routeIconCol}>
          <View style={styles.dotBlue} />
          <View style={styles.routeLine} />
          <View style={styles.dotRed} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeAddress} numberOfLines={1}>{pickupAddress || '—'}</Text>
          <View style={{ height: scale(8) }} />
          <Text style={styles.routeLabel}>DROP OFF</Text>
          <Text style={styles.routeAddress} numberOfLines={1}>{dropAddress || '—'}</Text>
        </View>
      </View>

      {/* ── chips row ── */}
      <View style={styles.chipsRow}>
        {!!distance && (
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>📍</Text>
            <Text style={styles.chipValue}>{distance}</Text>
          </View>
        )}
        {!!itemSummary && (
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>📦</Text>
            <Text style={styles.chipValue} numberOfLines={1}>{itemSummary}</Text>
          </View>
        )}
        {totalAmount !== undefined && totalAmount !== null && (
          <View style={[styles.chip, styles.priceChip]}>
            <Text style={styles.priceChipText}>
              {currency} {Number(totalAmount).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* ── tap hint / action buttons ── */}
      {isFoodOrder ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.ignoreBtn}
            onPress={handleIgnore}
            disabled={actionLoading !== null}
            activeOpacity={0.7}
          >
            <Text style={styles.ignoreText}>
              {actionLoading === 'ignore' ? 'Ignoring…' : 'Ignore'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, actionLoading !== null && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={actionLoading !== null}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptBtnText}>
              {actionLoading === 'accept' ? 'Accepting…' : 'Accept'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap to view details & accept →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#F0F0F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  // top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
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
  orderId: {
    flex: 1,
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  timeText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },

  // name row
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  customerName: {
    flex: 1,
    fontSize: fontScale(15),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    marginRight: scale(8),
  },
  statusBadge: {
    paddingHorizontal: scale(9),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  statusText: { fontSize: fontScale(11), fontFamily: 'Rubik-SemiBold' },

  // divider
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: scale(10) },

  // route
  routeRow: { flexDirection: 'row', gap: scale(10) },
  routeIconCol: { alignItems: 'center', paddingTop: scale(3), width: 12 },
  dotBlue: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#BFDBFE',
  },
  routeLine: {
    width: 2, flex: 1, backgroundColor: '#E5E7EB',
    marginVertical: 3, minHeight: scale(20),
  },
  dotRed: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FECACA',
  },
  routeTexts: { flex: 1 },
  routeLabel: {
    fontSize: fontScale(9),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.Textgray,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  routeAddress: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
  },

  // chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: scale(12),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: '#F0F0F5',
    gap: scale(4),
  },
  chipEmoji: { fontSize: fontScale(12) },
  chipValue: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-SemiBold',
    color: '#374151',
    maxWidth: scale(120),
  },
  priceChip: {
    backgroundColor: Colors.lightgreen,
    borderColor: '#A7F3D0',
  },
  priceChipText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Bold',
    color: Colors.green,
  },

  // tap hint
  tapHint: {
    marginTop: scale(10),
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },

  // action buttons (food orders)
  actionRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(14),
  },
  ignoreBtn: {
    flex: 1,
    height: scale(46),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ignoreText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#6B7280',
  },
  acceptBtn: {
    flex: 1,
    height: scale(46),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
  },
});
