import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';
import CommonHeader from '../components/common/Header';
import { Colors } from '../constants/Colors';
import RequestCard from '../components/RequestCard';
import { api } from '../services/apiClient';
import SafeWrapper from '../components/SafeWrapper';

const TripsScreen = () => {
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING'>('ACTIVE');

  useEffect(() => {
    fetchTrip();
  }, []);

  const fetchTrip = async () => {
    try {
      const response = await api.get(
        '/user/order/orderDetail/699599d0ba794917745cc992'
      );

      const data = response.data?.data;

      setTrip(data);
    } catch (error) {
      console.log('Trip fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.red} />
      </View>
    );
  }

  // if (!trip) return null;

  return (
  <SafeWrapper backgroundColor={Colors.bg}>
    <CommonHeader showBadge={false} simpleHeader={false} />
    
    {/* --------- TAB SWITCHER ---------- */}
    <View style={styles.tabWrapper}>
      <View style={styles.tabContainer}>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'ACTIVE' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'ACTIVE' && styles.activeTabText,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'UPCOMING' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'UPCOMING' && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

      </View>
    </View>

    {/* --------- LIST ---------- */}
    {/* <FlatList
      data={[trip]}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <RequestCard
          name={item.sender?.name}
          pickup={item.pickup}
          drop={item.drop}
          createdAt={item.createdAt}
          distance={'--'}
          weight={item.package?.weight}
          itemName={item.package?.itemName}
          itemDescription={item.package?.description}
          photo={item.package?.photos?.[0]?.url}
          status="ACCEPTED"
          price={item.finalPrice}
          orderId={item._id}
        />
      )}
    /> */}
  </SafeWrapper>
);
};

export default TripsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg || '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabWrapper: {
  paddingHorizontal: 16,
  paddingTop: 16,
},

tabContainer: {
  flexDirection: 'row',
  backgroundColor: '#F2F2F2',
  borderRadius: 12,
  padding: 4,
},

tabButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: 'center',
},

activeTab: {
  backgroundColor: '#F13A1A33', // light red background
},

tabText: {
  fontSize: 14,
  color:Colors.black1,
  fontFamily: 'Rubik-SemiBold',
},

activeTabText: {
  color: Colors.red,
},
});