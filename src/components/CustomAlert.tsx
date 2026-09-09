import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { scale, fontScale } from '../utils/scaling';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  buttons: AlertButton[];
  onDismiss?: () => void;
};

export default function CustomAlert({ visible, title, message, icon, buttons, onDismiss }: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          {icon ? (
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.btnRow}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  btn.style === 'destructive' && styles.destructiveBtn,
                  btn.style === 'cancel' && styles.cancelBtn,
                  btn.style !== 'cancel' && styles.primaryBtn,
                ]}
                onPress={btn.onPress}
              >
                <Text
                  style={[
                    styles.btnText,
                    btn.style !== 'cancel' && styles.primaryText,
                    btn.style === 'destructive' && styles.destructiveText,
                    btn.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: scale(18),
    paddingTop: scale(22),
    paddingHorizontal: scale(20),
    paddingBottom: scale(18),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: scale(18),
    shadowOffset: { width: 0, height: scale(8) },
    elevation: 12,
  },
  iconBox: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    backgroundColor: Colors.lightRed,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: scale(14),
  },
  icon: {
    fontSize: fontScale(28),
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(18),
    color: Colors.black,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  message: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.subtitle,
    textAlign: 'center',
    lineHeight: fontScale(20),
    marginBottom: scale(22),
  },
  btnRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  btn: {
    flex: 1,
    minHeight: scale(46),
    paddingHorizontal: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(12),
  },
  primaryBtn: {
    backgroundColor: Colors.secondaryDark,
  },
  cancelBtn: {
    backgroundColor: Colors.quoteBg,
  },
  destructiveBtn: {
    backgroundColor: Colors.lightRed,
  },
  btnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.primary,
    textAlign: 'center',
  },
  primaryText: {
    color: Colors.white,
  },
  cancelText: {
    color: Colors.subtitle,
  },
  destructiveText: {
    color: Colors.white,
  },
});
