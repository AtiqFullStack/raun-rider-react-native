import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { strings } from '../../constants/strings';
import { scale, verticalScale, fontScale } from '../../utils/scaling';
import { Country, State } from '../../services/locationService';
import { CountryCode } from '../../services/countriesCode';
import Eye from '../../assets/icons/eye.svg';
import Lock from '../../assets/icons/lock.svg';
import Email from '../../assets/icons/email.svg';
import User from '../../assets/icons/user.svg';
import DropdownIcon from '../../assets/icons/Vector.svg';
import CheckIcon from '../../assets/svg/ticks.svg';
import { SvgUri } from 'react-native-svg';
import UploadBox from './UploadBox';
import BottomSheet from '../common/BottomSheet';
import { AppService } from '../../context/AppServicesContext';
import { IMAGE_URL } from '../../utils/config';

type VehicleCategory = {
  _id: string; name: string; icon: string; isActive: boolean;
  serviceId?: { _id: string; name: string; title: string } | null;
};

const genders = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

interface PersonalStepProps {
  formData: any;
  errors: { email: string; password: string; confirmPassword: string; phone: string; zipCode: string };
  uploadingFields: Record<string, boolean>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  countries: Country[];
  states: State[];
  countryCodes: CountryCode[];
  selectedCountry: Country | null;
  showCountryModal: boolean;
  showStateModal: boolean;
  showCountryCodeModal: boolean;
  loadingCountries: boolean;
  loadingStates: boolean;
  loadingCountryCodes: boolean;
  countrySearch: string;
  stateSearch: string;
  // NEW: Services and Category
  appServices: AppService[];
  vehicleCategories: VehicleCategory[];
  selectedServices: AppService[];
  selectedCategory: VehicleCategory | null;
  loadingServices: boolean;
  loadingCategories: boolean;
  onFieldChange: (field: string, value: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onZipCodeChange: (v: string) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onOpenImagePicker: (field: string) => void;
  onSelectCountry: (c: Country) => void;
  onSelectState: (s: State) => void;
  onSelectCountryCode: (code: string) => void;
  onSelectServices: (services: AppService[]) => void;
  onSelectCategory: (cat: VehicleCategory) => void;
  setShowCountryModal: (v: boolean) => void;
  setShowStateModal: (v: boolean) => void;
  setShowCountryCodeModal: (v: boolean) => void;
  setCountrySearch: (v: string) => void;
  setStateSearch: (v: string) => void;
}

const PersonalStep: React.FC<PersonalStepProps> = ({
  formData, errors, uploadingFields,
  showPassword, showConfirmPassword,
  countries, states, countryCodes, selectedCountry,
  showCountryModal, showStateModal, showCountryCodeModal,
  loadingCountries, loadingStates, loadingCountryCodes,
  countrySearch, stateSearch,
  appServices, vehicleCategories, selectedServices, selectedCategory, loadingServices, loadingCategories,
  onFieldChange, onEmailChange, onPhoneChange, onPasswordChange,
  onConfirmPasswordChange, onZipCodeChange,
  onTogglePassword, onToggleConfirmPassword, onOpenImagePicker,
  onSelectCountry, onSelectState, onSelectCountryCode, onSelectServices, onSelectCategory,
  setShowCountryModal, setShowStateModal, setShowCountryCodeModal,
  setCountrySearch, setStateSearch,
}) => {
  const [showServicesSheet, setShowServicesSheet] = React.useState(false);
  const [showCategorySheet, setShowCategorySheet] = React.useState(false);
  return (
    <View style={styles.inputbox}>
      {/* First Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.firstName}</Text>
        <View style={styles.inputWrapper}>
          <User width={18} height={18} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder={strings.enterFirstName}
            placeholderTextColor={Colors.secondary}
            value={formData.firstName}
            onChangeText={v => onFieldChange('firstName', v)}
          />
        </View>
      </View>

      {/* Last Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.surName}</Text>
        <View style={styles.inputWrapper}>
          <User width={18} height={18} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder={strings.enterSurName}
            placeholderTextColor={Colors.secondary}
            value={formData.lastName}
            onChangeText={v => onFieldChange('lastName', v)}
          />
        </View>
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.email}</Text>
        <View style={styles.inputWrapper}>
          <Email width={18} height={18} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder={strings.enterYourEmail}
            placeholderTextColor={Colors.secondary}
            value={formData.email}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

      {/* Phone */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.phoneNumber}</Text>
        <View style={styles.phoneWrapper}>
          <TouchableOpacity style={styles.countryCodeContainer} onPress={() => setShowCountryCodeModal(true)}>
            <Text style={styles.countryCode}>{formData.countryCode}</Text>
            <DropdownIcon width={12} height={12} />
          </TouchableOpacity>
          <TextInput
            style={styles.phoneInput}
            placeholder={strings.enterPhoneNumber}
            placeholderTextColor={Colors.secondary}
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={onPhoneChange}
          />
        </View>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

      </View>

        <Text style={styles.label}>{'Gender'}</Text>
     <View style={{flexDirection:"row",gap:30}}>
       {genders.map((gender) => {
        const isSelected = formData.gender === gender.id;

        return (
          <TouchableOpacity
            key={gender.id}
            // onChangeText={v => onFieldChange('lastName', v)}
            onPress={() => onFieldChange("gender",gender.id)}
            style={styles.genderOption}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioDot} />}
            </View>

            <Text style={styles.genderLabel}>{gender.label}</Text>
          </TouchableOpacity>
        );
      })}
     </View>

