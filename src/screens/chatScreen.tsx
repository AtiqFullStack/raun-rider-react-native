import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BackIcon from '../assets/svg/chevron_big_left.svg';
import { Colors } from '../constants/Colors';
import { api } from '../services/apiClient';
import { imgaeUrlConverter } from '../utils/converter';
import { useAuth } from '../context/AuthContext';
import KeyboardWrapper from '../components/KeyboardWrapper';
import { AppEvents } from '../utils/events';

type ChatScreenParams = {
  ChatScreen: {
    tripId?: string;
    orderId?: string;
    otherUserId?: string;
    otherUserName?: string;
    otherUserPhoto?: string;
    role?: 'DRIVER' | 'CUSTOMER';
  };
};

type ChatRouteProp = RouteProp<ChatScreenParams, 'ChatScreen'>;

interface Message {
  id: string;
  text: string;
  time: string;
  sender: 'me' | 'other';
}

const ChatScreen = () => {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  const normalizeId = (value: any) => {
    if (!value) return '';
    if (typeof value === 'object') {
      return String(value._id || value.id || '');
    }
    return String(value);
  };

  const currentUserId = normalizeId(user?._id || user?.id || user?.userId);
  const rawTripId = route.params?.tripId || route.params?.orderId;
  const tripId = normalizeId(rawTripId);
  const otherUserName = route.params?.otherUserName;
  const otherUserPhoto = route.params?.otherUserPhoto;

  const [order, setOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  // ── Fetch order details on mount ──────────────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const fetchOrder = async () => {
      try {
        setLoadingOrder(true);
        // Primary: /driver/orders/unified/:id
        const res = await api.get(`/driver/orders/unified/${tripId}`);
        const ordData = res.data?.data?.order || res.data?.order || res.data?.data;
        if (ordData) {
          setOrder(ordData);
          return;
        }
      } catch (err: any) {
        try {
          const res2 = await api.get(`/unifiedorder/${tripId}`);
          const ordData = res2.data?.data?.order || res2.data?.order || res2.data?.data;
          if (ordData) {
            setOrder(ordData);
            return;
          }
        } catch (fallbackErr: any) {
          console.error('Failed to fetch order:', fallbackErr);
        }
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [tripId]);

  useEffect(() => {
    const newMessage = AppEvents.addListener('NEW_NOTIFICATION', (data: any) => {
      console.log('new message notification received:', data);
      if (data?.type === 'NEW_MESSAGE') {
        const notificationTripId = normalizeId(data.tripId || data.orderId || data.sourceId);
        if (notificationTripId && notificationTripId === tripId) {
          const messageId =
            data.messageId || data._id || `${Date.now()}-${Math.random()}`;
          const senderId = normalizeId(data.senderId);
          const isMe = senderId ? senderId === currentUserId : data.senderType === 'driver';

          const formattedMessage: Message = {
            id: messageId,
            text: data.message || '',
            time: data.createdAt
              ? new Date(data.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
            sender: isMe ? 'me' : 'other',
          };

          setMessages(prev => {
            if (prev.some(m => m.id === messageId)) return prev;
            return [...prev, formattedMessage];
          });

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    });

    return () => {
      newMessage.remove();
    };
  }, [tripId, currentUserId]);


  // ── Fetch message history on mount ─────────────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        let msgList: any[] = [];

        try {
          const res = await api.get(`/chat/${tripId}/messages`);
          msgList = res.data?.data?.messages || res.data?.messages || res.data?.data || [];
        } catch {
          const res2 = await api.get(`/user/trip/trip-Message/${tripId}`);
          msgList = res2.data?.data || res2.data?.messages || [];
        }

        const formatted = msgList.map((m: any) => {
          const senderId = normalizeId(m.senderId);
          const isMe = senderId ? senderId === currentUserId : m.senderType === 'driver';
          return {
            id: m._id || m.id || `${Date.now()}-${Math.random()}`,
            text: m.message || m.text || '',
            time: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: isMe ? ('me' as const) : ('other' as const),
          };
        });

        setMessages(formatted);
      } catch (err) {
        console.log('Error fetching chat messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [tripId, currentUserId]);

  // ── Customer details extraction ────────────────────────────────────
  const customer =
    order?.customerId ||
    order?.orderDetails?.customerId ||
    order?.orderDetails?.userAuthId;

  const customerName =
    customer?.fullName ||
    (customer?.firstName
      ? `${customer.firstName} ${customer.surName || customer.lastName || ''}`.trim()
      : '') ||
    customer?.name ||
    order?.orderDetails?.sender?.name ||
    otherUserName ||
    'Customer';

  const customerPhoto =
    customer?.profileImage ||
    customer?.photo ||
    customer?.selfiePhoto ||
    otherUserPhoto;

  const avatarUri =
    customerPhoto && String(customerPhoto).trim() !== ''
      ? imgaeUrlConverter(customerPhoto)
      : null;

  const orderNumber =
    order?.orderDetails?.loadRequestNumber || order?.orderNumber || (tripId ? `#${tripId.slice(-6)}` : '');

  // ── Send message action calling POST /chat/send-message ─────────────
  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || sending) return;

    if (!tripId) {
      Toast.show({
        type: 'error',
        text1: 'Cannot send message',
        text2: 'Order ID is missing.',
      });
      return;
    }

    const tempId = Date.now().toString();
    const tempMessage: Message = {
      id: tempId,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me',
    };

    // Optimistic UI update
    setMessages(prev => [...prev, tempMessage]);
    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      setSending(true);
      const res = await api.post('/chat/send-message', {
        orderId: tripId,
        message: textToSend,
      });

      console.log('Send message API success:', res.data);
      const serverMsg = res.data?.data?.message || res.data?.message;
      if (serverMsg) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? {
                ...m,
                id: serverMsg._id || serverMsg.id || tempId,
                time: serverMsg.createdAt
                  ? new Date(serverMsg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : m.time,
              }
              : m,
          ),
        );
      }
    } catch (err: any) {
      console.error('Send message API error:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(textToSend);
      Toast.show({
        type: 'error',
        text1: 'Failed to send message',
        text2: err?.response?.data?.message || err?.message || 'Please try again',
      });
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.sender === 'me';
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeOther]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardWrapper>
      <View style={styles.container}>
        {/* ── CUSTOM HEADER WITH CUSTOMER IMAGE AND NAME ── */}
        <View style={[styles.headerContainer, { paddingTop: Math.max( 12) }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BackIcon color={Colors.white} width={24} height={24} />
            </TouchableOpacity>

            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <Image
                  source={require('../assets/images/default-avatar.jpg')}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              )}
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {loadingOrder
                  ? 'Fetching details...'
                  : orderNumber
                    ? `Order ${orderNumber}`
                    : 'Online'}
              </Text>
            </View>

            {loadingOrder && (
              <ActivityIndicator size="small" color={Colors.white} style={styles.loader} />
            )}
          </View>
        </View>

        {/* ── ORDER SUMMARY STRIP (IF ORDER DATA IS AVAILABLE) ── */}
        {order && (
          <View style={styles.orderStrip}>
            <View style={styles.orderStripCol}>
              <Text style={styles.stripLabel}>Pickup</Text>
              <Text style={styles.stripValue} numberOfLines={1}>
                {order.pickup?.address || order.orderDetails?.pickupLocation?.address || 'N/A'}
              </Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.orderStripCol}>
              <Text style={styles.stripLabel}>Drop</Text>
              <Text style={styles.stripValue} numberOfLines={1}>
                {order.drop?.address || order.orderDetails?.dropoffLocation?.address || 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {/* ── MESSAGES LIST ── */}
        {loadingMessages ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary || '#014D4D'} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── INPUT BAR ── */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    backgroundColor: '#014D4D',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D0A645',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#D1D5DB',
    marginTop: 2,
  },
  loader: {
    marginLeft: 8,
  },
  orderStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    alignItems: 'center',
  },
  orderStripCol: {
    flex: 1,
  },
  stripLabel: {
    fontSize: 10,
    fontFamily: 'Rubik-Medium',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  stripValue: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#1F2937',
    marginTop: 2,
  },
  stripDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: Colors.primary || '#014D4D',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 20,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textOther: {
    color: '#1F2937',
  },
  timeText: {
    fontSize: 10,
    fontFamily: 'Rubik-Regular',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: '#D1D5DB',
  },
  timeOther: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.primary || '#014D4D',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
});

export default ChatScreen;
