import React from 'react';
import { TouchableOpacity, Image, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import ImageUpload from '../../assets/svg/uploadImage.svg';
import { colors, Colors } from '../../constants/Colors';
import { fontScale } from '../../utils/scaling';

interface UploadBoxProps {
  file: any;
  label: string;
  onPress: () => void;
  size?: number;
  width?: number | string;
  height?: number;
  center?: boolean;
  uploading?: boolean;
  showSizeText?: boolean;
}

const UploadBox: React.FC<UploadBoxProps> = ({
  file,
  label,
  onPress,
  size,
  width,
  height,
  center = false,
  uploading = false,
  showSizeText = true,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.uploadButton,
      {
        width: size ?? width ?? 100,
        height: size ?? height ?? 100,
        alignSelf: center ? 'center' : 'auto',
      },
    ]}
  >
    {uploading ? (
      <ActivityIndicator size="small" color={Colors.primary} />
    ) : file ? (
      file.type?.includes('pdf') ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 30 }}>📄</Text>
          <Text numberOfLines={1}>{file.name}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: file.uri }}
          style={styles.uploadedImage}
          resizeMode="contain"
        />
      )
    ) : (
      <>
        <View style={styles.uploadIconWrapper}>
          <ImageUpload width={15} height={15} color={'white'}/>
        </View>

        <Text style={styles.uploadText} numberOfLines={2}>{label}</Text>

        {showSizeText && (
          <Text style={styles.uploadText}>Size Max 2 MB</Text>
        )}
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
uploadButton: {
  minWidth: 100,
  minHeight: 100,
  borderWidth: 1,
  borderColor: Colors.borderColor,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: Colors.imageUploadBox,
  borderStyle: 'dotted',
  padding: 8,
},
  uploadedImage: { width: '100%', height: '100%' },
  uploadIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 50,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default UploadBox;
