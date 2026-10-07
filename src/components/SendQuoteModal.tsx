import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { scale, fontScale, verticalScale } from '../utils/scaling';
import Toast from 'react-native-toast-message';
import { AppEvents, EVENTS } from '../utils/events';
import { api } from '../services/apiClient';

interface SendQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  orderMongoId: string;
  orderDetails: {
    distance?: string;
    weight?: string | number;
    itemName?: string;
    weightUnit?: string;
  };
  defaultPrice?: number;
  alreadySent: boolean;
  onQuoteSuccess: (orderId: string) => void;
}

const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
  visible,
  onClose,
  orderMongoId,
  orderDetails,
  defaultPrice,
  alreadySent,
  onQuoteSuccess,
}) => {
  const [fare, setFare] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
console.log(orderDetails)
  useEffect(() => {
    if (visible && defaultPrice) {
      setFare(defaultPrice.toString());
    }
  }, [visible, defaultPrice]);

  const handleSendQuote = async () => {
    if (!fare || parseFloat(fare) <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid fare' });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/driver/parcel-requests/${orderMongoId}/send-quote`, {
        price: parseFloat(fare),
      });
      
      Toast.show({ type: 'success', text1: 'Quote sent successfully!' });
      onQuoteSuccess(orderMongoId);
      AppEvents.emit(EVENTS.REFRESH_ORDERS);
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to send quote';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* ── drag handle ── */}
          <View style={styles.handle} />

          {/* ── header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Send Quote</Text>
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
            keyboardShouldPersistTaps="handled"
          >
            {/* ── order details section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ORDER DETAILS</Text>
              {orderDetails.distance && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Distance</Text>
                  <Text style={styles.value}>{orderDetails.distance}</Text>
                </View>
              )}
              {orderDetails.weight && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Weight</Text>
                  <Text style={styles.value}>
                    {typeof orderDetails.weight === 'number'
                      ? `${orderDetails.weight} ${orderDetails.weightUnit || 'kg'}`
                      : orderDetails.weight}
                  </Text>
                </View>
              )}
              {orderDetails.itemName && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Items</Text>
                  <Text style={styles.value}>{orderDetails.itemName}</Text>
                </View>
              )}
            </View>

            {/* ── fare input section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>YOUR FARE</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>BND</Text>
                <TextInput
                  style={styles.fareInput}
                  value={fare}
                  onChangeText={setFare}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* ── spacer ── */}
            <View style={{ height: verticalScale(80) }} />
          </ScrollView>

          {/* ── action buttons ── */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (isSubmitting || alreadySent) && { opacity: 0.6 },
              ]}
              onPress={handleSendQuote}
              disabled={isSubmitting || alreadySent}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {alreadySent
                  ? 'Quote Sent'
                  : isSubmitting
                  ? 'Sending...'
                  : 'Send Quote'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '85%',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-SemiBold',
    color: '#111827',
  },
  closeBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: fontScale(13),
    color: '#6B7280',
    fontFamily: 'Rubik-Medium',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  section: {
    marginBottom: verticalScale(20),
    backgroundColor: '#FAFAFA',
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  sectionTitle: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-SemiBold',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: verticalScale(10),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
  },
  value: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-SemiBold',
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-SemiBold',
    color: '#111827',
    marginRight: scale(8),
  },
  fareInput: {
    flex: 1,
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Medium',
    color: '#111827',
    padding: 0,
  },
  actionBar: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    height: scale(50),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#6B7280',
  },
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
  primaryBtnText: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
  },
});

export default SendQuoteModal;
