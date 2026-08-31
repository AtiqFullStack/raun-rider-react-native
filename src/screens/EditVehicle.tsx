import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import { SvgUri } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import SafeWrapper from '../components/SafeWrapper';
import Header from '../components/common/Header';
import ImagePickerModal from '../components/ImagePickerModal';
import BottomSheet from '../components/common/BottomSheet';
import { Colors } from '../constants/Colors';
import { fontScale, scale, verticalScale } from '../utils/scaling';
import { BASE_URL, IMAGE_URL } from '../utils/config';
import { imgaeUrlConverter } from '../utils/converter';
import { api } from '../services/apiClient';
import CameraIcon from '../assets/svg/cameras.svg';
import CheckIcon from '../assets/svg/ticks.svg';
import RegistrationIcon from '../assets/svg/document.svg';
import InsuranceIcon from '../assets/svg/tick.svg';
import DropdownIcon from '../assets/icons/Vector.svg';
import Toast from 'react-native-toast-message';
import { pick as pickDoc, types as documentTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useAppServices, AppService } from '../context/AppServicesContext';

type VehicleCategory = {
  _id: string;
  name: string;
  icon: string;
  // updated: now an array of populated service objects
  serviceIds?: { _id: string; name: string; title: string }[];
  /** @deprecated legacy single serviceId — kept for backward compat display */
  serviceId?: { _id: string; name: string; title: string } | null;
};
type VehicleSubcategory = {
  _id: string;
  name: string;
  image: string;
  minWeight: number;
  maxWeight: number;
  length: number;
  width: number;
  height: number;
};
type FileType = {
  uri: string;
  type: string;
  name: string;
} | null;
type ImageSlot =
  | 'front'
  | 'side'
  | 'back'
  | 'registration'
  | 'insurance'
  | 'license'
  | null;
type LayoutRect = { x: number; y: number; width: number; height: number };

