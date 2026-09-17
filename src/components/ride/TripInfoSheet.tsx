import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CallSvg from '../../assets/svg/Icon.svg';
import ChatSvgCode from '../../assets/svg/ChatSvgCode';
import NavigateSvgCode from '../../assets/svg/NavigateSvgCode';
import { BlueLocation, RedLocation } from '../../utils/config';
import { Colors } from '../../constants/Colors';
import { fontScale, scale } from '../../utils/scaling';

interface Props {
  pickup: { address?: string; time?: string };
  drop: { address?: string };
  orderTitle: string;
  orderInstruction: string;
  orderNumber?: string | null;
  customerName?: string;
  earning: number;
  tripStatus: string;
  isFoodOrder?: boolean;
  foodOrderStatus?: string;
  buttonText: string;
  isCancellable: boolean;
  onStatusPress: () => void;
  onCancel: () => void;
  onChat: () => void;
  onCall: () => void;
  onNavigate: () => void;
}

export default function TripInfoSheet({
  pickup, drop, orderTitle, orderInstruction, orderNumber, customerName,
  earning, buttonText, isCancellable, isFoodOrder, foodOrderStatus,
  onStatusPress, onCancel, onChat, onCall, onNavigate,
}: Props) {
  // Food order: before pickup show restaurant as destination, after show delivery address
  const pickupLabel = isFoodOrder
    ? foodOrderStatus === 'out_for_delivery' ? 'Picked Up From' : 'Go to Restaurant'
    : 'Pickup';
  const dropLabel = isFoodOrder ? 'Deliver To' : 'Delivery';
  const showDropSection = isFoodOrder ? foodOrderStatus === 'out_for_delivery' : true;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Location Card */}
      <View style={styles.card}>
        {/* Order number + customer */}
        {(orderNumber || customerName) && (
          <View style={[styles.rowBetween, { marginBottom: scale(12) }]}>
            {customerName ? <Text style={styles.customerName}>{customerName}</Text> : <View />}
            {orderNumber ? <Text style={styles.orderNumber}>#{orderNumber}</Text> : null}
          </View>
        )}
        {/* Pickup row */}
        <View style={styles.rowBetween}>
          <View style={styles.rowFlex}>
            <BlueLocation />
            <View style={styles.addressWrap}>
              <Text style={styles.label}>{pickupLabel}</Text>
              <Text style={styles.address}>{pickup.address || 'N/A'}</Text>
            </View>
          </View>
          {!!pickup.time && <Text style={styles.time}>{pickup.time}</Text>}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.chatBtn} onPress={onChat}>
            <Text style={styles.chatText}>Chat</Text>
            <ChatSvgCode />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onCall}>
            <CallSvg />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { transform: [{ rotate: '35deg' }] }]} onPress={onNavigate}>
            <NavigateSvgCode height={30} width={20} />
          </TouchableOpacity>
        </View>

        {/* Divider + Drop row — only show when delivering */}
        {showDropSection && (
          <>
            <View style={styles.divider} />
            <View style={styles.rowFlex}>
              <RedLocation />
              <View style={styles.addressWrap}>
                <Text style={styles.label}>{dropLabel}</Text>
                <Text style={styles.address}>{drop.address || 'N/A'}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Trip Details */}
      <Text style={styles.sectionTitle}>Trip Details</Text>
      <View style={styles.card}>
        <Text style={styles.detailLabel}>Order</Text>
        <Text style={styles.detailValue}>{orderTitle}</Text>
        <View style={styles.divider} />
        <Text style={styles.detailLabel}>Instruction</Text>
        <Text style={styles.detailValue}>{orderInstruction}</Text>
      </View>

      {/* Earning */}
      <View style={[styles.card, styles.earningRow]}>
        <Text style={styles.earningLabel}>Earning</Text>
        <Text style={styles.earningAmount}>${earning.toFixed(2)}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.statusBtn} onPress={onStatusPress}>
          <Text style={styles.statusBtnText}>{buttonText}</Text>
        </TouchableOpacity>
        {isCancellable && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.bg },
  content: { padding: scale(16), paddingBottom: scale(40) },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: scale(14),
    padding: scale(16),
    marginBottom: scale(12),
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowFlex: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addressWrap: { marginLeft: scale(10), flex: 1 },
  label: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.text },
  address: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.textMuted, marginTop: 2 },
  time: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.gray },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: scale(14) },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    backgroundColor: Colors.primaryDark, paddingHorizontal: scale(24),
    height: scale(44), borderRadius: scale(10),
  },
  chatText: { color: Colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13) },
  iconBtn: { width: scale(48), height: scale(48), justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: scale(12) },
  customerName: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.text },
  orderNumber: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.textMuted },
  sectionTitle: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15), color: Colors.text, marginBottom: scale(8) },
  detailLabel: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.text },
  detailValue: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.textMuted, marginTop: 2 },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningLabel: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.text },
  earningAmount: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(16), color: Colors.success },
  btnRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(8) },
  statusBtn: {
    flex: 1, backgroundColor: Colors.primaryDark,
    height: scale(52), borderRadius: scale(12),
    justifyContent: 'center', alignItems: 'center',
  },
  statusBtnText: { color: Colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15) },
  cancelBtn: {
    backgroundColor: Colors.surfaceMuted, height: scale(52),
    paddingHorizontal: scale(20), borderRadius: scale(12),
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { color: Colors.text, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14) },
});