      {/* Identity Document */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.identityDocument}</Text>
        <UploadBox
          file={formData.uploadDoc}
          label={strings.uploadDocument}
          width={'100%'} height={92} center
          uploading={uploadingFields['uploadDoc']}
          onPress={() => onOpenImagePicker('uploadDoc')}
          showSizeText={false}
        />
      </View>

      {/* Selfie */}
      <View style={[styles.inputContainer, {
        marginTop: verticalScale(30)
      }]}>
        <Text style={styles.label}>{strings.uploadClearSelfie}</Text>
        {/* <Text style={styles.selfieHint}>
          Hold an ID or Driver's License next to or just below your face while taking the selfie.
        </Text> */}
        <UploadBox
          file={formData.portraitPhoto}
          label={strings.uploadClearSelfie}
          width={"100%"} height={92} center
          uploading={uploadingFields['portraitPhoto']}
          onPress={() => onOpenImagePicker('portraitPhoto')}
          showSizeText={false}
        />
      </View>

      {/* Address */}
      <View style={[styles.inputContainer, {
        marginTop: verticalScale(25)
      }]}>
        <Text style={styles.boldLabel}>{strings.address}</Text>
        <Text style={styles.label}>{strings.streetAddress1}</Text>
        <TextInput
          style={styles.input}
          placeholder={strings.enterAddress}
          placeholderTextColor={Colors.secondary}
          value={formData.address1}
          onChangeText={v => onFieldChange('address1', v)}
        />
        <Text style={styles.label}>{strings.streetAddress2}</Text>
        <TextInput
          style={styles.input}
          placeholder={strings.enterAddress}
          placeholderTextColor={Colors.secondary}
          value={formData.address2}
          onChangeText={v => onFieldChange('address2', v)}
        />
      </View>

