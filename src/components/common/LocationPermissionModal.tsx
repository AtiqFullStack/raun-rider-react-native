import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { fontScale, scale, vw } from '../../utils/scaling';

interface Props {
  visible: boolean;
  onDeny: () => void;
  onAllow: () => void;
}

export default function LocationPermissionModal({ visible, onDeny, onAllow }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>📍</Text>
          </View>

          <Text style={styles.title}>Background Location Access</Text>

          <Text style={styles.subtitle}>
            To keep deliveries running smoothly, <Text style={styles.bold}>Truck'N Bike</Text> needs your location even when the app is closed.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Why we need this:</Text>

          {[
            { icon: '🚚', text: 'Show your live location to customers during active deliveries' },
            { icon: '🗺️', text: 'Track delivery routes for accurate ETAs' },
            { icon: '🔔', text: 'Auto-update delivery status without opening the app' },
          ].map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <Text style={styles.rowText}>{item.text}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 Location is shared <Text style={styles.bold}>only with customers & dispatchers</Text> while you're online. Collection stops when you go offline.
            </Text>
          </View>

          <Text style={styles.hint}>
            {Platform.Version >= 30
              ? 'You will be taken to Settings. Select ' + '"Location" → "Allow all the time"'
              : 'On the next screen, select "Allow all the time"'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.denyBtn} onPress={onDeny}>
              <Text style={styles.denyText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.allowBtn} onPress={onAllow}>
              <Text style={styles.allowText}>Allow Access</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: vw(5),
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: scale(20),
    width: '100%',
  },
  iconContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.lightRed,
    borderRadius: 50,
    width: scale(56),
    height: scale(56),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  iconText: { fontSize: scale(26) },
  title: {
    fontSize: fontScale(18),
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: scale(6),
  },
  subtitle: {
    fontSize: fontScale(13),
    color: Colors.subtitle,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: scale(14),
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderColor1,
    marginVertical: scale(12),
  },
  sectionTitle: {
    fontSize: fontScale(13),
    fontWeight: '600',
    color: Colors.black,
    marginBottom: scale(8),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    marginBottom: scale(7),
  },
  rowIcon: { fontSize: scale(14), marginTop: 1 },
  rowText: {
    fontSize: fontScale(12),
    color: Colors.subtitle,
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: Colors.liteCardBg,
    borderRadius: 10,
    padding: scale(10),
    marginBottom: scale(10),
  },
  infoText: {
    fontSize: fontScale(12),
    color: Colors.black1,
    lineHeight: 18,
  },
  hint: {
    fontSize: fontScale(12),
    color: Colors.subtitle,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  bold: { fontWeight: '700', color: Colors.black },
  buttonRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  denyBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.borderColor2,
    borderRadius: 12,
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  denyText: {
    fontSize: fontScale(14),
    fontWeight: '600',
    color: Colors.subtitle,
  },
  allowBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  allowText: {
    fontSize: fontScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
});
