import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,

} from 'react-native';
import { imgaeUrlConverter } from '../utils/converter';
import CommonHeader from '../components/common/Header';
import { Colors } from '../constants/Colors';
import { useSocket } from '../hooks/useSocket';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import KeyboardWrapper from '../components/KeyboardWrapper';

type ChatScreenParams = {
  ChatScreen: {
    tripId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto?: string;
    role: 'DRIVER' | 'CUSTOMER';
  };
};

type ChatRouteProp = RouteProp<ChatScreenParams, 'ChatScreen'>;

// Define message type
interface Message {
  id: string;
  text: string;
  time: string;
  sender: 'me' | 'other';
  status?: 'sent' | 'delivered' | 'read';
}

const ChatScreen = () => {
  const route = useRoute<ChatRouteProp>();
  const { socket, isSocketConnected } = useSocket();
  const normalizeId = (value: any) => {
    if (!value) return '';
    if (typeof value === 'object') {
      return String(value._id || value.id || '');
    }
    return String(value);
  };
  const { tripId: rawTripId, otherUserName, otherUserPhoto } = route.params;
  const tripId = normalizeId(rawTripId);
  const { user } = useAuth();
  const flatListRef = React.useRef<FlatList>(null);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const messagingInstance = React.useMemo(() => getMessaging(getApp()), []);
  const currentUserId = normalizeId(user?._id || user?.id || user?.userId);
  const insets = useSafeAreaInsets();
  const keyboardSpacerStyle = React.useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom, 8),
    }),
    [insets.bottom],
  );

  const appendIncomingMessage = React.useCallback(
    (data: any) => {
      const messageTripId = normalizeId(data?.tripId ?? data?.data?.tripId);
      if (messageTripId && messageTripId !== tripId) {
        console.log('⚠️ Message for different trip, ignoring');
        return null;
      }

      const messageText = data?.message ?? data?.data?.message ?? data?.body;
      if (!messageText) {
        return null;
      }

      const senderId = normalizeId(data?.senderId ?? data?.data?.senderId);
      const createdAt = data?.createdAt ?? data?.data?.createdAt;
      const messageId =
        normalizeId(data?.messageId ?? data?.data?.messageId ?? data?._id ?? data?.id) ||
        `${senderId || 'unknown'}-${createdAt || Date.now()}-${messageText}`;
      const isMyMessage = senderId === currentUserId;

      setMessages(prev => {
        if (prev.some(msg => msg.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId,
            text: String(messageText),
            sender: isMyMessage ? 'me' : 'other',
            time: createdAt
              ? new Date(createdAt).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            status: isMyMessage ? 'sent' : 'delivered',
          },
        ];
      });

      return messageId;
    },
    [currentUserId, tripId],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    });

    return () => {
      showSub.remove();
    };
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/user/trip/trip-Message/${tripId}`);
        const fetched = (res.data?.data || []).map((m: any) => ({
          id: m._id,
          text: m.message,
          sender: normalizeId(m.senderId) === currentUserId ? 'me' : 'other',
          time: new Date(m.createdAt).toLocaleTimeString(),
          status: 'delivered',
        }));
        setMessages(fetched);
      } catch (e) {
        console.log('Fetch messages error:', e);
      }
    };

    if (tripId) fetchMessages();
  }, [tripId, currentUserId]);

  useEffect(() => {
console.log(socket,tripId,currentUserId,isSocketConnected)

    if (!socket || !tripId || !currentUserId || !isSocketConnected) {
      console.log('❌ Cannot join room - missing requirements');
      return;
    }

    console.log('🚀 Emitting JOIN_TRIP...');
    
    // Set a timeout to detect if server doesn't respond
    const joinTimeout = setTimeout(() => {
      console.log('⚠️ JOIN_TRIP timeout - no acknowledgment received after 5s');
    }, 5000);

    socket.emit('JOIN_TRIP', { tripId, userId: currentUserId }, (ack: any) => {
      clearTimeout(joinTimeout);
      console.log('✅ JOIN_TRIP acknowledgment:', ack);
      if (ack?.error) {
        console.error('❌ JOIN_TRIP error:', ack.error);
        Toast.show({
          type: 'error',
          text1: 'Unable to open chat',
          text2: ack.error,
        });
      } else {
        console.log('✅ Successfully joined room for trip:', tripId);
      }
    });

    // Listen for socket errors
    const handleError = (error: any) => {
      console.error('🔴 Socket error:', error);
    };

    socket.on('error', handleError);
    socket.on('connect_error', handleError);

    return () => {
      console.log('🔴 Leaving trip:', tripId);
      socket.emit('LEAVE_TRIP', { tripId });
      socket.off('error', handleError);
      socket.off('connect_error', handleError);
    };
  }, [socket, tripId, isSocketConnected, currentUserId]);

  useEffect(() => {
    console.log('CHAT PARAMS:', route.params);
    console.log('otherUserPhoto:', otherUserPhoto);
  }, [route.params, otherUserPhoto]);
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
      console.log('📥 RECEIVE_MESSAGE event:', data);
      const messageId =
        normalizeId(data?.messageId ?? data?.data?.messageId ?? data?._id ?? data?.id) ||
        `${Date.now()}`;

      // Don't add if it's my own message (already added optimistically)
      if (normalizeId(data?.senderId ?? data?.data?.senderId) === currentUserId) {
        console.log('⚠️ Ignoring own message from RECEIVE_MESSAGE (already in UI)');
        // Update the temp message with real ID from server
        setMessages(prev =>
          prev.map(msg =>
            msg.sender === 'me' && msg.text === data.message
              ? { ...msg, id: messageId, status: 'delivered' }
              : msg,
          ),
        );
        return;
      }

      const appendedMessageId = appendIncomingMessage(data);
      if (appendedMessageId) {
        socket.emit('MESSAGE_DELIVERED', { tripId, messageId: appendedMessageId });
      }
    };

    // socket.on('RECEIVE_MESSAGE', handleReceiveMessage);

    return () => {
      socket.off('RECEIVE_MESSAGE', handleReceiveMessage);
    };
  }, [appendIncomingMessage, socket, tripId, currentUserId]);

  useEffect(() => {
    if (!socket) return;

    const handleDelivered = (data: any) => {
      if (normalizeId(data.tripId) !== tripId) return;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, status: 'delivered' } : msg,
        ),
      );
    };

    socket.on('MESSAGE_DELIVERED', handleDelivered);

    return () => {
      socket.off('MESSAGE_DELIVERED', handleDelivered);
    };
  }, [socket, tripId]);

  useEffect(() => {
    if (!socket || !tripId) return;

    socket.emit('MARK_AS_READ', { tripId });
  }, [socket, tripId]);

  useEffect(() => {
    if (!socket) return;

    const handleRead = (data: any) => {
      setMessages(prev =>
        prev.map(msg =>
          data.messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg,
        ),
      );
    };

    socket.on('MESSAGE_READ', handleRead);

    return () => {
      socket.off('MESSAGE_READ', handleRead);
    };
  }, [socket]);

  const profileUri =
    otherUserPhoto && otherUserPhoto.trim() !== ''
      ? imgaeUrlConverter(otherUserPhoto)
      : null;

  useEffect(() => {
  const unsubscribe = onMessage(messagingInstance, async remoteMessage => {
    const data = remoteMessage.data;

    if (data?.type === 'NEW_MESSAGE' && normalizeId(data?.tripId) === tripId) {
      const messageId = appendIncomingMessage(data);
      if (messageId && socket) {
        socket.emit('MESSAGE_DELIVERED', { tripId, messageId });
      }
    }
  });

  return unsubscribe;
}, [appendIncomingMessage, messagingInstance, socket, tripId]);

  const sendMessage = () => {
    if (!tripId || !currentUserId) {
      Toast.show({
        type: 'error',
        text1: 'Chat not ready',
        text2: 'Trip or user id is missing.',
      });
      return;
    }

    if (!input.trim() || !socket) {
      console.log('❌ Cannot send message. Socket:', !!socket, 'Input:', input);
      return;
    }


    const tempId = Date.now().toString();
    const messageText = input;

    const messagePayload = {
      tripId,
      senderId: currentUserId,
      message: messageText,
    };


    console.log(messagePayload)
    // return 
    console.log('🚀 Emitting SEND_MESSAGE:', messagePayload);

    // Optimistic UI update
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        text: messageText,
        sender: 'me',
        time: new Date().toLocaleTimeString(),
        status: 'sent',
      },
    ]);



    const sendTimeout = setTimeout(() => {
      console.log('⚠️ SEND_MESSAGE timeout - no acknowledgment after 5s');
    }, 5000);

    socket.emit('SEND_MESSAGE', messagePayload, (response: any) => {
      clearTimeout(sendTimeout);
   
      
      if (response?.error) {
        console.error('❌ Send message error:', response.error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        Toast.show({
          type: 'error',
          text1: 'Failed to send message',
          text2: response.error,
        });
      } else if (response?.messageId) {
        console.log('✅ Message sent successfully with ID:', response.messageId);
        // Update temp ID with real ID
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId ? { ...msg, id: response.messageId } : msg,
          ),
        );
      } else {
        console.log('✅ Message sent (no messageId in response)');
      }
    });

    setInput('');
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender === 'me';

    const showDate = index === 0; // simple version for now

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparatorInline}>
            <Text style={styles.dateText}>Today</Text>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isMyMessage
              ? styles.myMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.text}
            </Text>

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMyMessage ? styles.myTime : styles.otherTime]}>
                {item.time}
              </Text>

              {/* {isMyMessage && item.status && (
                <Text
                  style={[
                    styles.messageStatus,
                    item.status === 'read' && { color: '#34B7F1' },
                  ]}
                >
                  {item.status === 'sent' && '✓'}
                  {item.status === 'delivered' && '✓✓'}
                  {item.status === 'read' && '✓✓'}
                </Text>
              )} */}
            </View>
          </View>
        </View>
      </>
    );
  };
  return (
<KeyboardWrapper>


      <View style={styles.container}>
        <CommonHeader title="" showBackgroundImage={true} />

        <View style={styles.root}>
          {/* 📍 FLOATING CHAT HEADER CARD */}
          <View style={styles.floatingCard}>
            <View style={styles.headerContent}>
              <Image
                source={
                  profileUri
                    ? { uri: profileUri }
                    : require('../assets/images/default-avatar.jpg')
                }
                style={styles.avatar}
                resizeMode="cover"
                onError={e =>
                  console.log('Image load error:', e.nativeEvent.error)
                }
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {otherUserName || 'Kabelo Nkosi'}
                </Text>
                <Text style={styles.headerStatus}>● Online</Text>
              </View>
            </View>
          </View>

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        </View>
        <View
          style={[
            styles.inputContainer,
            keyboardSpacerStyle,
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            style={styles.chatInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardWrapper>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  root: {
    flex: 1,
    marginTop: 25,
    paddingHorizontal: 16,
  },
  floatingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: -25, // Negative margin to pull it up over the header
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Rubik-Medium',
  },
  headerStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
    fontFamily: 'Rubik-Regular',
  },
  messagesList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
  },
  myMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    marginRight: 4,
    fontFamily: 'Rubik-Regular',
  },
  myTime: {
    color: Colors.white,
  },
  otherTime: {
    color: '#666',
  },
  messageStatus: {
    fontSize: 12,
    color: '#34B7F1',
  },
  dateSeparatorInline: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontFamily: 'Rubik-Regular',
  },

  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    
    borderColor: '#eee',
  },

  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    color: Colors.black,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginRight: 8,
  },

  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendText: {
    color: '#fff',
  },
});

export default ChatScreen;
