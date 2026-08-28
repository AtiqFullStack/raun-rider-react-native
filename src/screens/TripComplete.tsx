import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../components/common/Header';
import CameraIcon from '../assets/svg/cameras.svg'
import ImageCropPicker from 'react-native-image-crop-picker';
import ImagePickerModal from '../components/ImagePickerModal';
import { api } from '../services/apiClient';
import { Colors } from '../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';

// Import SVG icons (you can rename these as needed)
import CheckCircleIcon from '../assets/svg/tick.svg';
import Ticks from '../assets/svg/ticks.svg';
import LocationIcon from '../assets/svg/locate.svg';
import UserIcon from '../assets/svg/phone.svg';
import ClockIcon from '../assets/svg/pickup.svg';
import TruckIcon from '../assets/svg/truck.svg';
import PackageIcon from '../assets/svg/locate.svg';
import HomeIcon from '../assets/svg/HomeIcon.svg';
import CrossIcon from '../assets/svg/cross.svg';
import Toast from 'react-native-toast-message';

const formatTime = (iso?: string) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TripCompletionScreen = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<any>();
  const trip = route.params?.trip;
  console.log(trip)

  console.log('Trip data:', trip);
  const [podImage, setPodImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [podUploaded, setPodUploaded] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const handleTakePhoto = () => setShowPickerModal(true);

  const uploadImage = async (uri: string, mime: string) => {
    setPodImage(uri);
    console.log('POD upload orderId:', trip?.orderId);
    const formData = new FormData();
    formData.append('orderId', trip?.orderId);
    formData.append('proofOfDelivery', {
      uri,
      type: mime ?? 'image/jpeg',
      name: 'pod.jpg',
    } as any);
    try {
      setUploading(true);
      const { data } = await api.postFormData('/user/trip/upload/pod', formData);
      if (data?.success) {
        setPodUploaded(true);
      } else {
        Toast.show({ type: 'error', text1: data?.message ?? 'Please try again.' });
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    setShowPickerModal(false);
    try {
      const image = await ImageCropPicker.openCamera({ mediaType: 'photo', compressImageQuality: 0.7 });
      await uploadImage(image.path, image.mime);
    } catch (e) {}
  };

  const pickFromGallery = async () => {
    setShowPickerModal(false);
    try {
      const image = await ImageCropPicker.openPicker({ mediaType: 'photo', compressImageQuality: 0.7 });
      await uploadImage(image.path, image.mime);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with Trip Completion title */}
      <CommonHeader
        simpleHeaderTitle="Trip Completion"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        backgroundColor="#fff"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Card */}
        <View style={styles.tripHeader}>
          <Text style={styles.tripLabel}>Current Trip</Text>
          <Text style={styles.tripId}>
            TRIP #{trip?.tripId?.slice(-8) || 'N/A'}
          </Text>
        </View>
        <View style={styles.tripCard}>
          {/* Customer Info */}
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <UserIcon width={20} height={20} fill="#666" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValue}>
                {trip?.customerName || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Dropoff Location */}
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <LocationIcon width={20} height={20} fill="#666" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Drop off Location</Text>
              <Text style={styles.infoValue}>{trip?.dropAddress || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Trip Status Card */}
        <Text style={styles.statusCardTitle}>Trip Status</Text>
        <View style={styles.statusCard}>
          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {/* Order Accepted */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, styles.completedDot]}>
                  <CheckCircleIcon width={16} height={16} />
                </View>
                <View style={[styles.line, styles.completedLine]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.statusText}>Order Accepted</Text>
                <Text style={styles.timeText}>
                  {formatTime(trip?.orderAcceptedAt)}
                </Text>
              </View>
            </View>

            {/* Picked Up */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, styles.completedDot]}>
                  <TruckIcon width={16} height={16} />
                </View>
                <View style={[styles.line, styles.completedLine]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.statusText}>Picked Up</Text>
                <Text style={styles.timeText}>
                  {formatTime(trip?.pickedUpAt)}
                </Text>
              </View>
            </View>

            {/* Arrived at Drop Off */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, styles.completedDot]}>
                  <LocationIcon />
                </View>
                <View style={[styles.line, styles.lastLine]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.statusText}>Arrived at Drop Off</Text>
                <Text style={styles.timeText}>
                  {formatTime(trip?.arrivedAtDropAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Proof of Delivery */}
        <View style={styles.podContainer}>
          <Text style={styles.podTitle}>Proof of Delivery</Text>

          {podImage ? (
            <View>
              <Image source={{ uri: podImage }} style={styles.podPreview} />
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              {!uploading && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => { setPodImage(null); setPodUploaded(false); }}
                >
                  <CrossIcon width={14} height={14} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={handleTakePhoto}>
              <View style={styles.uploadInner}>
                <View style={styles.cameraCircle}>
                  <CameraIcon width={20} height={20} />
                </View>
                <Text style={styles.uploadText}>Take a Picture of the Package</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Complete Delivery Button */}
        <TouchableOpacity
          style={[styles.completeButton,]}
          // disabled={!podUploaded}
          onPress={() => {
            navigation.navigate('RatingScreen', {
              trip: {
                ...trip,
              },
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>Complete Delivery</Text>
          <Ticks width={24} height={24} />
        </TouchableOpacity>
      </ScrollView>

      <ImagePickerModal
        visible={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cardBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // elevation: 3,
  },
  tripHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tripLabel: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#8E8E93',
  },
  tripId: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
    color: '#1C1C1E',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // elevation: 3,
  },
  statusCardTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  completedDot: {
    backgroundColor: '#E8F5E9',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 4,
  },
  completedLine: {
    backgroundColor: '#4CAF50',
  },
  lastLine: {
    backgroundColor: 'transparent',
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
    paddingBottom: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    color: '#8E8E93',
  },
  totalTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  totalTimeText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: Colors.primary,
    marginLeft: 8,
  },
  confirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#666',
    lineHeight: 20,
  },

  podContainer: {
  borderRadius: 16,
  padding: 16,
  marginBottom: 20,
  backgroundColor: Colors.white,
},

podTitle: {
  fontSize: 16,
  fontFamily: 'Rubik-Medium',
  color: '#1C1C1E',
  marginBottom: 12,
},

uploadBox: {
  borderWidth: 1.5,
  borderStyle: 'dashed',
  borderColor: '#FF6A55',
  borderRadius: 12,
  paddingVertical: 24,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FFF5F3',
},

uploadInner: {
  alignItems: 'center',
  justifyContent: 'center',
},

cameraCircle: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#FFDAD4',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},

cameraIcon: {
  fontSize: 22,
},

uploadText: {
  fontSize: 14,
  fontFamily: 'Rubik-Regular',
  color: Colors.subtitle,
},
podPreview: {
  width: '100%',
  height: 180,
  borderRadius: 12,
},
removeButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(0,0,0,0.55)',
  borderRadius: 12,
  padding: 5,
},
uploadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.4)',
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
},
retakeButton: {
  marginTop: 8,
  alignSelf: 'flex-end',
},
retakeText: {
  fontSize: 13,
  fontFamily: 'Rubik-Medium',
  color: Colors.primary,
},
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary2,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
});

export default TripCompletionScreen;
