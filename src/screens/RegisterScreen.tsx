import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Modal, ActivityIndicator, BackHandler, TouchableOpacity,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import { pick as pickDocument, types as documentTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { locationService, Country, State } from '../services/locationService';
import { CountryCode, getCountryCodes } from '../services/countriesCode';
import { authService, DocumentType } from '../services/authService';
import { BASE_URL } from '../utils/config';
import Toast from 'react-native-toast-message';
import SafeWrapper from '../components/SafeWrapper';
import CustomButton from '../components/CustomButton';
import BackIcon from '../assets/svg/chevron_big_left.svg';
import { scale, verticalScale, fontScale } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { strings } from '../constants/strings';
import ImagePickerModal from '../components/ImagePickerModal';
import PersonalStep from '../components/register/PersonalStep';
import VehicleStep from '../components/register/VehicleStep';
import { useAppServices, AppService } from '../context/AppServicesContext';

interface RegisterScreenProps {
  savedFormData?: any;
  onSaveFormData: (data: any) => void;
  onNavigateToLogin: () => void;
  onNavigateToEmailVerify: (data: { email: string; message: string; registrationData?: any }) => void;
}

type VehicleCategory = {
  _id: string; name: string; icon: string; isActive: boolean;
  serviceId?: { _id: string; name: string; title: string } | null;
};
type VehicleSubcategory = {
  _id: string; categoryId: string; name: string;
  height: number; length: number; width: number;
  minWeight: number; maxWeight: number; image: string; isActive: boolean;
};

// Fields that map to backend DocumentType
const DOCUMENT_FIELD_MAP: Record<string, DocumentType> = {
  uploadDoc: 'identityDocument',
  portraitPhoto: 'selfiePhoto',
  proofOfAddress: 'proofOfAddress',
  vehicleFront: 'vehicleFront',
  vehicleSide: 'vehicleSide',
  vehicleBack: 'vehicleBack',
  vehicleRegistration: 'vehicleRegistration',
  insurance: 'insurance',
  drivingLicense: 'drivingLicense',
  uploadId: 'carTax',
};

const DEFAULT_FORM_DATA = {
  firstName: '', lastName: '', email: '', phone: '', countryCode: '+592',
  address1: '', address2: '', country: '', state: '', city: '', zipCode: '',
  uploadDoc: null, uploadId: null, portraitPhoto: null, proofOfAddress: null,
  password: '', confirmPassword: '',
  vehicleMake: '', vehicleModel: '', vehicleYear: '', vehicleColor: '',
  vehicleWidth: '1', vehicleHeight: '2', vehicleLength: '3',
  vehicleTrailer: '', registrationNumber: '', vehicleType: '', vehicleCapacity: '',
  vehicleFront: null, vehicleSide: null, vehicleBack: null,
  vehicleRegistration: null, insurance: null, drivingLicense: null,
};

// Stores uploaded file paths from server
type UploadedPaths = Partial<Record<DocumentType, string>>;

const RegisterScreen: React.FC<RegisterScreenProps> = ({
  savedFormData, onSaveFormData, onNavigateToLogin, onNavigateToEmailVerify,
}) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA, ...(savedFormData ?? {}) });
  const [uploadedPaths, setUploadedPaths] = useState<UploadedPaths>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<0 | 1>(0);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [subcategories, setSubcategories] = useState<VehicleSubcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<VehicleSubcategory | null>(null);
  const [selectedServices, setSelectedServices] = useState<AppService[]>([]);
  const { appServices, loadingServices } = useAppServices();
  const needsSubcategory = selectedServices.some(s => s.name?.toLowerCase().includes('parcel'));
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCountryCodes, setLoadingCountryCodes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [subcategoryError, setSubcategoryError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', confirmPassword: '', phone: '', zipCode: '' });
  const scrollViewRef = useRef<ScrollView>(null);
  const uploadingFieldsRef = useRef<Record<string, boolean>>({});
  const hasPendingUploads = () => Object.values(uploadingFieldsRef.current).some(Boolean);
  const isUploadingDocuments = Object.values(uploadingFields).some(Boolean) || hasPendingUploads();

  const setFieldUploading = (field: string, isUploading: boolean) => {
    uploadingFieldsRef.current = { ...uploadingFieldsRef.current, [field]: isUploading };
    setUploadingFields(prev => ({ ...prev, [field]: isUploading }));
  };

  useEffect(() => {
    setLoadingCountryCodes(true);
    getCountryCodes().then(setCountryCodes).catch(console.error).finally(() => setLoadingCountryCodes(false));
    loadCountries();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (savedFormData && Object.keys(savedFormData).length > 0) setFormData(savedFormData);
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 1) { setStep(0); return true; }
      return false;
    });
    return () => backHandler.remove();
  }, [step]);

  const updateField = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateStep0 = () => {
    if (hasPendingUploads()) return 'Please wait, document upload is in progress';
    if (!formData.firstName?.trim()) return 'First name is required';
    if (!formData.lastName?.trim()) return 'Last name is required';
    if (!formData.email.trim()) return strings.emailRequired;
    if (errors.email) return errors.email;
    if (!formData.phone.trim()) return strings.phoneRequired;
    if (!formData.countryCode) return strings.countryCode;
    if (errors.phone) return errors.phone;
    if (!formData.address1.trim()) return strings.addressRequired;
    if (!formData.country) return strings.countryRequired;
    if (!formData.state) return strings.stateRequired;
    if (!formData.city.trim()) return strings.cityRequired;
    if (!formData.zipCode.trim()) return strings.zipCodeRequired;
    if (!formData.gender.trim()) return strings.genderisRequired;
    if (errors.zipCode) return errors.zipCode;
    if (!formData.password) return strings.passwordRequired;
    if (!formData.confirmPassword) return strings.confirmPasswordRequired;
    if (errors.password) return errors.password;
    if (errors.confirmPassword) return errors.confirmPassword;
    // NEW: Validate services and category
    if (selectedServices.length === 0) return 'Please select at least one service';
    if (!selectedCategory) return 'Please select a vehicle category';
    return null;
  };

  const validateStep1 = () => {
    if (hasPendingUploads()) return 'Please wait, document upload is in progress';
    if (!formData.vehicleMake.trim()) return strings.vehicleMakeRequired;
    if (!formData.vehicleYear.trim()) return strings.vehicleYearRequired;
    if (!formData.vehicleColor.trim()) return strings.vehicleColorRequired;
    if (!selectedCategory) return 'Vehicle category is required';
    if (needsSubcategory && !selectedSubcategory) return 'Vehicle subcategory is required';
    if (!formData.registrationNumber.trim()) return strings.registrationNumberRequired;
    if (!formData.vehicleType) return 'Vehicle type is required';
    if (!uploadedPaths.vehicleFront) return strings.vehicleFrontPhotoRequired;
    if (!uploadedPaths.vehicleRegistration) return strings.vehicleRegistrationRequired;
    if (!uploadedPaths.drivingLicense) return strings.drivingLicenseRequired;
    return null;
  };

  // ─── Field validation handlers ────────────────────────────────────────────
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : strings.invalidEmail;

  const validatePassword = (password: string) => {
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return strings.passwordRequirements;
    return '';
  };

