import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Colors } from '../constants/Colors';

interface Props {
  visible: boolean;
  text?: string;
}

const GlobalLoader: React.FC<Props> = ({ visible, text }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.title}>{text || 'Please wait...'}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default GlobalLoader;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 15,
    color: '#444',
    // fontWeight: '500',
  },
});
