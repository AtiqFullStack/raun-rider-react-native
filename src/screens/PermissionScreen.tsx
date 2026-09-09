import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors } from '../constants/Colors';
import { fontScale, scale } from '../utils/scaling';

interface Props {
  onRequestPermissions: () => void;
}

export default function PermissionScreen({ onRequestPermissions }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.emoji}>📍</Text>
      </View>

      <Text style={styles.title}>Permissions Required</Text>
      <Text style={styles.subtitle}>
        To use Truck'N Bike, we need access to the following:
      </Text>

      <View style={styles.list}>
        {[
          { icon: '📷', label: 'Camera — for uploading photos' },
          { icon: '📍', label: 'Location — to find nearby orders' },
          { icon: '🔔', label: 'Notifications — for order alerts' },
        ].map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listIcon}>{item.icon}</Text>
            <Text style={styles.listLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={onRequestPermissions}>
        <Text style={styles.btnText}>Grant Permissions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(30),
  },
  iconWrapper: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
  },
  emoji: {
    fontSize: fontScale(40),
  },
  title: {
    fontFamily: 'Baloo2-ExtraBold',
    fontSize: fontScale(22),
    color: Colors.black,
    marginBottom: scale(10),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.Textgray,
    textAlign: 'center',
    marginBottom: scale(28),
  },
  list: {
    width: '100%',
    marginBottom: scale(36),
    gap: scale(14),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: scale(12),
    padding: scale(14),
    gap: scale(12),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listIcon: {
    fontSize: fontScale(20),
  },
  listLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.black,
  },
  btn: {
    backgroundColor: Colors.secondaryDark,
    width: '100%',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(15),
    color: Colors.white,
  },
});