const validatePhone = (phone: string, code: string) => {
  if (code === '+592') 
    return /^[0-9]{7}$/.test(phone) ? '' : 'Phone number must be 7 digits';

  return /^[0-9]{10,15}$/.test(phone) ? '' : strings.validPhoneNumber;
};
  const handleEmailChange = (v: string) => {
    updateField('email', v);
    setErrors(prev => ({ ...prev, email: v.length > 0 ? validateEmail(v) : '' }));
  };

  const handlePhoneChange = (v: string) => {
    if (v.startsWith('0')) v = v.substring(1);
    v = v.replace(/[^0-9]/g, '');
    updateField('phone', v);
    setErrors(prev => ({ ...prev, phone: v.length > 0 ? validatePhone(v, formData.countryCode) : '' }));
  };

  const handlePasswordChange = (v: string) => {
    updateField('password', v);
    setErrors(prev => ({ ...prev, password: v.length < 6 ? strings.passwordMin6Chars : validatePassword(v) }));
  };

  const handleConfirmPasswordChange = (v: string) => {
    updateField('confirmPassword', v);
    setErrors(prev => ({ ...prev, confirmPassword: v.length > 0 && v !== formData.password ? strings.passwordsNotMatch : '' }));
  };

  const handleZipCodeChange = (v: string) => {
    updateField('zipCode', v);
    setErrors(prev => ({ ...prev, zipCode: v.length > 0 ? (/^(?:\d{4}|\d{6})$/.test(v) ? '' : strings.validZipCode) : '' }));
  };

  // ─── Location ─────────────────────────────────────────────────────────────
  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await locationService.getCountries();
      setCountries(data);
      const zimbabwe = data.find(c => c.name.toLowerCase() === 'zimbabwe');
      if (zimbabwe) {
        setSelectedCountry(zimbabwe);
        setFormData(prev => ({ ...prev, country: zimbabwe.name }));
        loadStates(zimbabwe.code);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingCountries(false); }
  };

  const loadStates = async (countryCode: string) => {
    try {
      setLoadingStates(true);
      setStates(await locationService.getStates(countryCode));
    } catch (e) { console.error(e); }
    finally { setLoadingStates(false); }
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    updateField('country', country.name);
    updateField('state', '');
    setStates([]);
    setShowCountryModal(false);
    loadStates(country.code);
  };

  const selectState = (state: State) => {
    updateField('state', state.name);
    setShowStateModal(false);
  };

  // ─── Categories ───────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setCategoryError('');
      const res = await fetch(`${BASE_URL}/admin/vehicle-categories`);
      const data = await res.json();
      console.log('Categories fetched:', data);
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setVehicleCategories(data.data);
      } else {
        console.warn('No categories or empty response:', data);
        setCategoryError('No vehicle categories available. Please try again.');
        // Retry after 2 seconds
        setTimeout(() => fetchCategories(), 2000);
      }
    } catch (e) {
      console.error('Category fetch error:', e);
      setCategoryError('Failed to load categories');
      // Retry after 2 seconds
      setTimeout(() => fetchCategories(), 2000);
    }
    finally { setLoadingCategories(false); }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      setLoadingSubcategories(true);
      setSubcategoryError('');
      const res = await fetch(`${BASE_URL}/admin/category/getSubCategories/${categoryId}`);
      const data = JSON.parse(await res.text());
      if (data.success) setSubcategories(data.data);
      else setSubcategoryError('Failed to load subcategories');
    } catch (e) { setSubcategoryError('Failed to load subcategories'); }
    finally { setLoadingSubcategories(false); }
  };

  const handleSelectCategory = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(null);
    updateField('vehicleType', cat.name);
    updateField('vehicleCapacity', '');
    fetchSubcategories(cat._id);
  };

  const handleSelectSubcategory = (sub: VehicleSubcategory) => {
    setSelectedSubcategory(sub);
    updateField('vehicleCapacity', `${sub.minWeight}-${sub.maxWeight} Ton`);
  };

  const handleSelectServices = (services: AppService[]) => {
    setSelectedServices(services);
    // reset subcategory if PARCEL deselected
    const stillHasParcel = services.some(s => s.name === 'PARCEL');
    if (!stillHasParcel) setSelectedSubcategory(null);
  };

  // ─── Image Upload ─────────────────────────────────────────────────────────
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

  const getCompressedImage = async (image: { path: string; mime: string; size?: number }) => {
    if (!image.size || image.size <= MAX_SIZE_BYTES) return image;
    // Compress until under 2MB — try quality steps
    const qualities = [0.7, 0.5, 0.3];
    for (const quality of qualities) {
      const compressed = await ImageCropPicker.openCropper({
        path: image.path,
        width: 1024,
        height: 1024,
        compressImageQuality: quality,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        mediaType: 'photo',
        freeStyleCropEnabled: true,
      });
      if (!compressed.size || compressed.size <= MAX_SIZE_BYTES) return compressed;
    }
    return image;
  };

  const uploadImage = async (field: string, image: { path: string; mime: string; size?: number }) => {
    const docType = DOCUMENT_FIELD_MAP[field];
    if (!docType) return;

    setFieldUploading(field, true);
    setUploadedPaths(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });

    try {
      const finalImage = await getCompressedImage(image);
      const file = { uri: finalImage.path, type: finalImage.mime, name: `${field}_${Date.now()}.jpg` };

      setFormData(prev => ({ ...prev, [field]: { uri: finalImage.path, type: finalImage.mime, name: file.name } }));

      const result = await authService.uploadDocument(file, docType);
      setUploadedPaths(prev => ({ ...prev, [docType]: result.filePath }));
    } catch (e) {
      console.error('Upload failed:', e);
      Toast.show({ type: 'error', text1: 'Image upload failed, please try again' });
      setFormData(prev => ({ ...prev, [field]: null }));
    } finally {
      setFieldUploading(field, false);
    }
  };

  const openCamera = async (field: string) => {
    try {
      const image = await ImageCropPicker.openCamera({
        cropping: true, freeStyleCropEnabled: true,
        cropperToolbarTitle: strings.cropImage, mediaType: 'photo',
        compressImageQuality: 0.5, compressImageMaxWidth: 1024, compressImageMaxHeight: 1024,
      });
      await uploadImage(field, image);
    } catch (e) {}
  };

  const openGallery = async (field: string) => {
    try {
      const image = await ImageCropPicker.openPicker({
        cropping: true, freeStyleCropEnabled: true,
        cropperToolbarTitle: strings.cropImage, mediaType: 'photo',
        compressImageQuality: 0.5, compressImageMaxWidth: 1024, compressImageMaxHeight: 1024,
      });
      await uploadImage(field, image);
    } catch (e) {}
  };

  const openDocument = async (field: string) => {
    try {
      const res = await pickDocument({ type: [documentTypes.pdf, documentTypes.images] });
      const f = res[0];
      const docType = DOCUMENT_FIELD_MAP[field];
      if (!docType) return;

      const fileData = { uri: f.uri, type: f.type || 'application/pdf', name: f.name || `${field}.pdf` };
      setFormData(prev => ({ ...prev, [field]: fileData }));

      setFieldUploading(field, true);
      setUploadedPaths(prev => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      try {
        const result = await authService.uploadDocument(fileData, docType);
        setUploadedPaths(prev => ({ ...prev, [docType]: result.filePath }));
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Document upload failed' });
        setFormData(prev => ({ ...prev, [field]: null }));
      } finally {
        setFieldUploading(field, false);
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.canceled) return;
      console.error(err);
    }
  };

  const openImagePicker = (field: string) => {
    setCurrentField(field);
    if (field === 'portraitPhoto') { openCamera(field); return; }
    setShowImagePicker(true);
  };

  // ─── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const payload = {
        firstName: formData.firstName, surName: formData.lastName,
        email: formData.email, password: formData.password,
        gender: formData.gender, 
        phone: formData.phone, countryCode: formData.countryCode,
        streetAddress1: formData.address1, streetAddress2: formData.address2,
        city: formData.city, state: formData.state, zipCode: formData.zipCode,
        make: formData.vehicleMake, modelYear: formData.vehicleYear,
        vehicleColor: formData.vehicleColor, registrationNumber: formData.registrationNumber,
        vehicleTrailer: formData.vehicleTrailer, vehicleType: formData.vehicleType,
        vehicleCapacity: formData.vehicleCapacity,
        categoryId: selectedCategory?._id,
        subCategoryId: needsSubcategory ? selectedSubcategory?._id : undefined,
        selectedServices: JSON.stringify(selectedServices.map(s => s._id)),
        // File paths from server
        ...uploadedPaths,
      };

      await authService.registerDriver(payload as any);
      onSaveFormData(formData);

      setTimeout(() => {
        onNavigateToEmailVerify({ email: formData.email, message: 'register', registrationData: payload });
      }, 800);
    } catch (error: any) {
      const msg = getCleanErrorMessage(error, 'Registration failed');
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const getCleanErrorMessage = (error: any, fallback = 'Something went wrong') => {
    if (error?.response?.data?.message) return error.response.data.message;
    if (typeof error?.message === 'string') {
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(error.message.substring(jsonStart));
          if (parsed?.message) return parsed.message;
        }
      } catch {}
    }
    return error?.message || fallback;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.headerBackButton} onPress={onNavigateToLogin} activeOpacity={0.8}>
              <BackIcon height={18} width={18} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{strings.register}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{strings.registerSubtitle}</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, step >= 0 && styles.active]} />
          <View style={[styles.progressBar, step >= 1 && styles.active]} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <SafeWrapper>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {step === 0 && (
                <PersonalStep
                  formData={formData}
                  errors={errors}
                  uploadingFields={uploadingFields}
                  showPassword={showPassword}
                  showConfirmPassword={showConfirmPassword}
                  countries={countries}
                  states={states}
                  countryCodes={countryCodes}
                  selectedCountry={selectedCountry}
                  showCountryModal={showCountryModal}
                  showStateModal={showStateModal}
                  showCountryCodeModal={showCountryCodeModal}
                  loadingCountries={loadingCountries}
                  loadingStates={loadingStates}
                  loadingCountryCodes={loadingCountryCodes}
                  countrySearch={countrySearch}
                  stateSearch={stateSearch}
                  appServices={appServices}
                  vehicleCategories={vehicleCategories}
                  selectedServices={selectedServices}
                  selectedCategory={selectedCategory}
                  loadingServices={loadingServices}
                  loadingCategories={loadingCategories}
                  onFieldChange={updateField}
                  onEmailChange={handleEmailChange}
                  onPhoneChange={handlePhoneChange}
                  onPasswordChange={handlePasswordChange}
                  onConfirmPasswordChange={handleConfirmPasswordChange}
                  onZipCodeChange={handleZipCodeChange}
                  onTogglePassword={() => setShowPassword(p => !p)}
                  onToggleConfirmPassword={() => setShowConfirmPassword(p => !p)}
                  onOpenImagePicker={openImagePicker}
                  onSelectCountry={selectCountry}
                  onSelectState={selectState}
                  onSelectCountryCode={code => {
                    updateField('countryCode', code);
                    setShowCountryCodeModal(false);
                    if (formData.phone.length > 0)
                      setErrors(prev => ({ ...prev, phone: validatePhone(formData.phone, code) }));
                  }}
                  onSelectServices={handleSelectServices}
                  onSelectCategory={handleSelectCategory}
                  setShowCountryModal={setShowCountryModal}
                  setShowStateModal={setShowStateModal}
                  setShowCountryCodeModal={setShowCountryCodeModal}
                  setCountrySearch={setCountrySearch}
                  setStateSearch={setStateSearch}
                />
              )}

              {step === 1 && (
                <VehicleStep
                  formData={formData}
                  uploadingFields={uploadingFields}
                  vehicleCategories={vehicleCategories}
                  subcategories={subcategories}
                  selectedCategory={selectedCategory}
                  selectedSubcategory={selectedSubcategory}
                  loadingCategories={loadingCategories}
                  loadingSubcategories={loadingSubcategories}
                  categoryError={categoryError}
                  subcategoryError={subcategoryError}
                  showTrailerModal={showTrailerModal}
                  onFieldChange={updateField}
                  onSelectCategory={handleSelectCategory}
                  onSelectSubcategory={handleSelectSubcategory}
                  onSelectServices={handleSelectServices}
                  appServices={appServices}
                  loadingServices={loadingServices}
                  selectedServices={selectedServices}
                  needsSubcategory={needsSubcategory}
                  onOpenImagePicker={openImagePicker}
                  setShowTrailerModal={setShowTrailerModal}
                />
              )}

              {/* Buttons */}
              <View style={[styles.buttonContainer,{
                marginTop:step === 1 ?50:30
              }]}>
                {step === 1 && (
                  <CustomButton
                    style={styles.button}
                    title={strings.back}
                    backgroundColor="#E5E7EB"
                    textColor="#000"
                    onPress={() => setStep(0)}
                  />
                )}
                <CustomButton
                  title={
                    step === 0
                      ? strings.next
                      : isUploadingDocuments
                        ? 'Uploading...'
                        : isLoading
                          ? strings.registering
                          : strings.register
                  }
                  backgroundColor={Colors.secondaryDark}
                  style={[styles.button,{
                    width:step === 1 ?"50%":"100%",
                    
                  }]}
                  textColor="#fff"
                  disabled={isLoading || isUploadingDocuments}
                  onPress={() => {
                    if (step === 0) {
                      const err = validateStep0();
                      if (err) { Toast.show({ type: 'error', text1: err }); return; }
                      setStep(1);
                      requestAnimationFrame(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }));
                    } else {
                      handleRegister();
                    }
                  }}
                />
              </View>

                {step === 1 && (
                <View style={styles.HelperContainer}>
                  <Text style={[styles.loginText,{
                    fontSize:12,

                  }]}>Your <Text style={{color:Colors.primary}}>documents are encrypted</Text> and securely stored </Text>
           
                </View>
              )}

              {step === 1 && (
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>{strings.alreadyHaveAccount} </Text>
                  <TouchableOpacity onPress={onNavigateToLogin}>
                    <Text style={styles.loginLink}>{strings.login}</Text>
                  </TouchableOpacity>
                </View>
              )}
            
            </View>
          </ScrollView>

          <ImagePickerModal
            visible={showImagePicker}
            onClose={() => setShowImagePicker(false)}
            onCamera={() => { setShowImagePicker(false); if (currentField) openCamera(currentField); }}
            onGallery={() => { setShowImagePicker(false); if (currentField) openGallery(currentField); }}
            onDocument={() => { if (currentField) openDocument(currentField); setShowImagePicker(false); }}
          />

          {/* Loading Modal */}
          <Modal visible={isLoading} transparent animationType="fade">
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.secondary2} />
                <Text style={styles.loadingText}>{strings.registering}</Text>
              </View>
            </View>
          </Modal>
        </SafeWrapper>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: verticalScale(10), flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: scale(27) },
  header: {
    width: '100%',
    height: verticalScale(170),
    backgroundColor: Colors.secondaryDark,
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(20),
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: fontScale(22), fontFamily: 'Rubik-Bold',   marginStart: 11, color: Colors.red },
  headerSubtitle: {
    marginTop: verticalScale(6),
    fontSize: fontScale(14),
    marginStart: 11,
    fontFamily: 'Rubik-Regular',
    color: Colors.textLight,
    opacity: 0.9,
  },
  headerBackButton: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    justifyContent: 'center', alignItems: 'center', marginRight: scale(10),
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(25),
    marginHorizontal: verticalScale(15),
  },
  progressBar: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 4, marginHorizontal: 4 },
  active: { backgroundColor: Colors.red },
  buttonContainer: {
    marginTop: verticalScale(20),
    width: '100%',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button: { width: '45%', marginHorizontal: 15, fontFamily: 'Rubik-Medium' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: verticalScale(5) },
  HelperContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: verticalScale(30) },
  loginText: { fontSize: fontScale(14), fontFamily: 'Rubik-Regular', color: Colors.textMuted },
  loginLink: { fontSize: fontScale(14), fontFamily: 'Rubik-Regular', color: '#163466' },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { backgroundColor: '#fff', padding: scale(30), borderRadius: scale(12), alignItems: 'center' },
  loadingText: { marginTop: verticalScale(15), fontSize: fontScale(16), fontFamily: 'Rubik-Medium', color: Colors.black },
});

export default RegisterScreen;
