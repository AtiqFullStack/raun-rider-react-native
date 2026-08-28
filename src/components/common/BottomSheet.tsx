import React, { useEffect, useRef } from 'react';
import {
  Animated, StyleSheet, TouchableOpacity, View, Modal, PanResponder,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { scale } from '../../utils/scaling';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, children }) => {
  const translateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) { onClose(); }
        else { Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(); }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: scale(36),
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
  },
  handle: {
    width: scale(36), height: 4, borderRadius: 2,
    backgroundColor: Colors.borderColor2, alignSelf: 'center', marginBottom: scale(16),
  },
});
