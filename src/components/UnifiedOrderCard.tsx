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

interface UnifiedOrderCardProps {
  // ── Shared fields ──
  _id: string;
  _orderType: 'food' | 'parcel';  // discriminator
  totalAmount?: number | string;
  currency?: string;
  createdAt: string;
  distance?: string;
  pickup?: { lat?: number; lng?: number; address?: string };
  drop?: { lat?: number; lng?: number; address?: string };
  onPress: () => void;

  // ── Food Order fields ──
  orderNumber?: string;
  orderStatus?: string;
  restaurantId?: { name?: string; location?: { address?: string } };
  deliveryAddress?: { formattedAddress?: string };
  items?: any[];
  assignedDriverId?: string;

  // ── Parcel Request fields ──
  loadRequestNumber?: string;
  status?: string;
  pickupLocation?: { address?: string };
  dropoffLocation?: { address?: string };
  sender?: { name?: string; phone?: string; countryCode?: string };
  receiver?: { name?: string };
  loadItems?: any[];
  weight?: { value?: number; unit?: string };

  // ── Callbacks ──
  onAccept?: () => void;
  onIgnore?: () => void;
}

const SERVICE_CONFIG = {
  food:   { label: 'FOOD',   bg: '#FFF3E0', color: '#E65100', dot: '#E65100' },
  parcel: { label: 'PARCEL', bg: '#F3E8FF', color: '#6D28D9', dot: '#6D28D9' },
};

function timeAgo(dateStr: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function UnifiedOrderCard({
  _id,
  _orderType,
  orderNumber,
  orderStatus,
  loadRequestNumber,
  status: parcelStatus,
  restaurantId,
  deliveryAddress,
  items,
  pickupLocation,
  dropoffLocation,
  sender,
  receiver,
  loadItems,
  weight,
  totalAmount,
  currency = 'BND',
  createdAt,
  distance,
  pickup,
  drop,
  onPress,
  onAccept,
  onIgnore,
  assignedDriverId,
}: UnifiedOrderCardProps) {
  const [actionLoading, setActionLoading] = React.useState<'accept' | 'ignore' | null>(null);
  const isFoodOrder = _orderType === 'food';
  const isParcelRequest = _orderType === 'parcel';
  
  const svc = SERVICE_CONFIG[_orderType];
  const trackingNo = isFoodOrder ? orderNumber : loadRequestNumber;
  const currentStatus = isFoodOrder ? orderStatus : parcelStatus;

  // ── Format display data based on type ──
  const personName = isFoodOrder ? restaurantId?.name : sender?.name;

  // ── Item summary ──
  const getItemSummary = () => {
    if (isFoodOrder && items?.length) {
      const count = items.length;
      const extra = items.reduce((sum, item) => sum + (item.quantity || 0), 0) - count;
      return `${count}x item${count > 1 ? 's' : ''}${extra > 0 ? ` +${extra}` : ''}`;
    }
    if (isParcelRequest && loadItems?.length) {
      if (weight?.value) return `${weight.value} ${weight.unit}`;
      return `${loadItems.length}x item${loadItems.length > 1 ? 's' : ''}`;
    }
    return undefined;
  };

  // ── Action handlers ──
  const handleAccept = async () => {
    if (!_id) { Toast.show({ type: 'error', text1: 'Order ID missing' }); return; }
    
    // For parcel: just open detail modal (quote will be handled there)
    if (isParcelRequest) {
      onPress();
      return;
    }

    // For food: accept the order
    try {
      setActionLoading('accept');
      await api.patch(`/driver/food-orders/${_id}/accept`);
      Toast.show({ type: 'success', text1: 'Order accepted!' });
      onAccept?.();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to accept';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async () => {
    if (!_id) { onIgnore?.(); return; }
    try {
      setActionLoading('ignore');
      if (isFoodOrder) {
        await api.patch(`/driver/food-orders/${_id}/reject`);
      } else {
        // For parcel: similar reject endpoint
        await api.post(`/driver/parcel-requests/${_id}/reject`, {});
      }
      onIgnore?.();
    } catch {
      // Silently remove from list even if reject fails
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
      {/* ── Top row: service badge + tracking # + time ── */}
      <View style={styles.topRow}>
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.dot, { backgroundColor: svc.dot }]} />
          <Text style={[styles.serviceLabel, { color: svc.color }]}>{svc.label}</Text>
        </View>
        <Text style={styles.trackingNo} numberOfLines={1}>{trackingNo}</Text>
        <Text style={styles.timeText}>{timeAgo(createdAt)}</Text>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Route section ── */}
      <View style={styles.routeRow}>
        <View style={styles.routeIconCol}>
          <View style={styles.dotBlue} />
          <View style={styles.routeLine} />
          <View style={styles.dotRed} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeAddress} numberOfLines={1}>
            {pickup?.address || pickupLocation?.address || '—'}
          </Text>
          <View style={{ height: scale(8) }} />
          <Text style={styles.routeLabel}>DROP OFF</Text>
          <Text style={styles.routeAddress} numberOfLines={1}>
            {drop?.address || dropoffLocation?.address || '—'}
          </Text>
        </View>
      </View>

      {/* ── Meta chips row (includes distance if available) ── */}
      <View style={styles.chipsRow}>
        {/* Show person name ONLY for food or if parcel is converted to order */}
        {(isFoodOrder || (isParcelRequest && parcelStatus === 'converted_to_order')) && personName && (
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>{isFoodOrder ? '🍽️' : '👤'}</Text>
            <Text style={styles.chipValue} numberOfLines={1}>{personName}</Text>
          </View>
        )}
        {getItemSummary() && (
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>📦</Text>
            <Text style={styles.chipValue}>{getItemSummary()}</Text>
          </View>
        )}
        {distance && (
          <View style={[styles.chip, styles.distanceChip]}>
            <Text style={styles.chipEmoji}>📍</Text>
            <Text style={styles.chipValue}>{distance}</Text>
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

      {/* ── Status badge (optional) ── */}
      {currentStatus && (
        <View style={styles.statusBadgeRow}>
          <Text style={styles.statusBadgeText}>
            Status: <Text style={styles.statusBadgeValue}>{currentStatus}</Text>
          </Text>
        </View>
      )}

      {/* ── Action buttons ── */}
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
            {actionLoading === 'accept'
              ? isFoodOrder ? 'Accepting…' : 'Sending Quote…'
              : isFoodOrder ? 'Accept' : 'Send Quote'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
  trackingNo: {
    flex: 1,
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: '#9CA3AF',
  },
  timeText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: '#9CA3AF',
  },

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
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  routeAddress: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Medium',
    color: '#111827',
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
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  priceChipText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Bold',
    color: '#15803D',
  },

  // distance chip variant
  distanceChip: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },

  // status badge
  statusBadgeRow: {
    marginTop: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
  },
  statusBadgeValue: {
    fontFamily: 'Rubik-SemiBold',
    color: '#374151',
  },

  // action buttons
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