const EditVehicleScreen = () => {
  const route = useRoute<any>();
  const profile = route.params?.profile;

  const [vehicleName, setVehicleName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');

  // Category / Subcategory
  const [registrationFile, setRegistrationFile] = useState<FileType>(null);
  const [insuranceFile, setInsuranceFile] = useState<FileType>(null);
  const [licenseFile, setLicenseFile] = useState<FileType>(null);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [subcategories, setSubcategories] = useState<VehicleSubcategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<VehicleCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<VehicleSubcategory | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showServicesSheet, setShowServicesSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [selectedServices, setSelectedServices] = useState<AppService[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const { appServices, loadingServices } = useAppServices();

  /**
   * Filter categories by selected services using INTERSECTION logic:
   * - 0 services selected → show all categories
   * - 1 service selected  → categories that belong to that service
   * - 2+ services selected → categories that belong to ALL selected services
   *   (so a "Bike" that supports both Food & Parcel appears when both are chosen,
   *    but a "Truck" that only supports Parcel is hidden when Food is also selected)
   */
  const filteredCategories = selectedServices.length === 0
    ? categories
    : categories.filter(c => {
        const catServiceIds = (c.serviceIds ?? []).map(s => s._id);
        // Every selected service must be present in the category's serviceIds
        return selectedServices.every(s => catServiceIds.includes(s._id));
      });

  // Subcategory required only when PARCEL service is selected
  const needsSubcategory = selectedServices.some(s => s.name === 'PARCEL');

  const fieldYPositions = useRef<Record<string, number>>({});

  // Images
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [registrationImage, setRegistrationImage] = useState<string | null>(
    null,
  );
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [insuranceImage, setInsuranceImage] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<ImageSlot>(null);

  const isPdf = (url: string | null) => !!url && url.toLowerCase().endsWith('.pdf');
  const toImageSourceUri = (uri: string | null) => {
    if (!uri) return null;
    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('file://') ||
      uri.startsWith('content://')
    ) {
      return uri;
    }
    return `file://${uri}`;
  };

  const [errors, setErrors] = useState({
    make: '',
    model: '',
    color: '',
    services: '',
    category: '',
    subcategory: '',
    registrationNumber: '',
    frontImage: '',
    sideImage: '',
    backImage: '',
    registrationImage: '',
    insuranceImage: '',
    licenseImage: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!profile) return;
    setMake(profile.make ?? '');
    setModel(profile.modelYear ?? '');
    setColor(profile.vehicleColor ?? '');
    setRegistrationNumber(profile.registrationNumber?.trim() ?? '');
    if (profile.vehiclePhotos) {
      if (profile.vehiclePhotos.front)
        setFrontImage(imgaeUrlConverter(profile.vehiclePhotos.front));
      if (profile.vehiclePhotos.side)
        setSideImage(imgaeUrlConverter(profile.vehiclePhotos.side));
      if (profile.vehiclePhotos.back)
        setBackImage(imgaeUrlConverter(profile.vehiclePhotos.back));
    }
    if (profile.vehicleRegistration)
      setRegistrationImage(imgaeUrlConverter(profile.vehicleRegistration));
    if (profile.insurance)
      setInsuranceImage(imgaeUrlConverter(profile.insurance));
    if (profile.drivingLicense)
      setLicenseImage(imgaeUrlConverter(profile.drivingLicense));
  }, [profile]);

  // Pre-populate selectedServices from profile once appServices are loaded
  useEffect(() => {
    if (!profile?.services || appServices.length === 0) return;
    const profileServiceIds: string[] = profile.services.map((s: any) =>
      typeof s === 'string' ? s : s._id
    );
    const matched = appServices.filter(s => profileServiceIds.includes(s._id));
    if (matched.length > 0) setSelectedServices(matched);
  }, [profile, appServices]);

  useEffect(() => {
    if (!profile?.categoryId || categories.length === 0) return;
    const matched = categories.find(c => c._id === profile.categoryId);
    if (matched) {
      setSelectedCategory(matched);
      fetchSubcategories(matched._id);
    }
  }, [categories]);

  useEffect(() => {
    if (!profile?.subCategoryId || subcategories.length === 0) return;
    const matched = subcategories.find(
      s => s._id === profile.subCategoryId._id,
    );
    if (matched) setSelectedSubcategory(matched);
  }, [subcategories]);

  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);

  const scrollToFirstError = (e: typeof errors) => {
    const order: (keyof typeof fieldYPositions.current)[] = [
      'make', 'model', 'color', 'services', 'category', 'subcategory',
      'registrationNumber', 'images',
    ];
    const errorKeys: Record<string, boolean> = {
      make: !!e.make,
      model: !!e.model,
      color: !!e.color,
      services: !!e.services,
      category: !!e.category,
      subcategory: !!e.subcategory,
      registrationNumber: !!e.registrationNumber,
      images: !!(
        e.frontImage ||
        e.sideImage ||
        e.backImage ||
        e.registrationImage ||
        e.insuranceImage ||
        e.licenseImage
      ),
    };
    const first = order.find(k => errorKeys[k]);
    if (first !== undefined && fieldYPositions.current[first] !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(fieldYPositions.current[first] - 20, 0), animated: true });
    }
  };

  const pickDocument = async () => {
    const slot = activeSlot;
    setActiveSlot(null);

    try {
      const res = await pickDoc({
        type: [documentTypes.pdf, documentTypes.images],
      });

      const file = res[0];
      const fileObj = {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'document.pdf',
      };

      if (slot === 'registration') {
        setRegistrationFile(fileObj);
        setRegistrationImage(null);
      } else if (slot === 'license') {
        setLicenseFile(fileObj);
        setLicenseImage(null);
      } else if (slot === 'insurance') {
        setInsuranceFile(fileObj);
        setInsuranceImage(null);
      }

      clearImageError(slot);
    } catch (err) {
      if (!isErrorWithCode(err) || err.code !== errorCodes.canceled) {
        console.log('Document error:', err);
      }
    }
  };
  const validate = () => {
    const e = {
      make: make.trim() ? '' : 'Make is required',
      model: model.trim() ? '' : 'Model year is required',
      color: color.trim() ? '' : 'Color is required',
      services: selectedServices.length > 0 ? '' : 'Select at least one service',
      category: selectedCategory ? '' : 'Category is required',
      subcategory: needsSubcategory && !selectedSubcategory ? 'Subcategory is required' : '',
      registrationNumber: registrationNumber.trim() ? '' : 'Registration number is required',
      frontImage: frontImage ? '' : 'Front image is required',
      sideImage: sideImage ? '' : 'Side image is required',
      backImage: backImage ? '' : 'Back image is required',
      registrationImage: (registrationImage || registrationFile) ? '' : 'RC document is required',
      insuranceImage: (insuranceImage || insuranceFile) ? '' : 'Insurance document is required',
      licenseImage: (licenseImage || licenseFile) ? '' : 'Driving license is required',
    };
    setErrors(e);
    const isValid = !Object.values(e).some(v => v !== '');
    if (!isValid) scrollToFirstError(e);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('make', make);
      formData.append('modelYear', model);
      formData.append('vehicleColor', color);
      formData.append('registrationNumber', registrationNumber);
      if (selectedCategory) formData.append('categoryId', selectedCategory._id);
      if (needsSubcategory && selectedSubcategory) formData.append('subCategoryId', selectedSubcategory._id);
      // Send as JSON string: selectedServices="[\"id1\",\"id2\"]"
      formData.append('services', JSON.stringify(selectedServices.map(s => s._id)));

      const isLocal = (uri: string | null) => uri && !uri.startsWith('http');
      if (isLocal(frontImage)) formData.append('vehicleFront', { uri: frontImage!, type: 'image/jpeg', name: 'vehicleFront.jpg' } as any);
      if (isLocal(sideImage)) formData.append('vehicleSide', { uri: sideImage!, type: 'image/jpeg', name: 'vehicleSide.jpg' } as any);
      if (isLocal(backImage)) formData.append('vehicleBack', { uri: backImage!, type: 'image/jpeg', name: 'vehicleBack.jpg' } as any);

      // Registration: PDF file takes priority over image
      if (registrationFile) {
        formData.append('vehicleRegistration', registrationFile as any);
      } else if (isLocal(registrationImage)) {
        formData.append('vehicleRegistration', { uri: registrationImage!, type: 'image/jpeg', name: 'vehicleRegistration.jpg' } as any);
      }

      if (insuranceFile) {
        formData.append('insurance', insuranceFile as any);
      } else if (isLocal(insuranceImage)) {
        formData.append('insurance', { uri: insuranceImage!, type: 'image/jpeg', name: 'insurance.jpg' } as any);
      }

      // License: PDF file takes priority over image
      if (licenseFile) {
        formData.append('drivingLicense', licenseFile as any);
      } else if (isLocal(licenseImage)) {
        formData.append('drivingLicense', { uri: licenseImage!, type: 'image/jpeg', name: 'drivingLicense.jpg' } as any);
      }

      const res = await api.putFormData('/user/auth/update-vehicle', formData);
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Vehicle updated successfully' });
        console.log("formData>",formData)
        navigation.goBack();
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Vehicle update failed' });
    } finally {
      setSaving(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch(`${BASE_URL}/admin/vehicle-categories`);
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      setLoadingSubcategories(true);
      const res = await fetch(
        `${BASE_URL}/admin/category/getSubCategories/${categoryId}`,
      );
      const data = await res.json();
      if (data.success) setSubcategories(data.data);
    } catch (e) {
      console.error('Failed to fetch subcategories:', e);
    } finally {
      setLoadingSubcategories(false);
    }
  };

