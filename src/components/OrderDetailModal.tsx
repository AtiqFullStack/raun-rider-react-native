import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { Colors } from '../constants/Colors';
import { scale, fontScale } from '../utils/scaling';
import useAxios from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { useQuotes } from '../context/QuoteContext';
import { OrderUI } from '../screens/HomeScreen';
import SendQuoteModal from './SendQuoteModal';
import RequestCard from './RequestCard';
import { BASE_URL, IMAGE_URL } from '../utils/config';
import { useNavigation } from '@react-navigation/native';
import { AppEvents, EVENTS } from '../utils/events';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  order: OrderUI;
  onClose: () => void;
  sentQuotes?: string[];
}

export default function OrderDetailModal({
  visible,
  order,
  onClose,
  sentQuotes = [],
}: Props) {
  const { fetchData } = useAxios();
  const { token } = useAuth();
  const { addSentQuote } = useQuotes();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const isCab = order.serviceType === 'CAB';
  const [quoteSent, setQuoteSent] = useState(
    order.isRequested || sentQuotes.includes(order._id),
  );
  useEffect(() => {
    if (visible && order) {
      fetchDetails();
    }
  }, [visible, order]);

  useEffect(() => {
    const subscription = AppEvents.addListener(
      EVENTS.REFRESH_ORDERS,
      fetchDetails,
    );

    return () => subscription.remove();
  }, []);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      const res = await fetchData({
        method: 'GET',
        url: `/user/order/orderDetail/${order._id}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('📦 Order Detail Response:', res.data);
      console.log('Trip ID from response:', res.data?.tripId);
      setOrderDetail(res.data);
    } catch (error) {
      console.log('Detail error', error);
    } finally {
      setLoading(false);
    }
  };
  // console.log('Package details', orderDetail.finalPrice);
  const getStatus = () => {
    if (order.isAccepted) return 'ACCEPTED';

    if (order.isRequested) return 'BOOKING_REQUESTED';

    if (sentQuotes.includes(order._id)) return 'QUOTE_SENT';

    return 'PENDING';
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <RequestCard
              name={order.customerId?.fullName}
              pickup={order.pickup}
              drop={order.drop}
              createdAt={order.createdAt}
              distance={order.distance}
              weight={order.package?.weight}
              weightUnit={order.package?.weightUnit}
              photo={order.customerId?.portraitPhoto}
              estimatedTime={orderDetail?.myQuote?.eta || order.myQuote?.eta}
              itemName={order.package?.itemName}
              status={getStatus()}
              disableActions={true}
              orderId={order._id}
              isCab={isCab}
              passengerName={order.passenger?.name}
              onAcceptDelivery={(tripId) => {
                onClose();
                navigation.navigate('RideDetails', {
                  order: {
                    ...order,
                    tripId,
                    sender: orderDetail?.sender,
                    tripStatus: 'CREATED',
                  },
                });
              }}
              price={
                orderDetail?.finalPrice ||
                orderDetail?.myQuote?.price ||
                order.myQuote?.price ||
                order.price?.totalFare
              }
            />

            {/* CAB: passenger info */}
            {isCab && order.passenger && (
              <View style={styles.contactSection}>
                <View style={styles.contactRow}>
                  <View style={styles.contactBox}>
                    <Text style={styles.label}>Passenger</Text>
                    <Text style={styles.valueBold}>{order.passenger.name}</Text>
                    <Text style={styles.valueBold}>{order.passenger.countryCode} {order.passenger.phone}</Text>
                  </View>
                  {order.price && (
                    <View style={styles.contactBox}>
                      <Text style={styles.label}>Fare</Text>
                      <Text style={styles.valueBold}>${order.price.totalFare}</Text>
                      <Text style={[styles.label, { marginTop: 0 }]}>{order.price.distanceKm} km</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* PARCEL: sender/receiver */}
            {!isCab && (
              <View style={styles.contactSection}>
                <View style={styles.contactRow}>
                  <View style={styles.contactBox}>
                    <Text style={styles.label}>Sender Name</Text>
                    <Text style={styles.valueBold}>{orderDetail?.sender?.name || '-'}</Text>
                    <Text style={styles.valueBold}>{orderDetail?.sender?.phone || '-'}</Text>
                  </View>
                  <View style={styles.contactBox}>
                    <Text style={styles.label}>Receiver Name</Text>
                    <Text style={styles.valueBold}>{orderDetail?.receiver?.name || '-'}</Text>
                    <Text style={styles.valueBold}>{orderDetail?.receiver?.phone || '-'}</Text>
                  </View>
                </View>
              </View>
            )}
           
            {/* PHOTOS - PARCEL only */}
            {!isCab && orderDetail?.package?.photos?.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {orderDetail.package.photos.map((p: any, i: number) => (
                  <View key={i} style={styles.itemRow}>
                    <Image source={{ uri: `${IMAGE_URL}/${p.url}` }} style={styles.itemImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{orderDetail?.package?.itemName || 'Item'}</Text>
                      <Text style={styles.itemDesc}>{p.description || 'No description'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* BUTTONS */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>{isCab ? 'Ignore' : 'Cancel'}</Text>
              </TouchableOpacity>

              {/* CAB: direct Accept */}
              {isCab && getStatus() === 'PENDING' && (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={async () => {
                    try {
                      const response = await fetchData({
                        method: 'POST',
                        url: '/user/order/acceptOrder',
                        data: { orderId: order._id },
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const tripId =
                        response.data?.data?.tripId?._id ||
                        response.data?.tripId?._id ||
                        response.data?.tripId;
                      onClose();
                      if (tripId) {
                        navigation.navigate('RideDetails', {
                          order: { ...order, tripId, tripStatus: 'CREATED' },
                        });
                      }
                    } catch (e: any) {
                      Toast.show({ type: 'error', text1: e?.message || 'Failed to accept' });
                    }
                  }}
                >
                  <Text style={styles.sendText}>Accept</Text>
                </TouchableOpacity>
              )}

              {/* PARCEL: Send Quote */}
              {!isCab && getStatus() === 'PENDING' && !quoteSent && (
                <TouchableOpacity style={styles.sendBtn} onPress={() => setShowQuoteModal(true)}>
                  <Text style={styles.sendText}>Send Quote</Text>
                </TouchableOpacity>
              )}

              {order.isAccepted && (
                <TouchableOpacity
                  style={styles.sendBtn}
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
                >
                  <Text style={styles.sendText}>See Ride</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
      {showQuoteModal && (
        <SendQuoteModal
          visible={true}
          onClose={() => setShowQuoteModal(false)}
          orderMongoId={order._id}
          orderDetails={{
            distance: order.distance,
            weight: order.package.weight,
            itemName: order.package.itemName,
            weightUnit: order.package.weightUnit,
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
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: Colors.white,
    borderRadius: scale(12),
    padding: scale(12),
  },
  contactSection: {
    paddingHorizontal: scale(12),
  },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 🔥 pushes to corners
  },

  contactBox: {
    maxWidth: '48%', // 👈 keeps them apart nicely
  },

  valueBold: {
    fontSize: fontScale(14),
    fontWeight: 'bold',
    color: Colors.black,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    marginBottom: scale(12),
  },

  itemImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(8),
    marginRight: scale(10),
    backgroundColor: Colors.quoteBg,
  },

  itemTitle: {
    fontSize: fontScale(13),
    fontWeight: '600',
    color: Colors.black,
  },

  itemDesc: {
    fontSize: fontScale(12),
    color: Colors.subtitle,
  },
  title: {
    fontSize: fontScale(18),
    fontWeight: 'bold',
    marginBottom: scale(15),
  },
  label: {
    fontSize: fontScale(13),
    color: Colors.subtitle,
    marginVertical: scale(10),
  },
  value: {
    fontSize: fontScale(14),
    color: Colors.subtitle,
  },
  descriptionText: {
    fontSize: fontScale(14),
    color: Colors.subtitle,
    paddingStart: scale(12),
  },
  sendBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: scale(6),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontScale(12),
    paddingHorizontal: scale(12),
    fontFamily: 'Rubik-Regular',
    marginBottom: scale(5),
  },
  photosSection: {
    marginTop: scale(15),
    marginBottom: scale(15),
  },
  photosScroll: {
    paddingHorizontal: scale(12),
  },
  photo: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(10),
    marginRight: scale(10),
    backgroundColor: Colors.quoteBg,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: Colors.quoteBg,
    borderRadius: scale(6),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: Colors.white,
    fontFamily: 'Rubik-Regular',
  },

  closeText: {
    color: Colors.black,
    fontFamily: 'Rubik-Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    marginTop: scale(10),
    gap: scale(10),
  },
});
