import {
  Animated,
  Image,

  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useRef } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import BackIcon from '../../assets/svg/chevron_big_left.svg';
import TruckSvg from '../../assets/svg/truckSVG.svg';
import { fontScale, scale, vw } from '../../utils/scaling';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import Bell from '../../assets/svg/bell.svg';
import { switchIcon } from '../../utils/config';
import { useAuth } from '../../context/AuthContext';
import { fullNameConverter, imgaeUrlConverter } from '../../utils/converter';
import { api } from '../../services/apiClient';
import { useSocket } from '../../hooks/useSocket';
import Profile from '../../assets/svg/profilre.svg';
import Toast from 'react-native-toast-message';
import ForegroundService, { registerLocationModalHandler } from '../../services/BankgroundSync';
import usePermissions from '../../hooks/usePermissions';
import BellSvgCode from '../../assets/svg/BellCodeSvg';
import { getCurrentLocation } from '../../services/driverLocationTracker';
import GlobalStatusBar from '../GlobalStatusBar';

const NAVY = '#014D4D';
const GOLD = '#D0A645';

export default function Header(props: any) {
  const navigation = useNavigation<any>();
  const { requestLocationPermissionsBg, LocationPermissionModal: BgLocationPermissionModal } = usePermissions();

  const {
    showBadge = true,
    showNotification = true,
    simpleHeader = true,
    simpleHeaderTitle = '',
    showBackButton = true,
  } = props;

  const { user, setUser, isOnline, setIsOnline } = useAuth();
  const { socket } = useSocket();
  const modalResolveRef = React.useRef<((v: boolean) => void) | null>(null);

  // ── Animation refs ──────────────────────────────────────────
  const thumbAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: isOnline ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [isOnline]);

  React.useEffect(() => {
    registerLocationModalHandler((onAllow, onDeny) => {
      modalResolveRef.current = (v) => (v ? onAllow() : onDeny());
    });
  }, []);

  const isMounted = React.useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (isOnline) {
      requestLocationPermissionsBg().then(perm => { if (perm) ForegroundService.start(); });
    } else {
      ForegroundService.stop();
    }
  }, [isOnline]);

  const gotoOnline = async () => {
    const perm = await requestLocationPermissionsBg();
    if (!perm) return;
    try {
      const location = await getCurrentLocation();
      console.log(location)
      const res = await api.post('/user/auth/isOnline', { status: !isOnline , latitude:location.lat , longitude:location.long });
      if (res.data.success) {
        setIsOnline(!isOnline);
        setUser((pre: any) => ({ ...pre, isOnline: !isOnline }));
        const payload = { driverID: user.driverID, lat: 0, long: 0 };
        socket?.emit(!isOnline ? 'DRIVER_ONLINE' : 'DRIVER_OFFLINE', payload);
        Toast.show({ type: 'info', text1: !isOnline ? 'You are now online' : 'You are now offline' });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const profileImageUri = user?.selfiePhoto
    ? user.selfiePhoto.startsWith('file://')
      ? imgaeUrlConverter(user.selfiePhoto)
      : `${imgaeUrlConverter(user.selfiePhoto)}?t=${user.updatedAt || Date.now()}`
    : null;
  const hideDriverInfo = !simpleHeader && simpleHeaderTitle === 'Trips';

  return (
    <LinearGradient
      colors={[NAVY, '#014D4D', '#014D4D', NAVY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        // {
        //   paddingTop:
        //     Platform.OS === 'ios'
        //       ? scale(10)
        //       : (StatusBar.currentHeight || 0) + scale(8),
        // },
      ]}
    >
      <GlobalStatusBar/>
      <BgLocationPermissionModal />


      {simpleHeader ? (
        <View style={[styles.row, {
          paddingVertical: 10
        }]}>
          {showBackButton && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backBtn}
            >
              <BackIcon color={Colors.white}  />
            </TouchableOpacity>
          )}
          <Text style={styles.simpleTitle}>{simpleHeaderTitle}</Text>
        </View>
      ) : (

        <View style={styles.row}>
          {!hideDriverInfo && (
            <View style={styles.avatarRing}>
              <Image
                style={styles.avatar}
                source={profileImageUri ? { uri: profileImageUri } : Profile}
              />
            </View>
          )}

          {/* Name */}
          <View style={[styles.driverInfo, hideDriverInfo && styles.tripHeaderTitleWrap]}>
            {!hideDriverInfo && (
              <>
                {/* <Text style={styles.greeting}>Welcome back 👋</Text> */}
                <Text style={styles.driverName} numberOfLines={1} ellipsizeMode="tail">
                  {fullNameConverter(user?.firstName, user?.surName)}
                </Text>
              </>
            )}


{showBackButton && (
           <View style={[styles.row, {
          paddingVertical: 10
        }]}>
          
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backBtn}
            >
              <BackIcon color={Colors.white} />
            </TouchableOpacity>
          <Text style={styles.simpleTitle}>{simpleHeaderTitle}</Text>
        </View>
          )}

          </View>

          {/* Online / Offline toggle */}
          {showBadge && (
            <TouchableOpacity
              onPress={gotoOnline}
              activeOpacity={0.9}
              style={styles.toggleWrapper}
            >
              <View style={styles.switchTrack}>
                <Text
                  style={[
                    styles.toggleLabel,
                    { marginLeft: isOnline ? 0 : 30, marginRight: isOnline ? 30 : 0 },
                  ]}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
                <Animated.View
                  style={[
                    styles.switchThumb,
                    {
                      backgroundColor: isOnline ? '#28C64E' : '#E53935',
                      transform: [
                        {
                          translateX: thumbAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [2, 76],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image source={switchIcon} style={styles.thumbIcon} />
                </Animated.View>
              </View>
            </TouchableOpacity>
          ) }
          {showNotification && (
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notification')}>
              {/* <Bell /> */}
              <BellSvgCode />
            </TouchableOpacity>)}
        </View>
      )}

      {/* Gold bottom accent */}
      {/* <View style={styles.goldBar} /> */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: vw(100),
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: vw(4),
    // paddingTop:20
  },
  decorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: scale(6),
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.3,
    marginHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingBottom: scale(14),
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  simpleTitle: {
    fontSize: fontScale(16),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  avatarRing: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 50,
    padding: 2,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 44,
  },
  driverInfo: {
    flex: 1,
    marginLeft: vw(3),
  },
  tripHeaderTitleWrap: {
    marginLeft: 0,
  },
  greeting: {
    fontSize: fontScale(11),
    color: GOLD,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  driverName: {
    fontSize: fontScale(16),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginRight: 14
  },
  track: {
    width: 80,
    height: 35,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  trackLabel: {
    fontSize: fontScale(10),
    fontWeight: '800',
    letterSpacing: 0.6,
    zIndex: 0,
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },


  bellBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  goldBar: {
    height: 3,
    width: '100%',
    backgroundColor: GOLD,
    borderRadius: 2,
  },


  switchTrack: {
    width: 108,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F7',
    justifyContent: 'center',
    position: 'relative',
  },

  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },

  thumbIcon: {
    width: 16,
    height: 16,
    tintColor: Colors.white,
  },

  toggleLabel: {
    fontSize: fontScale(14),
    fontWeight: '700',
    color: '#465166',
    textAlign: 'center',
    includeFontPadding: false,
  },

});
