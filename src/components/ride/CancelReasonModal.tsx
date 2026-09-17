import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CrossIcon from '../../assets/svg/cross.svg';
import { Colors } from '../../constants/Colors';
import { fontScale, scale } from '../../utils/scaling';

const CANCEL_REASONS = [
  'Vehicle breakdown',
  'Personal emergency',
  'Wrong location',
  'Customer not responding',
  'Other',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function CancelReasonModal({ visible, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const handleSelect = (reason: string) => {
    setSelected(reason);
    if (reason !== 'Other') onConfirm(reason);
  };

  const handleSubmit = () => {
    if (!custom.trim()) return;
    onConfirm(custom.trim());
  };

  const handleClose = () => {
    setSelected(null);
    setCustom('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Reason</Text>
            <TouchableOpacity onPress={handleClose}>
              <CrossIcon width={20} height={20} />
            </TouchableOpacity>
          </View>

          {CANCEL_REASONS.map((reason) => (
            <TouchableOpacity key={reason} style={styles.item} onPress={() => handleSelect(reason)}>
              <View style={[styles.radio, selected === reason && styles.radioSelected]} />
              <Text style={styles.itemText}>{reason}</Text>
            </TouchableOpacity>
          ))}

          {selected === 'Other' && (
            <>
              <TextInput
                placeholder="Enter reason"
                placeholderTextColor={Colors.placeholder}
                value={custom}
                onChangeText={setCustom}
                style={styles.input}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    paddingBottom: scale(36),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16) },
  title: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(16), color: Colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(12), borderBottomWidth: 1, borderColor: Colors.divider },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border, marginRight: scale(12) },
  radioSelected: { borderColor: Colors.primaryDark, backgroundColor: Colors.primaryDark },
  itemText: { fontFamily: 'Rubik-Regular', fontSize: fontScale(14), color: Colors.text },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: scale(10),
    padding: scale(12), marginTop: scale(12),
    fontFamily: 'Rubik-Regular', color: Colors.text,
  },
  submitBtn: {
    marginTop: scale(12), backgroundColor: Colors.primaryDark,
    padding: scale(14), borderRadius: scale(10), alignItems: 'center',
  },
  submitText: { color: Colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14) },
});
