// screens/RatingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { fontScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import Ticks from '../assets/svg/tick.svg';
import CommonHeader from '../components/common/Header';
import Receiver from '../assets/svg/receiver.svg';
import Done from '../assets/svg/done.svg';
// SVG Imports - Update these paths according to your project
import LocationIcon from '../assets/svg/bottomBg1.svg';
import StarIcon from '../assets/svg/star.svg';
import StarFilledIcon from '../assets/svg/Stars.svg';
import { api } from '../services/apiClient';
import Toast from 'react-native-toast-message';

const calcDuration = (start?: string, end?: string) => {
  if (!start || !end) return 'N/A';
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs <= 0) return 'N/A';
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hrs > 0 ? `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min` : `${mins} min`;
};

const normalizeId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'object') return normalizeId(value._id || value.id || value.tripId);
  const cleanValue = String(value).replace(/^"|"$/g, '').trim();
  return cleanValue || null;
};

const getRatingTripId = (trip: any): string | null => {
  const mongoTripId = normalizeId(trip?._id || trip?.mongoTripId || trip?.tripObjectId);
  return mongoTripId || normalizeId(trip?.tripId);
};

const decodePolyline = (encoded: string) => {
  /* eslint-disable no-bitwise */
  let points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  /* eslint-enable no-bitwise */
  return points;
};

