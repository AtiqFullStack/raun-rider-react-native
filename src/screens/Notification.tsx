import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import CommonHeader from '../components/common/Header';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/config';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import SafeWrapper from '../components/SafeWrapper';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();
  const initials = [user?.firstName, user?.surName]
    .filter(Boolean)
    .map((n: string) => n[0].toUpperCase())
    .join('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/user/trip/getDriverNotification`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log("notification res",response)

      if (!response.ok) {
        console.error('API Error:', response.status);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.error('Empty response');
        return;
      }

      const result = JSON.parse(text);
      console.log('notification data:', JSON.stringify(result, null, 2));
      if (result.success) {
        const sorted = result.data.sort(
          (a: Notification, b: Notification) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        setNotifications(sorted);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return (
        date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' Today'
      );
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || 'DR'}</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.message}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeWrapper backgroundColor={Colors.bg}>
        <CommonHeader simpleHeaderTitle="Notification" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeWrapper>
    );
  }

  return (
    <SafeWrapper backgroundColor={Colors.bg}>
      <CommonHeader simpleHeaderTitle="Notification" />

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>This Week</Text>

        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          indicatorStyle="black"
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications yet</Text>
          }
        />
      </View>
    </SafeWrapper>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },

  sectionContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  avatar: {
    height: 45,
    width: 45,
    borderRadius: 22.5,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    fontWeight: '600',
    color: '#6B7280',
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
    fontSize: 14,
  },
});
