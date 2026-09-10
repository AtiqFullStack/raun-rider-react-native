import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import ImagePickerModal from '../components/ImagePickerModal';
import FileIcon from '../assets/svg/file.svg';
import SafeWrapper from '../components/SafeWrapper';
import Header from '../components/common/Header';
import { useAuth } from '../context/AuthContext';
import { fontScale, verticalScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { api } from '../services/apiClient';
import { imgaeUrlConverter } from '../utils/converter';
import PhoneIcon from '../assets/svg/phone.svg';
import EmailIcon from '../assets/svg/email.svg';
import LocationIcon from '../assets/svg/locate.svg';
import VehicleIcon from '../assets/svg/vehicle.svg';
import StarIcon from '../assets/svg/Stars.svg';
import ProfileIcon from '../assets/svg/profilre.svg';
import PencilCircle from '../assets/svg/pencil.svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import PencilInner from '../assets/svg/pencils.svg';
import LogoutIcon from '../assets/svg/logout.svg';
import SupportIcon from '../assets/svg/support.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from '../utils/Storage';
import CustomAlert from '../components/CustomAlert';
import Toast from 'react-native-toast-message';
import { DOMAIN } from '../var';
import { getCurrentLocation } from '../services/driverLocationTracker';

const DOCS = [
  { label: 'Driving License' },
  { label: 'Vehicle Registration (RC)' },
];

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { authValue, token, user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const showEditVehicleButton = user?.driverType === 'INDIVIDUAL';
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [uploadingDP, setUploadingDP] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      console.log('Token:', token);
      const res = await api.post('/user/auth/getDriverProfile', {
        userType: 'DRIVER',
      });
      console.log('Profile res:', res);
      if (res.data?.success) {
        const profileData = res.data.data?.driver ?? res.data.data ?? res.data.driver;
        setProfile(profileData);
        setUser(profileData);
      }
    } catch (e) {
      console.log('Profile fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [setUser, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadDP = async (imagePath: string) => {
    try {
      setUploadingDP(true);
      const formData = new FormData();
      formData.append('type', 'DP');
      formData.append('selfiePhoto', {
        uri: imagePath,
        type: 'image/jpeg',
        name: 'selfiePhoto.jpg',
      } as any);
      const res = await api.putFormData('/user/auth/update-vehicle', formData);
      fetchProfile()
      if (res.data?.success) {
        const serverPhoto = res.data?.data?.selfiePhoto;
        setProfileImage(imagePath);
        if (serverPhoto) {
          const updatedUser = { ...user, selfiePhoto: serverPhoto };
          console.log(updatedUser)
          setUser(updatedUser);
          await StorageService.setItem('user', updatedUser);
        }
      }
    } catch {
      console.log('Failed to update profile photo');
    } finally {
      setUploadingDP(false);
    }
  };

  const pickFromCamera = async () => {
    setShowPickerModal(false);
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openCamera({
          mediaType: 'photo',
          compressImageQuality: 0.7,
          cropping: true,
        });
        uploadDP(image.path);
      } catch { }
    }, 300);
  };

  const pickFromGallery = async () => {
    setShowPickerModal(false);
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openPicker({
          mediaType: 'photo',
          compressImageQuality: 0.7,
          cropping: true,
        });
        uploadDP(image.path);
      } catch { }
    }, 300);
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  useEffect(() => {
    if (route.params?.refreshProfileAt) {
      fetchProfile();
    }
  }, [fetchProfile, route.params?.refreshProfileAt]);

  const handleDeleteAccount = async () => {
    try {
      const res = await api.delete('/admin/auth/deleteUser');
      if (res?.data?.success) {
        Toast.show({ type: 'success', text1: res.data.message || 'Account deleted successfully' });
        authValue.signOut();
      }
      authValue.signOut();
    } catch (e) {
      console.log('Delete account error:', e);
    }
  };

  if (loading) {
    return (
      <SafeWrapper>
        <Header
          simpleHeader
          simpleHeaderTitle="Profile"
          showBackButton={false}
        />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeWrapper>
    );
  }

  const selfieUri = profile?.selfiePhoto
    ? imgaeUrlConverter(profile.selfiePhoto)
    : null;
  const vehicleFrontUri = profile?.subCategoryId?.image
    ? imgaeUrlConverter(profile.subCategoryId.image)
    : null;
  const isApproved = profile?.status === 'APPROVED';


  const gotoOnline = async () => {

    try {
      const location = await getCurrentLocation();
      console.log(location)
      const res = await api.post('/user/auth/isOnline', { status: false, latitude: location.lat, longitude: location.long });
      if (res.data.success) {
      }
    } catch (error) {
      console.log(error);
    }
  };



  return (
    <SafeWrapper>
      <View style={{ paddingVertical: verticalScale(0), backgroundColor: Colors.cardBg }}>
        <Header
          simpleHeader
          simpleHeaderTitle="Profile"
          showBackButton
        />
      </View>

      <ScrollView
        style={styles.bg}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.secondaryDark]} // Android
            tintColor={Colors.secondaryDark} // iOS
          />
        }
      >
        {/* ── Card 1: Profile Header ── */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {selfieUri ? (
                  <Image
                    source={{ uri: profileImage || selfieUri }}
                    style={styles.avatar}
                  />
                ) : (
                  <ProfileIcon width={60} height={60} />
                )}
              </View>
              {/* pencil circle with pencils icon inside */}
              <TouchableOpacity
                style={styles.pencilBtn}
                activeOpacity={0.8}
                onPress={() => !uploadingDP && setShowPickerModal(true)}
              >
                {uploadingDP ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <PencilCircle width={32} height={32} />
                    <View style={styles.pencilInner}>
                      <PencilInner width={14} height={14} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>
                {profile?.firstName ?? ''} {profile?.surName ?? ''}
              </Text>
              <View style={styles.ratingRow}>
                <StarIcon width={16} height={16} />
                <Text style={styles.ratingText}>
                  {profile?.averageRating?.toFixed(1) ?? '0.0'} (
                  {profile?.totalRatings ?? 0})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Section Title: Personal Details ── */}
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
            Personal Details
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EditPersonalDetails', { profile })}
          >
            <Text style={styles.sectionEditText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Card 2: Personal Details ── */}
        <View style={styles.card}>
          <View style={styles.detailItem}>
            <View style={styles.iconBg}>
              <PhoneIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>
                {profile?.countryCode} {profile?.phone}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailItem}>
            <View style={styles.iconBg}>
              <EmailIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{profile?.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={[styles.detailItem, { marginBottom: 0 }]}>
            <View style={styles.iconBg}>
              <LocationIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>
                {profile?.city}, {profile?.state}
              </Text>
            </View>
          </View>
        </View>

        {profile?.driverType !== 'COMPANY' && (
          <>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                paddingHorizontal: 4,
              }}
            >
              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              {showEditVehicleButton && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('EditVehicle', { profile })}>
                  <Text
                    style={{
                      color: Colors.primary,
                      fontFamily: 'Rubik-Medium',
                      fontSize: fontScale(13),
                    }}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {/* ── Card 3: Vehicle ── */}
            <View style={styles.card}>
              <View style={styles.vehicleHeader}>
                {vehicleFrontUri ? (
                  <Image
                    source={{ uri: vehicleFrontUri }}
                    style={styles.vehicleImg}
                    resizeMode="contain"
                  />
                ) : (
                  <VehicleIcon width={70} height={55} />
                )}

                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {profile?.make} {profile?.modelYear}
                  </Text>
                  <Text style={styles.vehicleType}>
                    {profile?.vehicleTrailer}
                  </Text>
                  <Text style={[styles.vehicleType, styles.cardBg]}>
                    {profile?.subCategoryId?.maxWeight} Ton capacity
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.licensePlate}>
                <Text style={styles.licenseLabel}>License Plate</Text>
                <Text style={styles.licenseNumber}>
                  {profile?.registrationNumber}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── Section Title: Documents ── */}
        <Text style={styles.sectionTitle}>Documents</Text>

        {/* ── Card 4: Documents ── */}
        <View style={styles.card}>
          {DOCS.map((doc, i) => (
            <View key={doc.label}>
              <View
                style={[
                  styles.detailItem,
                  i === DOCS.length - 1 && { marginBottom: 0 },
                ]}
              >
                <FileIcon width={20} height={20} />
                <View style={styles.documentContent}>
                  <Text style={styles.documentLabel}>{doc.label}</Text>
                  <View
                    style={[
                      styles.verifiedBadge,
                      !isApproved && styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verifiedText,
                        !isApproved && styles.pendingText,
                      ]}
                    >
                      {isApproved ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
              {i < DOCS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── Card 5: Contact Us ── */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.detailItem}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('mailto:helpme@raun.com')}
          >
            <View style={styles.iconBg}>
              <EmailIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Support Email</Text>
              <Text style={styles.detailValue}>helpme@raun.com</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.detailItem}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('mailto:Info@raun.com')}
          >
            <View style={styles.iconBg}>
              <EmailIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Info Email</Text>
              <Text style={styles.detailValue}>Info@raun.com</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.detailItem}
            activeOpacity={0.7}
          // onPress={() => Linking.openURL('tel:+5921234567')}
          >
            <View style={styles.iconBg}>
              <PhoneIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Netone</Text>
              <Text style={styles.detailValue}>+5921234567</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            activeOpacity={0.7}
          // onPress={() => Linking.openURL('tel:+19876543210')}
          >
            <View style={styles.iconBg}>
              <PhoneIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Econet</Text>
              <Text style={styles.detailValue}>+1 9876543210</Text>
            </View>
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('tel:+263787851061')}
          >
            <View style={styles.iconBg}>
              <PhoneIcon />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Go To Help</Text>
            </View>
          </TouchableOpacity> */}

        </View>

        {/* ── Card 6: Logout ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            // onPress={() => Linking.openURL(`${DOMAIN}/Contact.html`)}
            activeOpacity={0.8}
          >
            <SupportIcon width={20} height={20} />
            <Text style={[styles.menuText, { color: Colors.primary }]}>Go to Help Center</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            // onPress={() => Linking.openURL(`${DOMAIN}/terms.html`)}
            activeOpacity={0.8}
          >
            {/* <SupportIcon width={20} height={20} /> */}
            <Text style={[styles.menuText, { color: Colors.primary }]}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            // onPress={() => Linking.openURL(`${DOMAIN}/privacy-policy.html`)}
            activeOpacity={0.8}
          >
            {/* <SupportIcon width={20} height={20} /> */}
            <Text style={[styles.menuText, { color: Colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* ── Card 7: Logout ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.detailItem, { marginBottom: 0 }]}
            onPress={() => setLogoutAlertVisible(true)}
            activeOpacity={0.8}
          >
            <LogoutIcon width={20} height={20} />
            <Text style={[styles.menuText, { color: Colors.black }]}>Logout</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setShowDeleteAlert(true)}
          activeOpacity={0.7}
          style={{ alignItems: 'center', marginBottom: 24 }}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
      <ImagePickerModal
        visible={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
      />
      <CustomAlert
        visible={showDeleteAlert}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost."
        onDismiss={() => setShowDeleteAlert(false)}
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowDeleteAlert(false) },
          { text: 'Delete', style: 'destructive', onPress: () => { setShowDeleteAlert(false); handleDeleteAccount(); } },
        ]}
      />
      <CustomAlert
        visible={logoutAlertVisible}
        title="Logout"
        message="Are you sure you want to logout from your account?"
        onDismiss={() => setLogoutAlertVisible(false)}
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLogoutAlertVisible(false),
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              setLogoutAlertVisible(false);
              try {
                await gotoOnline()
                await AsyncStorage.multiRemove(['token', 'user', 'currentScreen']);
                authValue.signOut();
              } catch (error) {
                console.log('Logout error:', error);
              }
            },
          },
        ]}
      />
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  sectionTitle: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-SemiBold',
    color: Colors.black,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  sectionTitleInRow: {
    marginBottom: 0,
    marginLeft: 0,
  },

  sectionEditText: {
    color: Colors.primary,
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(13),
  },

  // Profile Header
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  pencilBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pencilInner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMeta: { flex: 1 },
  profileName: {
    fontSize: fontScale(17),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
    marginBottom: 6,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    marginLeft: 4,
  },

  // Detail rows
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailContent: { flex: 1, marginLeft: 12 },
  detailLabel: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: Colors.black1,
  },
  divider: { height: 1, backgroundColor: Colors.bg, marginBottom: 12 },

  // Vehicle
  vehicleHeader: { flexDirection: 'row', marginBottom: 12 },
  vehicleImg: {
    width: verticalScale(190),
    height: verticalScale(95),
    borderRadius: 10,
    borderWidth: 0.5,
  },
  vehicleInfo: { flex: 1, marginLeft: 12 },
  vehicleName: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    alignSelf: 'flex-start',
    padding: 2,
    marginBottom: 2,
  },
  cardBg: { backgroundColor: Colors.liteCardBg },
  licensePlate: {
    flexDirection: 'column',
    padding: 4,
  },
  licenseLabel: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: Colors.light,
  },
  licenseNumber: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Medium',
    color: Colors.secondaryDark,
    backgroundColor: Colors.lightRed,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  // Documents
  documentContent: {
    flex: 1,
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  documentLabel: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Medium',
    color: Colors.black,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  iconBg: { backgroundColor: Colors.cardBg, borderRadius: 25, padding: 10 },
  iconBg2: {
    backgroundColor: Colors.lightgreen,
    borderRadius: 25,
    padding: 10,
  },
  pendingBadge: { backgroundColor: '#FFF3CD' },
  verifiedText: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.completedText,
    marginLeft: 4,
  },
  pendingText: { color: '#856404' },

  // Bank / menu
  menuText: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Regular',
    color: Colors.black,
    marginLeft: 12,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  logoutText: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Medium',
    color: Colors.secondaryDark,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-Regular',
    color: Colors.Textgray,
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;