const RatingScreen = ({ navigation, route }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const trip = route?.params?.trip;
  const tripId = getRatingTripId(trip);
console.log(trip, "rating screnn trip")
  const pickupCoord = {
    latitude: trip?.pickup?.lat ?? 0,
    longitude: trip?.pickup?.lng ?? 0,
  };

  const dropCoord = {
    latitude: trip?.drop?.lat ?? 0,
    longitude: trip?.drop?.lng ?? 0,
  };

  const hasValidMapCoords =
    pickupCoord.latitude !== 0 &&
    pickupCoord.longitude !== 0 &&
    dropCoord.latitude !== 0 &&
    dropCoord.longitude !== 0;

  const mapRegion = {
    latitude: (pickupCoord.latitude + dropCoord.latitude) / 2 || pickupCoord.latitude,
    longitude: (pickupCoord.longitude + dropCoord.longitude) / 2 || pickupCoord.longitude,
    latitudeDelta: Math.max(
      Math.abs(pickupCoord.latitude - dropCoord.latitude) * 2,
      0.05,
    ),
    longitudeDelta: Math.max(
      Math.abs(pickupCoord.longitude - dropCoord.longitude) * 2,
      0.05,
    ),
  };

  React.useEffect(() => {
    if (!pickupCoord.latitude || !dropCoord.latitude) return;
    const fetchRoute = async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupCoord.latitude},${pickupCoord.longitude}&destination=${dropCoord.latitude},${dropCoord.longitude}&mode=driving&key=AIzaSyAEGcqEOyWEexZg3ArMIHw9rsAhnb1l3N4`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.routes?.length) {
          setRouteCoords(decodePolyline(json.routes[0].overview_polyline.points));
        }
      } catch (e) {
        console.log('Route fetch error:', e);
      }
    };
    fetchRoute();
  }, [
    dropCoord.latitude,
    dropCoord.longitude,
    pickupCoord.latitude,
    pickupCoord.longitude,
  ]);

  const handleSubmitRating = async () => {
    if (!tripId) {
      Toast.show({
        type: 'error',
        text1: 'Trip ID not found',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/user/rating/submit-rating', {
        tripId,
        rating,
        comment,
      });
      Toast.show({
        type: 'success',
        text1: 'Rating submitted successfully',
      });
      setTimeout(() => {
        navigation.popToTop();
        navigation.navigate('Tabs', {
          screen: 'Home',
          params: { walletDeductAmount: trip?.walletDeductAmount ?? 0 },
        });
      }, 1500);
    } catch (error: any) {
      let errorMessage = 'Failed to submit rating. Please try again.';

      if (error?.message) {
        try {
          const match = error.message.match(/\{.*\}/);
          if (match) {
            const errorData = JSON.parse(match[0]);
            errorMessage = errorData.message || errorMessage;
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }

      Toast.show({
        type: 'error',
        text1: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          {i <= rating ? (
            <StarFilledIcon width={32} height={32} />
          ) : (
            <StarIcon width={32} height={32} />
          )}
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <CommonHeader
        simpleHeaderTitle="Trip Summary"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topContainer}>
          <View style={styles.iconWrapper}>
            <Done style={styles.doneIcon} />
            <Ticks style={styles.tickIcon} />
          </View>

          <Text style={styles.completedText}>Trip Completed!</Text>

          <Text style={styles.completedSubtext}>
            Great job on finishing the delivery.
          </Text>
        </View>
        {/* Map Section */}
        <View style={styles.mapWrapper}>
          {hasValidMapCoords ? (
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              initialRegion={mapRegion}
            >
              {/* Route Polyline */}
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.primary}
                  strokeWidth={4}
                />
              )}

              {/* Pickup Marker */}
              <Marker
                coordinate={pickupCoord}
                title="Pickup"
                description={trip?.pickup?.address || ''}
              >
                <LocationIcon width={25} height={25} />
              </Marker>

              {/* Dropoff Marker */}
              <Marker
                coordinate={dropCoord}
                title="Dropoff"
                description={trip?.drop?.address || ''}
              >
                <View style={[styles.marker]}>
                  <Receiver />
                </View>
              </Marker>
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapFallback]}>
              <Text style={styles.mapFallbackText}>Route map unavailable</Text>
            </View>
          )}
          {/* Distance & Time Row */}
          <View style={styles.mapStatsContainer}>
            <View style={styles.mapStatItem}>
              <Text style={styles.mapStatLabel}>DISTANCE</Text>
              <Text style={styles.mapStatValue}>{trip?.totalDistance || 'N/A'}</Text>
            </View>

            <View style={styles.mapStatDivider} />

            <View style={styles.mapStatItem}>
              <Text style={styles.mapStatLabel}>DURATION</Text>
              <Text style={styles.mapStatValue}>{calcDuration(trip?.orderAcceptedAt, trip?.arrivedAtDropAt)}</Text>
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>How was the customer?</Text>

          <View style={styles.starsContainer}>{renderStars()}</View>
        </View>
        {/* Comment Input */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Leave a comment (Optional)</Text>

          <View style={styles.commentInputCard}>
            <TextInput
              style={styles.commentInput}
              placeholder="Any additional comments about the drop-off or the customer?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || loading) && styles.submitButtonDisabled,
          ]}
          disabled={rating === 0 || loading}
          onPress={handleSubmitRating}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cardBg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Medium',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    marginBottom: 20,
  },
  topContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 5, // increases height
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,

    position: 'relative',
  },

  doneIcon: {
    position: 'absolute',
  },

  tickIcon: {
    position: 'absolute',
  },
  iconWrapper: {
    height: 80,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    width: '100%',
    marginHorizontal: 20,
  },
  map: {
    height: 200,
    width: '100%',
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  mapFallbackText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#666',
  },
  mapWrapper: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  mapStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
  },

  mapStatItem: {
    alignItems: 'center',
  },

  mapStatLabel: {
    fontSize: fontScale(10),
    fontFamily: 'Rubik-Regular',
    color: '#999',
  },

  mapStatValue: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#333',
  },

  mapStatDivider: {
    width: 1,
    height: 25,
    backgroundColor: '#E0E0E0',
  },
  marker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarker: {
    backgroundColor: '#4CAF50',
  },
  dropoffMarker: {
    backgroundColor: '#F44336',
  },
  tripDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completedText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
  },
  completedSubtext: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#666',
    marginBottom: 16,
  },
  locationsContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pickupDot: {
    backgroundColor: '#4CAF50',
  },
  dropoffDot: {
    backgroundColor: '#F44336',
  },
  locationText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#333',
  },
  addressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#999',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontScale(10),
    fontFamily: 'Rubik-Regular',
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#333',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  ratingSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  ratingTitle: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
    marginBottom: 12,
    textAlign: 'center',
    paddingTop: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },

  commentLabel: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    marginBottom: 8,
  },
  commentContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  commentInputCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
  },
  commentInput: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#333',
    minHeight: 80,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Medium',
    color: '#FFFFFF',
  },
});

export default RatingScreen;
