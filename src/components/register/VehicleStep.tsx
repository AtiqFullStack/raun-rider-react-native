import React, { useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Image,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { strings } from '../../constants/strings';
import { scale, verticalScale, fontScale } from '../../utils/scaling';
import { IMAGE_URL } from '../../utils/config';
import DropdownIcon from '../../assets/icons/Vector.svg';
import CheckIcon from '../../assets/svg/ticks.svg';
import { SvgUri } from 'react-native-svg';
import UploadBox from './UploadBox';
import Toast from 'react-native-toast-message';
import BottomSheet from '../common/BottomSheet';
import { AppService } from '../../context/AppServicesContext';

type VehicleCategory = {
  _id: string; name: string; icon: string; isActive: boolean;
  serviceId?: { _id: string; name: string; title: string } | null;
};
type VehicleSubcategory = {
  _id: string; categoryId: string; name: string;
  height: number; length: number; width: number;
  minWeight: number; maxWeight: number; image: string; isActive: boolean;
};

interface VehicleStepProps {
  formData: any;
  uploadingFields: Record<string, boolean>;
  vehicleCategories: VehicleCategory[];
  subcategories: VehicleSubcategory[];
  selectedCategory: VehicleCategory | null;
  selectedSubcategory: VehicleSubcategory | null;
  loadingCategories: boolean;
  loadingSubcategories: boolean;
  categoryError: string;
  subcategoryError: string;
  showTrailerModal: boolean;
  appServices: AppService[];
  loadingServices: boolean;
  selectedServices: AppService[];
  needsSubcategory: boolean;
  onFieldChange: (field: string, value: string) => void;
  onSelectCategory: (cat: VehicleCategory) => void;
  onSelectSubcategory: (sub: VehicleSubcategory) => void;
  onSelectServices: (services: AppService[]) => void;
  onOpenImagePicker: (field: string) => void;
  setShowTrailerModal: (v: boolean) => void;
}

const VEHICLE_TRAILERS = ['No Trailer', 'Flatbed', 'Tipper', 'Container Truck', 'Car carrier', 'Tanker'];

const VehicleStep: React.FC<VehicleStepProps> = ({
  formData, uploadingFields,
  vehicleCategories, subcategories,
  selectedCategory, selectedSubcategory,
  loadingCategories, loadingSubcategories,
  categoryError, subcategoryError,
  showTrailerModal,
  appServices, loadingServices, selectedServices, needsSubcategory,
  onFieldChange, onSelectCategory, onSelectSubcategory, onSelectServices,
  onOpenImagePicker, setShowTrailerModal,
}) => {
  const [showServicesSheet, setShowServicesSheet] = React.useState(false);
  const [showCategorySheet, setShowCategorySheet] = React.useState(false);
  const [showSubcategorySheet, setShowSubcategorySheet] = React.useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = React.useState(false);
console.log(vehicleCategories)
  return (
    <View style={styles.inputbox}>
      <Text style={styles.sectionTitle}>{strings.vehicleInformation}</Text>

      <View style={styles.rowContainer}>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>{strings.make}</Text>
          <TextInput style={styles.input} value={formData.vehicleMake} onChangeText={v => onFieldChange('vehicleMake', v)} />
        </View>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>{strings.modalYear}</Text>
          <TextInput style={styles.input} value={formData.vehicleYear} onChangeText={v => onFieldChange('vehicleYear', v)} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.rowContainer}>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>{strings.vehicleTrailer}</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowTrailerModal(true)}>
            <Text style={[styles.inputWithIcon, !formData.vehicleTrailer && styles.placeholder]} numberOfLines={1}>
              {formData.vehicleTrailer || strings.selectTrailerType}
            </Text>
            <DropdownIcon width={12} height={12} />
          </TouchableOpacity>
        </View>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>{strings.vehicleColor}</Text>
          <TextInput style={styles.input} value={formData.vehicleColor} onChangeText={v => onFieldChange('vehicleColor', v)} />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.vehicleRegistrationNumber}</Text>
        <TextInput style={styles.input} value={formData.registrationNumber} onChangeText={v => onFieldChange('registrationNumber', v)} />
      </View>

      {/* Vehicle Photos */}
      <Text style={styles.boldLabel}>{strings.vehiclePhotos} (Front Required)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <UploadBox file={formData.vehicleFront} showSizeText={false} label={strings.front} width="30%" height={92} uploading={uploadingFields['vehicleFront']} onPress={() => onOpenImagePicker('vehicleFront')} />
        <UploadBox file={formData.vehicleSide} showSizeText={false} label={strings.side} width="30%" height={92} uploading={uploadingFields['vehicleSide']} onPress={() => onOpenImagePicker('vehicleSide')} />
        <UploadBox file={formData.vehicleBack} showSizeText={false} label={strings.back} width="30%" height={92} uploading={uploadingFields['vehicleBack']} onPress={() => onOpenImagePicker('vehicleBack')} />
      </View>

      {/* Documents */}
      <Text style={[styles.boldLabel, { marginTop: 20 }]}>{strings.documents}</Text>
      <Text style={styles.label}>{strings.vehicleRegistration}</Text>
      <UploadBox file={formData.vehicleRegistration} label={strings.vehicleRegistration} width={"100%"} height={92} center uploading={uploadingFields['vehicleRegistration']} onPress={() => onOpenImagePicker('vehicleRegistration')}  showSizeText={false}/>
      <Text style={styles.label}>{strings.insurance} (Optional)</Text>
      <UploadBox file={formData.insurance} label={`${strings.insurance} (Optional)`} width={"100%"}  height={92} center uploading={uploadingFields['insurance']} onPress={() => onOpenImagePicker('insurance')} showSizeText={false} />
      <Text style={styles.label}>Driver's License</Text>
      <UploadBox file={formData.drivingLicense} label="Upload Driving License" width={"100%"}  height={92} center uploading={uploadingFields['drivingLicense']} onPress={() => onOpenImagePicker('drivingLicense')}  showSizeText={false}/>

      {/* Trailer Modal */}
      <BottomSheet visible={showTrailerModal} onClose={() => setShowTrailerModal(false)}>
        <Text style={styles.sheetTitle}>{strings.selectVehicleTrailer}</Text>
        <FlatList
          data={VEHICLE_TRAILERS}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.sheetItem} onPress={() => { onFieldChange('vehicleTrailer', item); setShowTrailerModal(false); }}>
              <Text style={styles.sheetItemText}>{item}</Text>
              {formData.vehicleTrailer === item && <CheckIcon width={16} height={16} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  inputbox: {},
  inputContainer: {},
  sectionTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Baloo',
    fontWeight: '700',
    color: Colors.black,
    marginBottom: verticalScale(20),
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(17),
  },
  halfInputContainer: { width: '49%' },
  label: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    marginTop: verticalScale(10),
    color: Colors.blackSecondary,
    marginBottom: verticalScale(7),
  },
  boldLabel: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-SemiBold',
    marginTop: verticalScale(10),
    color: Colors.blackSecondary,
    marginBottom: verticalScale(10),
  },
  input: {
    width: '100%',
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    marginBottom: 10,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(10),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    backgroundColor: '#fff',
    paddingHorizontal: scale(12),
    gap: scale(8),
  },
  inputWithIcon: {
    flex: 1,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    includeFontPadding: false,
  },
  placeholder: { color: Colors.secondary },
  errorText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#FF0000',
    marginTop: verticalScale(4),
  },
  subcategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subcategoryTitle: { fontSize: 16, fontWeight: '600' },
  subcategoryDimension: { fontSize: 12, color: '#777', marginTop: 4 },
  subcategoryCapacity: { fontSize: 14, color: '#444' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    maxHeight: '60%',
    borderRadius: scale(8),
    padding: scale(20),
  },
  modalTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Regular',
    marginBottom: verticalScale(15),
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E6E7EE',
  },
  modalItemText: { fontSize: fontScale(16), fontFamily: 'Rubik', color: '#2A2A2A' },
  modalClose: {
    marginTop: verticalScale(15),
    paddingVertical: verticalScale(10),
    backgroundColor: Colors.primary,
    borderRadius: scale(4),
    alignItems: 'center',
  },
  modalCloseText: { fontSize: fontScale(16), fontFamily: 'Rubik', color: '#fff', fontWeight: '500' },
  dropdownOverlay: { flex: 1, backgroundColor: 'transparent' },
  dropdownContent: {
    backgroundColor: Colors.bg,
    borderRadius: scale(8),
    padding: scale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sheetTitle: {
    fontSize: fontScale(17),
    fontFamily: 'Rubik-SemiBold',
    color: '#0D1633',
    marginBottom: verticalScale(12),
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetItemSelected: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    paddingHorizontal: scale(6),
  },
  sheetItemText: {
    fontSize: fontScale(15),
    fontFamily: 'Rubik-Medium',
    color: '#111827',
    flex: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryThumb: { width: 36, height: 36, borderRadius: 6 },
  serviceBadge: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.primary,
    marginTop: 2,
  },
  dimText: { fontSize: fontScale(11), color: '#777', fontFamily: 'Rubik-Regular', marginTop: 2 },
  emptyText: {
    fontSize: fontScale(14), fontFamily: 'Rubik-Regular',
    color: '#9CA3AF', textAlign: 'center', paddingVertical: verticalScale(24),
  },
});

export default VehicleStep;