      {/* Country */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.country}</Text>
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCountryModal(true)}>
          <Text style={[styles.selectInputText, !formData.country && styles.placeholder]} numberOfLines={1}>
            {formData.country || strings.selectCountry}
          </Text>
          <DropdownIcon width={12} height={12} />
        </TouchableOpacity>
      </View>

      {/* City + State */}
      <View style={styles.rowContainer}>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city"
            placeholderTextColor={Colors.secondary}
            value={formData.city}
            onChangeText={v => onFieldChange('city', v)}
          />
        </View>
        <View style={styles.halfInputContainer}>
          <Text style={styles.label}>State/Province</Text>
          <TouchableOpacity
            style={[styles.inputWrapper, !selectedCountry && styles.disabled]}
            onPress={() => selectedCountry && setShowStateModal(true)}
            disabled={!selectedCountry}
          >
            <Text style={[styles.selectInputText, !formData.state && styles.placeholder]} numberOfLines={1}>
              {formData.state || 'Select your state'}
            </Text>
            <DropdownIcon width={12} height={12} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zip Code */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Zip Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter zip code"
          placeholderTextColor={Colors.secondary}
          value={formData.zipCode}
          onChangeText={onZipCodeChange}
          keyboardType="numeric"
        />
        {errors.zipCode ? <Text style={styles.errorText}>{errors.zipCode}</Text> : null}
      </View>

      {/* Proof of Address */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Upload proof of address </Text>
        <UploadBox
          file={formData.proofOfAddress}
          label="Upload utility bill / affidavit"
          width={'100%'} height={92} center
          uploading={uploadingFields['proofOfAddress']}
          onPress={() => onOpenImagePicker('proofOfAddress')}
          showSizeText={false}
        />
      </View>

      {/* Services */}
      <View style={styles.inputContainer}>
        <Text style={[styles.boldLabel, { marginTop: verticalScale(25) }]}>Services</Text>
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowServicesSheet(true)}>
          <Text style={[styles.selectInputText, selectedServices.length === 0 && styles.placeholder]} numberOfLines={1}>
            {selectedServices.length > 0 ? selectedServices.map(s => s.name).join(', ') : 'Select services'}
          </Text>
          <DropdownIcon width={12} height={12} />
        </TouchableOpacity>
      </View>

      {/* Vehicle Category */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Choose Vehicle Category</Text>
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCategorySheet(true)}>
          {selectedCategory ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Image
                source={{ uri: `${IMAGE_URL}/${selectedCategory.icon.replace(/\\/g, '/')}` }}
                style={{ width: 28, height: 28, borderRadius: 5, marginRight: 8 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectInputText}>{selectedCategory.name}</Text>
                {selectedCategory.serviceId && (
                  <Text style={styles.serviceBadge}>{selectedCategory.serviceId.title}</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={[styles.selectInputText, styles.placeholder]}>Select vehicle category</Text>
          )}
          <DropdownIcon width={12} height={12} />
        </TouchableOpacity>
      </View>

      {/* Password */}
      <View style={[styles.inputContainer, {
        marginTop: 25
      }]}>
        <Text style={styles.label}>{strings.password}</Text>
        <View style={styles.inputWrapper}>
          <Lock width={18} height={18} />
          <TextInput
            style={styles.passwordInput}
            placeholder={strings.enterYourPassword}
            placeholderTextColor={Colors.secondary}
            value={formData.password}
            onChangeText={onPasswordChange}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={onTogglePassword}>
            <Eye width={18} height={18} />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{strings.confirmPassword}</Text>
        <View style={styles.inputWrapper}>
          <Lock width={18} height={18} />
          <TextInput
            style={styles.passwordInput}
            placeholder={strings.confirmPasswordPlaceholder}
            placeholderTextColor={Colors.secondary}
            value={formData.confirmPassword}
            onChangeText={onConfirmPasswordChange}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={onToggleConfirmPassword}>
            <Eye width={18} height={18} />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
      </View>

      {/* Country Code Modal */}
      <Modal visible={showCountryCodeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{strings.selectCountryCode}</Text>
            {loadingCountryCodes ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={countryCodes}
                keyExtractor={item => item.iso}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => onSelectCountryCode(item.code)}>
                    <Text style={styles.modalItemText}>{item.name} ({item.code})</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCountryCodeModal(false)}>
              <Text style={styles.modalCloseText}>{strings.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Country Modal */}
      <Modal visible={showCountryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{strings.selectCountryTitle}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor={Colors.secondary}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
            {loadingCountries ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => { onSelectCountry(item); setCountrySearch(''); }}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowCountryModal(false); setCountrySearch(''); }}>
              <Text style={styles.modalCloseText}>{strings.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* State Modal */}
      <Modal visible={showStateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{strings.selectStateTitle}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search state..."
              placeholderTextColor={Colors.secondary}
              value={stateSearch}
              onChangeText={setStateSearch}
            />
            {loadingStates ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={states.filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase()))}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => { onSelectState(item); setStateSearch(''); }}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowStateModal(false); setStateSearch(''); }}>
              <Text style={styles.modalCloseText}>{strings.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Services Bottom Sheet */}
      <BottomSheet visible={showServicesSheet} onClose={() => setShowServicesSheet(false)}>
        <Text style={styles.sheetTitle}>Select Services</Text>
        {loadingServices ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={appServices}
            keyExtractor={item => item._id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => {
              const isSelected = selectedServices.some(s => s._id === item._id);
              return (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    const updated = isSelected
                      ? selectedServices.filter(s => s._id !== item._id)
                      : [...selectedServices, item];
                    onSelectServices(updated);
                  }}
                >
                  <Text style={styles.sheetItemText}>{item.name}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <CheckIcon width={14} height={14} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </BottomSheet>

      {/* Category Bottom Sheet */}
      <BottomSheet visible={showCategorySheet} onClose={() => setShowCategorySheet(false)}>
        <Text style={styles.sheetTitle}>Select Category</Text>
        {loadingCategories ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={selectedServices.length > 0
              ? vehicleCategories.filter(c => c.serviceId && selectedServices.some(s => s._id === c.serviceId!._id))
              : vehicleCategories
            }
            keyExtractor={item => item._id}
            style={{ maxHeight: 400 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No categories for selected services</Text>}
            renderItem={({ item }) => {
              const iconUrl = `${IMAGE_URL}/${item.icon.replace(/\\/g, '/')}`;
              const isSvg = iconUrl.toLowerCase().endsWith('.svg');
              const isSelected = selectedCategory?._id === item._id;
              return (
                <TouchableOpacity
                  style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                  onPress={() => { onSelectCategory(item); setShowCategorySheet(false); }}
                >
                  {isSvg
                    ? <SvgUri uri={iconUrl} width={36} height={36} style={styles.categoryThumb} />
                    : <Image source={{ uri: iconUrl }} style={styles.categoryThumb} resizeMode="cover" />
                  }
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.sheetItemText}>{item.name}</Text>
                    {item.serviceId && <Text style={styles.serviceBadge}>{item.serviceId.title}</Text>}
                  </View>
                  {isSelected && <CheckIcon width={18} height={18} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  inputbox: {},
  inputContainer: {
    // marginTop:verticalScale()
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
  selfieHint: {
    fontSize: fontScale(12),
    color: Colors.gray,
    marginBottom: verticalScale(8),
    fontFamily: 'Rubik-Regular',
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
  selectInputText: {
    flex: 1,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(10),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
  },
  eyeIcon: { paddingRight: scale(15) },
  phoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scale(388),
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(4),
    backgroundColor: '#fff',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    borderRightWidth: 1,
    borderRightColor: '#E6E7EE',
    gap: scale(5),
  },
  countryCode: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: scale(10),
    paddingVertical: 0,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    textAlignVertical: 'center',
  },
  errorText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#FF0000',
    marginTop: verticalScale(4),
  },
  placeholder: {
    color: Colors.secondary,
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
  },
  disabled: { opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: '#000',
  },

  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },

  genderLabel: {
    marginLeft: 10,
    fontSize: 16,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#E6E7EE',
    borderRadius: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
    backgroundColor: '#fff',
    marginBottom: verticalScale(12),
  },
  modalItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E6E7EE',
  },
  modalItemText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik',
    color: '#2A2A2A',
  },
  modalClose: {
    marginTop: verticalScale(15),
    paddingVertical: verticalScale(10),
    backgroundColor: Colors.primary,
    borderRadius: scale(4),
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik',
    color: '#fff',
    fontWeight: '500',
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
  emptyText: {
    fontSize: fontScale(14), fontFamily: 'Rubik-Regular',
    color: '#9CA3AF', textAlign: 'center', paddingVertical: verticalScale(24),
  },
});

export default PersonalStep;