const clearImageError = (slot: ImageSlot) => {
    if (slot === 'front') setErrors(p => ({ ...p, frontImage: '' }));
    else if (slot === 'side') setErrors(p => ({ ...p, sideImage: '' }));
    else if (slot === 'back') setErrors(p => ({ ...p, backImage: '' }));
    else if (slot === 'registration')
      setErrors(p => ({ ...p, registrationImage: '' }));
    else if (slot === 'insurance')
      setErrors(p => ({ ...p, insuranceImage: '' }));
    else if (slot === 'license') setErrors(p => ({ ...p, licenseImage: '' }));
  };

  const pickFromCamera = async () => {
    const slot = activeSlot;
    setActiveSlot(null);
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openCamera({
          mediaType: 'photo',
          compressImageQuality: 0.7,
          cropping: true,
        });
        if (slot === 'front') setFrontImage(image.path);
        else if (slot === 'side') setSideImage(image.path);
        else if (slot === 'back') setBackImage(image.path);
        else if (slot === 'registration') setRegistrationImage(image.path);
        else if (slot === 'insurance') setInsuranceImage(image.path);
        else if (slot === 'license') setLicenseImage(image.path);
        clearImageError(slot);
      } catch {}
    }, 300);
  };

  const pickFromGallery = async () => {
    const slot = activeSlot;
    setActiveSlot(null);
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openPicker({
          mediaType: 'photo',
          compressImageQuality: 0.7,
          cropping: true,
        });
        if (slot === 'front') setFrontImage(image.path);
        else if (slot === 'side') setSideImage(image.path);
        else if (slot === 'back') setBackImage(image.path);
        else if (slot === 'registration') setRegistrationImage(image.path);
        else if (slot === 'insurance') setInsuranceImage(image.path);
        else if (slot === 'license') setLicenseImage(image.path);
        clearImageError(slot);
      } catch {}
    }, 300);
  };

  return (
    <SafeWrapper style={{backgroundColor:Colors.cardBg}}>
      <Header simpleHeader simpleHeaderTitle="Edit Vehicle" showBackButton />

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Vehicle Details</Text>



        <View style={styles.row}>
          <View
            style={[styles.formGroup, styles.halfWidth]}
            onLayout={e => { fieldYPositions.current.make = e.nativeEvent.layout.y; }}
          >
            <Text style={styles.label}>MAKE</Text>
            <TextInput
              style={[styles.input, errors.make ? styles.inputError : null]}
              value={make}
              onChangeText={v => {
                setMake(v);
                if (v.trim()) setErrors(p => ({ ...p, make: '' }));
              }}
              placeholder="Make"
              placeholderTextColor="#9CA3AF"
            />
            {errors.make ? (
              <Text style={styles.errorText}>{errors.make}</Text>
            ) : null}
          </View>
          <View
            style={[styles.formGroup, styles.halfWidth]}
            onLayout={e => { fieldYPositions.current.model = e.nativeEvent.layout.y; }}
          >
            <Text style={styles.label}>MODEL</Text>
            <TextInput
              style={[styles.input, errors.model ? styles.inputError : null]}
              value={model}
              onChangeText={v => {
                setModel(v);
                if (v.trim()) setErrors(p => ({ ...p, model: '' }));
              }}
              placeholder="Model"
              placeholderTextColor="#9CA3AF"
            />
            {errors.model ? (
              <Text style={styles.errorText}>{errors.model}</Text>
            ) : null}
          </View>
        </View>

        <View
          style={styles.formGroup}
          onLayout={e => { fieldYPositions.current.color = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>COLOR</Text>
          <TextInput
            style={[styles.input, errors.color ? styles.inputError : null]}
            value={color}
            onChangeText={v => {
              setColor(v);
              if (v.trim()) setErrors(p => ({ ...p, color: '' }));
            }}
            placeholder="Vehicle color"
            placeholderTextColor="#9CA3AF"
          />
          {errors.color ? (
            <Text style={styles.errorText}>{errors.color}</Text>
          ) : null}
        </View>

        {/* Services */}
        <View
          style={styles.formGroup}
          onLayout={e => { fieldYPositions.current.services = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>SERVICES</Text>
          <TouchableOpacity
            style={[
              styles.dropdownField,
              errors.services ? styles.inputError : null,
              selectedServices.length > 0 && { height: undefined, minHeight: verticalScale(60), paddingVertical: verticalScale(10), flexWrap: 'wrap', gap: scale(6) },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowServicesSheet(true)}
          >
            {selectedServices.length > 0 ? (
              <>
                {selectedServices.map(s => (
                  <View key={s._id} style={styles.serviceChip}>
                    <Text style={styles.serviceChipText}>{s.title || s.name}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => {
                        setSelectedServices(prev => prev.filter(x => x._id !== s._id));
                        if (s.name === 'PARCEL') setSelectedSubcategory(null);
                      }}
                    >
                      <Text style={styles.serviceChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <DropdownIcon width={12} height={12} style={{ alignSelf: 'center' }} />
              </>
            ) : (
              <>
                <Text style={[styles.dropdownText, styles.placeholder]}>Select services</Text>
                <DropdownIcon width={12} height={12} />
              </>
            )}
          </TouchableOpacity>
          {errors.services ? <Text style={styles.errorText}>{errors.services}</Text> : null}
        </View>

        {/* Category */}
        <View
          style={styles.formGroup}
          onLayout={e => { fieldYPositions.current.category = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>CATEGORY</Text>
          <TouchableOpacity
            style={[styles.dropdownField, errors.category ? styles.inputError : null]}
            activeOpacity={0.8}
            onPress={() => setShowCategorySheet(true)}
          >
            {selectedCategory ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Image
                  source={{ uri: `${IMAGE_URL}/${selectedCategory.icon.replace(/\\/g, '/')}` }}
                  style={{ width: 32, height: 32, borderRadius: 6, marginRight: 10 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownText}>{selectedCategory.name}</Text>
                  {(selectedCategory.serviceIds ?? []).length > 0 && (
                    <Text style={styles.categoryServiceBadge}>
                      {selectedCategory.serviceIds!.map(s => s.title || s.name).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={[styles.dropdownText, styles.placeholder]}>Select vehicle category</Text>
            )}
            <DropdownIcon width={12} height={12} />
          </TouchableOpacity>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
        </View>

        {/* Subcategory - only when PARCEL service selected */}
        {needsSubcategory && (
        <View
          style={styles.formGroup}
          onLayout={e => { fieldYPositions.current.subcategory = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>SUBCATEGORY</Text>
          <TouchableOpacity
            style={[styles.dropdownField, errors.subcategory ? styles.inputError : null]}
            activeOpacity={0.8}
            onPress={() => {
              if (!selectedCategory) return;
              setShowSubcategoryModal(true);
            }}
          >
            <Text style={[styles.dropdownText, !selectedSubcategory && styles.placeholder]}>
              {selectedSubcategory?.name || 'Select subcategory'}
            </Text>
            <DropdownIcon width={12} height={12} />
          </TouchableOpacity>
          {errors.subcategory ? (
            <Text style={styles.errorText}>{errors.subcategory}</Text>
          ) : null}
        </View>
        )}

        {/* Registration Number */}
        <View
          style={styles.formGroup}
          onLayout={e => { fieldYPositions.current.registrationNumber = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>REGISTRATION NUMBER</Text>
          <TextInput
            style={[
              styles.input,
              errors.registrationNumber ? styles.inputError : null,
            ]}
            value={registrationNumber}
            onChangeText={v => {
              setRegistrationNumber(v);
              if (v.trim()) setErrors(p => ({ ...p, registrationNumber: '' }));
            }}
            placeholder="Enter registration number"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
          {errors.registrationNumber ? (
            <Text style={styles.errorText}>{errors.registrationNumber}</Text>
          ) : null}
        </View>

        {/* Image Grid */}
        <View
          style={styles.sectionHeader}
          onLayout={e => { fieldYPositions.current.images = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Visual Documentation</Text>
          <Text style={styles.requiredText}>6 SLOTS REQUIRED</Text>
        </View>

   <View style={styles.imageGrid}>

  {/* FRONT IMAGE */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Front Image</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.frontImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('front')}
    >
      {frontImage ? (
        <Image
          source={{ uri: toImageSourceUri(frontImage)! }}
          style={styles.vehicleImage}
          resizeMode="cover"
        />
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <CameraIcon width={24} height={24} />
          </View>

          <Text style={styles.uploadLabel}>FRONT IMAGE</Text>

          {errors.frontImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.frontImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

  {/* SIDE IMAGE */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Side Image</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.sideImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('side')}
    >
      {sideImage ? (
        <Image
          source={{ uri: toImageSourceUri(sideImage)! }}
          style={styles.vehicleImage}
          resizeMode="cover"
        />
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <CameraIcon width={24} height={24} />
          </View>

          <Text style={styles.uploadLabel}>SIDE IMAGE</Text>

          {errors.sideImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.sideImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

  {/* BACK IMAGE */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Back Image</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.backImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('back')}
    >
      {backImage ? (
        <Image
          source={{ uri: toImageSourceUri(backImage)! }}
          style={styles.vehicleImage}
          resizeMode="cover"
        />
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <CameraIcon width={24} height={24} />
          </View>

          <Text style={styles.uploadLabel}>BACK IMAGE</Text>

          {errors.backImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.backImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

  {/* REGISTRATION */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Registration</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.registrationImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('registration')}
    >
      {registrationImage ? (
        isPdf(registrationImage) ? (
          <>
            <View style={styles.uploadIconBox}>
              <RegistrationIcon width={24} height={24} />
            </View>
            <Text style={styles.uploadLabel}>REGISTRATION PDF</Text>
          </>
        ) : (
          <Image
            source={{ uri: toImageSourceUri(registrationImage)! }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
        )
      ) : registrationFile ? (
        <>
          <View style={styles.uploadIconBox}>
            <RegistrationIcon width={24} height={24} />
          </View>
          <Text style={styles.uploadLabel}>{registrationFile.name}</Text>
        </>
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <RegistrationIcon width={24} height={24} />
          </View>
          <Text style={styles.uploadLabel}>REGISTRATION</Text>
          {errors.registrationImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.registrationImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

  {/* INSURANCE */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Insurance</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.insuranceImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('insurance')}
    >
      {insuranceImage ? (
        isPdf(insuranceImage) ? (
          <>
            <View style={styles.uploadIconBox}>
              <InsuranceIcon width={24} height={24} />
            </View>
            <Text style={styles.uploadLabel}>INSURANCE PDF</Text>
          </>
        ) : (
          <Image
            source={{ uri: toImageSourceUri(insuranceImage)! }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
        )
      ) : insuranceFile ? (
        <>
          <View style={styles.uploadIconBox}>
            <InsuranceIcon width={24} height={24} />
          </View>
          <Text style={styles.uploadLabel}>{insuranceFile.name}</Text>
        </>
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <InsuranceIcon width={24} height={24} />
          </View>
          <Text style={styles.uploadLabel}>INSURANCE</Text>
          {errors.insuranceImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.insuranceImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

  {/* LICENSE */}
  <View style={styles.uploadItem}>
    <Text style={styles.imageTopLabel}>Driving License</Text>

    <TouchableOpacity
      style={[
        styles.uploadCard,
        errors.licenseImage ? styles.uploadCardError : null,
      ]}
      activeOpacity={0.8}
      onPress={() => setActiveSlot('license')}
    >
      {licenseImage ? (
        isPdf(licenseImage) ? (
          <>
            <View style={styles.uploadIconBox}>
              <RegistrationIcon width={24} height={24} />
            </View>
            <Text style={styles.uploadLabel}>LICENSE PDF</Text>
          </>
        ) : (
          <Image
            source={{ uri: toImageSourceUri(licenseImage)! }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
        )
      ) : licenseFile ? (
        <>
          <View style={styles.uploadIconBox}>
            <RegistrationIcon width={24} height={24} />
          </View>
          <Text style={styles.uploadLabel}>{licenseFile.name}</Text>
        </>
      ) : (
        <>
          <View style={styles.uploadIconBox}>
            <CameraIcon width={24} height={24} />
          </View>

          <Text style={styles.uploadLabel}>LICENSE</Text>

          {errors.licenseImage ? (
            <Text style={styles.uploadErrorText}>
              {errors.licenseImage}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  </View>

</View>

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
          <View style={styles.saveIconCircle}>
            <CheckIcon width={20} height={20} />
          </View>
        </TouchableOpacity>
      </ScrollView>

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
                    setSelectedServices(prev =>
                      isSelected ? prev.filter(s => s._id !== item._id) : [...prev, item]
                    );
                    // reset subcategory if PARCEL deselected
                    if (isSelected && item.name === 'PARCEL') setSelectedSubcategory(null);
                    if (!isSelected) setErrors(p => ({ ...p, services: '' }));
                  }}
                >
                  <Text style={styles.sheetItemText}>{item.title  || item?.name}</Text>
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
        ) : filteredCategories.length === 0 ? (
          <Text style={styles.emptyText}>No categories for selected services</Text>
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={item => item._id}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const iconUrl = `${IMAGE_URL}/${item.icon.replace(/\\/g, '/')}`;
              const isSvg = iconUrl.toLowerCase().endsWith('.svg');
              const isSelected = selectedCategory?._id === item._id;
              return (
                <TouchableOpacity
                  style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setSelectedSubcategory(null);
                    fetchSubcategories(item._id);
                    setShowCategorySheet(false);
                    setErrors(p => ({ ...p, category: '', subcategory: '' }));
                  }}
                >
                  {isSvg ? (
                    <SvgUri uri={iconUrl} width={40} height={40} style={styles.categoryThumb} />
                  ) : (
                    <Image source={{ uri: iconUrl }} style={styles.categoryThumb} resizeMode="cover" />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetItemText}>{item.name}</Text>
                    {(item.serviceIds ?? []).length > 0 && (
                      <Text style={styles.categoryServiceBadge}>
                        {item.serviceIds!.map(s => s.title || s.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                  {isSelected && <CheckIcon width={18} height={18} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </BottomSheet>

      {/* Subcategory Bottom Sheet */}
      <BottomSheet visible={showSubcategoryModal} onClose={() => setShowSubcategoryModal(false)}>
        <Text style={styles.sheetTitle}>Select Subcategory</Text>
        {loadingSubcategories ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={subcategories}
            keyExtractor={item => item._id}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const imageUrl = `${IMAGE_URL}/${item.image.replace(/\\/g, '/')}`;
              const isSvg = imageUrl.toLowerCase().endsWith('.svg');
              const isSelected = selectedSubcategory?._id === item._id;
              return (
                <TouchableOpacity
                  style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                  onPress={() => {
                    setSelectedSubcategory(item);
                    setShowSubcategoryModal(false);
                    setErrors(p => ({ ...p, subcategory: '' }));
                  }}
                >
                  {isSvg ? (
                    <SvgUri uri={imageUrl} width={50} height={40} style={styles.categoryThumb} />
                  ) : (
                    <Image source={{ uri: imageUrl }} style={[styles.categoryThumb, { width: 50, height: 40 }]} resizeMode="contain" />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetItemText}>{item.name}</Text>
                    <Text style={styles.subcategoryDimension}>
                      {item.length}m (L) × {item.width}m (W) × {item.height}m (H)
                    </Text>
                    <Text style={styles.subcategoryCapacity}>{item.minWeight}-{item.maxWeight} Ton</Text>
                  </View>
                  {isSelected && <CheckIcon width={18} height={18} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </BottomSheet>

      <ImagePickerModal
        visible={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
        onDocument={
          activeSlot === 'registration' ||
          activeSlot === 'insurance' ||
          activeSlot === 'license'
            ? pickDocument
            : undefined
        }
      />

      <Modal visible={saving} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Saving changes...</Text>
          </View>
        </View>
      </Modal>
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: scale(24), paddingBottom: verticalScale(40) },
  title: {
    fontSize: fontScale(20),
    fontFamily: 'Rubik-Bold',
    color: '#0D1633',
    marginBottom: verticalScale(8),
  },
  formGroup: { marginBottom: verticalScale(22) },
  label: {
    fontSize: fontScale(13),
    color: Colors.primary,
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: 2,
    marginBottom: verticalScale(10),
  },
  input: {
    backgroundColor: '#EFF1F8',
    borderRadius: 12,
    paddingHorizontal: scale(18),
    height: verticalScale(60),
    fontSize: fontScale(16),
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(14),
  },
  halfWidth: { flex: 1 },
  dropdownField: {
    backgroundColor: '#EFF1F8',
    borderRadius: 12,
    height: verticalScale(60),
    paddingHorizontal: scale(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: fontScale(16),
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  placeholder: { color: '#9CA3AF' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(18),
  },
  sectionTitle: {
    fontSize: fontScale(18),
    color: '#111827',
    fontFamily: 'Rubik-SemiBold',
  },
  requiredText: {
    fontSize: fontScale(12),
    color: '#0A58A8',
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: 1,
  },

  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: scale(14),
  },
  uploadCard: {

    height: verticalScale(180),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F0DDD4',
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vehicleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  pdfCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pdfIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  uploadIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFF0E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadIconBoxSecondary: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F6EADF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadLabel: {
    fontSize: fontScale(13),
    color: '#4B2E1F',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
    uploadItem: {
  width: '47%',
  marginBottom: verticalScale(14),
},

imageTopLabel: {
  fontSize: fontScale(14),
  fontFamily: 'Rubik-SemiBold',
  color: '#111827',
  marginBottom: verticalScale(8),
  marginLeft: scale(2),
},
  saveButton: {
    marginTop: verticalScale(36),
    backgroundColor: '#E85D04',
    borderRadius: 16,
    height: verticalScale(62),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E85D04',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Bold',
    marginRight: scale(10),
  },
  saveIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  modalItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Regular',
    color: '#2A2A2A',
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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryServiceBadge: {
    fontSize: fontScale(11),
    fontFamily: 'Rubik-Regular',
    color: Colors.primary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: verticalScale(24),
  },
  subcategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subcategoryTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#111',
  },
  subcategoryDimension: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    fontFamily: 'Rubik-Regular',
  },
  subcategoryCapacity: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#444',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: scale(30),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(15),
    fontSize: fontScale(16),
    fontFamily: 'Rubik-Medium',
    color: '#0D1633',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E7',
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    gap: scale(6),
  },
  serviceChipText: {
    fontSize: fontScale(13),
    fontFamily: 'Rubik-SemiBold',
    color: '#E85D04',
  },
  serviceChipRemove: {
    fontSize: fontScale(12),
    color: '#E85D04',
    fontFamily: 'Rubik-Bold',
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#E53935',
  },
  uploadCardError: {
    borderColor: '#E53935',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  errorText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#E53935',
    marginTop: verticalScale(4),
  },
  uploadErrorText: {
    fontSize: fontScale(10),
    fontFamily: 'Rubik-Regular',
    color: '#E53935',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default EditVehicleScreen;
