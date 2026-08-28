import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/Colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onPdf?: () => void;
  onDocument?: () => void;
}

const ImagePickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onCamera,
  onGallery,
  onPdf,
  onDocument,
}) => {
  const didShowActionSheet = useRef(false);

  useEffect(() => {
    if (!visible) {
      didShowActionSheet.current = false;
      return;
    }

    if (Platform.OS !== 'ios' || didShowActionSheet.current) {
      return;
    }

    didShowActionSheet.current = true;

    const hasDocumentOption = Boolean(onPdf || onDocument);
    const options = hasDocumentOption
      ? ['Take Photo', 'Choose from Gallery', 'Upload PDF', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Cancel'];
    const cancelButtonIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Upload Photo',
        options,
        cancelButtonIndex,
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          onCamera();
          return;
        }

        if (buttonIndex === 1) {
          onGallery();
          return;
        }

        if (hasDocumentOption && buttonIndex === 2) {
          (onDocument ?? onPdf)?.();
          return;
        }

        onClose();
      },
    );
  }, [visible, onClose, onCamera, onGallery, onPdf, onDocument]);

  if (Platform.OS === 'ios') {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Upload Photo</Text>

          <TouchableOpacity style={styles.option} onPress={onCamera}>
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onGallery}>
            <Ionicons name="image-outline" size={22} color={Colors.primary} />
            <Text style={styles.optionText}>Choose from Gallery</Text>
          </TouchableOpacity>

          {(onPdf || onDocument) && (
            <TouchableOpacity style={styles.option} onPress={onDocument ?? onPdf}>
              <Ionicons name="document-outline" size={22} color={Colors.primary} />
              <Text style={styles.optionText}>Upload PDF</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ImagePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 16,
    // fontWeight: '500',
  },
});
