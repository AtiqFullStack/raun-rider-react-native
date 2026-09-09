import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import useAxios from '../hooks/useAxios'; // adjust path if needed
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { scale, fontScale, verticalScale } from '../utils/scaling';

import Toast from 'react-native-toast-message';
import { AppEvents, EVENTS } from '../utils/events';

interface SendQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  orderMongoId: string; // 👈 THIS IS IMPORTANT
  orderDetails: {
    distance: string;
    weight: string | number;
    itemName?: string;
    weightUnit:string;
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
  const [yourPrice, setYourPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const { fetchData, setToken } = useAxios();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [quoteSent, setQuoteSent] = useState(false);
  const [commission, setCommission] = useState<number>(0);

  const numericPrice = parseFloat(yourPrice) || 0;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appFee = (numericPrice * commission) / 100;

const customerTotalPay = numericPrice + appFee;


  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }
    };

    if (visible) {
      loadToken();
      if (defaultPrice) {
        setYourPrice(defaultPrice.toString());
      }
    }
  }, [visible, defaultPrice, setToken]);

  useEffect(() => {
    const loadTokenAndCommission = async () => {
      const storedToken = await AsyncStorage.getItem('token');

      if (storedToken) {
        setToken(storedToken);
      }

      try {
        const res = await fetchData({
          method: 'GET',
          url: '/admin/auth/getCommissionRate',
        });

        if (res?.data?.customerPercentage !== undefined) {
          setCommission(res.data.customerPercentage);
        }
      } catch (error) {
        console.log('Commission fetch error:', error);
      }
    };

    if (visible) {
      loadTokenAndCommission();

      if (defaultPrice) {
        setYourPrice(defaultPrice.toString());
      }
    }
  }, [visible, defaultPrice, fetchData, setToken]);

  useEffect(() => {
    console.log('SendQuoteModal mounted with orderMongoId:', orderMongoId);
  }, [orderMongoId]);

  const sendQuoteApi = async () => {
    if (!yourPrice || !estimatedTime) {
      setErrorMessage('Please enter price and ETA');
      return;
    }

    const price = parseFloat(yourPrice);
    const eta = parseInt(estimatedTime, 10);

    if (isNaN(price) || price <= 0) {
      setErrorMessage('Enter a valid price greater than 0');
    }

    if (isNaN(eta) || eta <= 0) {
      setErrorMessage('Enter a valid ETA in minutes');
    }

    const payload = {
      orderId: orderMongoId,
      price: Number(numericPrice.toFixed(2)),
      eta: estimatedTime,
    };
    console.log("send quote payload",payload)

    try {
      setIsSubmitting(true);

      const response = await fetchData({
        method: 'POST',
        url: '/user/order/send/quote',
        data: payload,
      });

      Toast.show({
        type: 'success',
        text1: response?.message || 'Quote sent successfully',
      });
      onQuoteSuccess(orderMongoId);
      AppEvents.emit(EVENTS.REFRESH_ORDERS); // 🔥
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>SEND QUOTE FOR DELIVERY </Text>

                {/* <Cross onPress={dismiss()} /> */}
              </View>
              {/* Order Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>DISTANCE:</Text>
                  <Text style={styles.detailValue}>{orderDetails.distance}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>WEIGHT:</Text>
                  <Text style={styles.detailValue}>
                    {typeof orderDetails.weight === 'number'
                      ? `${orderDetails.weight} ${orderDetails.weightUnit}`
                      : orderDetails.weight}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Price Input */}
              <View style={styles.priceSection}>
                <Text style={styles.sectionTitle}>Your Price</Text>
                <View style={styles.priceInputContainer}>
                  <TextInput
                    style={styles.priceInput}
                    value={yourPrice}
                    onChangeText={text => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      setYourPrice(cleaned);
                    }}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.Textgray}
                  />
                </View>
              </View>

              {/* Calculation Section */}
              <View style={styles.calculationSection}>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Your Price:</Text>
                  <Text style={styles.calculationValue}>${numericPrice}</Text>
                </View>

                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>
                    App Usage Fee ({commission}%)
                  </Text>
                  <Text style={[styles.calculationValue, styles.feeText]}>
                    ${appFee}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={[styles.calculationRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Customer Pays</Text>
                  <Text style={styles.totalValue}>
                    ${customerTotalPay.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Estimated Time Input */}
              <View style={styles.timeSection}>
                <Text style={styles.feeNote}>
                  The total amount includes the App Usage Fee to be paid to you
                  by the Customer, and will be deducted from your Retainer
                  Deposit with the App.
                </Text>
                <Text style={styles.sectionTitle}>Estimated Time (minutes)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={estimatedTime}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setEstimatedTime(cleaned);
                  }}
                  placeholder="Enter estimated minutes"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.Textgray}
                />
              </View>
              {errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    (isSubmitting || alreadySent) && styles.disabledButton,
                  ]}
                  onPress={sendQuoteApi}
                  disabled={isSubmitting || alreadySent}
                >
                  <Text style={styles.submitButtonText}>
                    {alreadySent
                      ? 'Quote Sent'
                      : isSubmitting
                      ? 'Sending...'
                      : 'Send Quote'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: scale(16),
    width: '90%',
    maxHeight: '85%',
    paddingVertical: scale(5),
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(32),
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: scale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    // textAlign: 'flex-start',
  },
  detailsSection: {
    backgroundColor: Colors.quoteBg,
    borderRadius: scale(10),
    padding: scale(15),
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: scale(10),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  detailLabel: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: Colors.black1,
  },
  detailValue: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    marginHorizontal: verticalScale(5),
    color: Colors.Textgray,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray,
    marginVertical: scale(15),
    borderStyle: 'dashed',
    borderWidth: 0.9,
    borderColor: Colors.Textgray,
  },
  priceSection: {
    marginBottom: scale(20),
  },
  sectionTitle: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.black,
    marginBottom: scale(5),
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderColor2,
    borderRadius: scale(8),
    paddingHorizontal: scale(15),
    paddingVertical: scale(8),
    marginBottom: scale(8),
  },
  currencySymbol: {
    fontSize: fontScale(20),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
    marginRight: scale(5),
  },
  priceInput: {
    flex: 1,
    fontSize: fontScale(20),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    padding: 0,
  },
  priceNote: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    textAlign: 'center',
  },
  calculationSection: {
    backgroundColor: Colors.quoteBg,
    borderRadius: scale(10),
    padding: scale(15),
    marginBottom: scale(20),
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  calculationLabel: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Regular',
    color: Colors.black1,
  },
  calculationValue: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Regular',
    color: Colors.black,
  },
  feeText: {
    fontSize: fontScale(15),
    color: Colors.black,
  },
  totalRow: {
    marginTop: scale(10),
  },
  totalLabel: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Regular',
    color: Colors.black,
  },
  totalValue: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
  },
  feeNote: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    marginBottom: scale(15),
    lineHeight: scale(16),
  },
  timeSection: {
    marginBottom: scale(25),
  },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: scale(8),
    paddingHorizontal: scale(15),
    paddingVertical: scale(12),
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(15),
  },
  button: {
    flex: 1,
    paddingVertical: scale(15),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.quoteBg,
  },
  errorText: {
  color: '#D32F2F',
  fontSize: fontScale(14),
  fontFamily: 'Rubik-Regular',
  marginBottom: scale(10),
  textAlign: 'center',
},
  cancelButtonText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.black,
  },
  submitButton: {
    backgroundColor: Colors.secondaryDark,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: Colors.white,
  },
});

export default SendQuoteModal;
