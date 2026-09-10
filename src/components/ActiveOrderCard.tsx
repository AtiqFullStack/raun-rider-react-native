import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { fontScale, scale } from '../utils/scaling';

interface ActiveOrderCardProps {
  orderId: string;           // readable order number
  serviceType?: string;      // "food" | "CAB" | "parcel"
  customerName: string;
  pickupAddress: string;
  dropAddress: string;
  distance?: string;
  totalAmount?: number | string;
  currency?: string;
  orderStatus: string;       // "confirmed" | "preparing" | "ready" | "out_for_delivery" | "IN_PROGRESS" etc.
  paymentStatus?: string;
  createdAt: string;
  onPress: () => void;       // opens OrderDetailModal
  onGoToTrip: () => void;    // navigates to RideDetails
}

const STATUS_DISPLAY: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  confirmed:        { label: 'Confirmed',        bg: '#EAF1FF', color: '#2563EB', dot: '#2563EB' },
  preparing:        { label: 'Preparing',        bg: '#FFF6DF', color: '#D97706', dot: '#D97706' },
  ready:            { label: 'Ready for Pickup', bg: '#E7F7F0', color: '#078C62', dot: '#078C62' },
  out_for_delivery: { label: 'Out for Delivery', bg: '#E7F7F0', color: '#078C62', dot: '#22C55E' },
  IN_PROGRESS:      { label: 'In Progress',      bg: '#E7F7F0', color: '#078C62', dot: '#22C55E' },
  ACCEPTED:         { label: 'Accepted',         bg: '#EAF1FF', color: '#2563EB', dot: '#2563EB' },
  accepted:         { label: 'Accepted',         bg: '#EAF1FF', color: '#2563EB', dot: '#2563EB' },
};
const DEFAULT_STATUS = { label: 'Active', bg: '#EAF1FF', color: '#2563EB', dot: '#2563EB' };

const SERVICE_EMOJI: Record<string, string> = {
  food: '🍔', FOOD: '🍔',
  CAB: '🚖',
  parcel: '📦', PARCEL: '📦',
};

function timeAgo(dateStr: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActiveOrderCard({
  orderId,
  serviceType,
  customerName,
  pickupAddress,
  dropAddress,
  distance,
  totalAmount,
  currency = 'BND',
  orderStatus,
  paymentStatus,
  createdAt,
  onPress,
  onGoToTrip,
}: ActiveOrderCardProps) {
  const st = STATUS_DISPLAY[orderStatus] || DEFAULT_STATUS;
  const emoji = SERVICE_EMOJI[serviceType ?? ''] || '🛵';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}
    >
      {/* ── green top accent strip ── */}
      <View style={styles.accentStrip} />

      <View style={styles.inner}>
        {/* ── header row ── */}
        <View style={styles.headerRow}>
          <View style={styles.emojiBox}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
            <Text style={styles.orderId} numberOfLines={1}>{orderId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

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

        {/* ── meta row ── */}
        <View style={styles.metaRow}>
          {!!distance && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📍 {distance}</Text>
            </View>
          )}
          {!!paymentStatus && (
            <View style={[
              styles.metaChip,
              paymentStatus === 'paid' && styles.metaChipPaid,
            ]}>
              <Text style={[
                styles.metaChipText,
                paymentStatus === 'paid' && styles.metaChipPaidText,
              ]}>
                {paymentStatus === 'paid' ? '✓ Paid' : `💳 ${paymentStatus}`}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {totalAmount !== undefined && totalAmount !== null && (
            <Text style={styles.fare}>
              {currency} {Number(totalAmount).toFixed(2)}
            </Text>
          )}
        </View>

        {/* ── action buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tripBtn}
            onPress={onGoToTrip}
            activeOpacity={0.8}
          >
            <Text style={styles.tripBtnText}>Go to Trip →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#078C62',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  accentStrip: {
    height: scale(4),
    backgroundColor: Colors.green,
  },
  inner: {
    padding: scale(14),
  },

  // header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  emojiBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: Colors.lightgreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: fontScale(20) },
  headerTexts: { flex: 1 },
  customerName: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
  },
  orderId: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(9),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    gap: scale(5),
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: fontScale(11), fontFamily: 'Rubik-SemiBold' },

  // divider
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: scale(12) },

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

  // meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: scale(12),
  },
  metaChip: {
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  metaChipPaid: {
    backgroundColor: Colors.lightgreen,
    borderColor: '#A7F3D0',
  },
  metaChipText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Medium',
    color: '#374151',
  },
  metaChipPaidText: {
    color: Colors.green,
  },
  fare: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Bold',
    color: Colors.green,
  },

  // actions
  actionsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(14),
  },
  detailsBtn: {
    flex: 1,
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsBtnText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
  },
  tripBtn: {
    flex: 2,
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  tripBtnText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.white,
  },
});
