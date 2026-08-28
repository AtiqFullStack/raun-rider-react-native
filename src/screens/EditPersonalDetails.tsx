import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import SafeWrapper from '../components/SafeWrapper';
import Header from '../components/common/Header';
import { Colors } from '../constants/Colors';
import { fontScale, scale, verticalScale } from '../utils/scaling';
import { Country, locationService, State } from '../services/locationService';
import { CountryCode, getCountryCodes } from '../services/countriesCode';
import { api } from '../services/apiClient';
import DropdownIcon from '../assets/icons/Vector.svg';
import CheckIcon from '../assets/svg/ticks.svg';

type PersonalForm = {
  phone: string;
  email: string;
  countryCode: string;
  country: string;
  state: string;
  city: string;
};

type PersonalErrors = Partial<Record<keyof PersonalForm, string>>;

const DEFAULT_FORM: PersonalForm = {
  phone: '',
  email: '',
  countryCode: '+592',
  country: '',
  state: '',
  city: '',
};

const toInputValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value);

const EditPersonalDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const profile = route.params?.profile;

  const [form, setForm] = useState<PersonalForm>({
    ...DEFAULT_FORM,
    phone: toInputValue(profile?.phone),
    email: toInputValue(profile?.email),
    countryCode: toInputValue(profile?.countryCode) || DEFAULT_FORM.countryCode,
    country: toInputValue(profile?.country),
    state: '',
    city: toInputValue(profile?.city),
  });
  const [errors, setErrors] = useState<PersonalErrors>({});
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCountryCodes, setLoadingCountryCodes] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCountries = useMemo(
    () =>
      countries.filter(country =>
        country.name.toLowerCase().includes(countrySearch.toLowerCase()),
      ),
    [countries, countrySearch],
  );

  const filteredStates = useMemo(
    () =>
      states.filter(state =>
        state.name.toLowerCase().includes(stateSearch.toLowerCase()),
      ),
    [states, stateSearch],
  );

  const updateField = (field: keyof PersonalForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const loadCountryCodes = useCallback(async () => {
    try {
      setLoadingCountryCodes(true);
      setCountryCodes(await getCountryCodes());
    } catch (err) {
      console.log('Country code load error:', err);
    } finally {
      setLoadingCountryCodes(false);
    }
  }, []);

  const loadStates = useCallback(async (countryCode: string) => {
    try {
      setLoadingStates(true);
      setStates(await locationService.getStates(countryCode));
    } catch (err) {
      console.log('State load error:', err);
    } finally {
      setLoadingStates(false);
    }
  }, []);

  const loadCountries = useCallback(async (currentCountry: string) => {
    try {
      setLoadingCountries(true);
      const data = await locationService.getCountries();
      setCountries(data);

      const matched = data.find(
        country => country.name.toLowerCase() === currentCountry.toLowerCase(),
      );
      if (matched) {
        setSelectedCountry(matched);
        loadStates(matched.code);
      }
    } catch (err) {
      console.log('Country load error:', err);
    } finally {
      setLoadingCountries(false);
    }
  }, [loadStates]);

  useEffect(() => {
    loadCountryCodes();
    loadCountries(profile?.country ?? '');
  }, [loadCountries, loadCountryCodes, profile?.country]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email';

  const validatePhone = (phone: string, code: string) => {
    if (code === '+592') {
      return /^[0-9]{7}$/.test(phone) ? '' : 'Phone number must be 7 digits';
    }

    return /^[0-9]{10,15}$/.test(phone)
      ? ''
      : 'Please enter a valid phone number';
  };

  const handleEmailChange = (value: string) => {
    updateField('email', value);
    setErrors(prev => ({
      ...prev,
      email: value.trim() ? validateEmail(value.trim()) : '',
    }));
  };

  const handlePhoneChange = (value: string) => {
    let next = value;
    if (next.startsWith('0')) next = next.substring(1);
    next = next.replace(/[^0-9]/g, '');
    updateField('phone', next);
    setErrors(prev => ({
      ...prev,
      phone: next ? validatePhone(next, form.countryCode) : '',
    }));
  };

  const handleSelectCountryCode = (code: string) => {
    updateField('countryCode', code);
    setShowCountryCodeModal(false);
    if (form.phone) {
      setErrors(prev => ({
        ...prev,
        phone: validatePhone(form.phone, code),
      }));
    }
  };

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setStates([]);
    setCountrySearch('');
    setShowCountryModal(false);
    setForm(prev => ({ ...prev, country: country.name, state: '' }));
    setErrors(prev => ({ ...prev, country: '', state: '' }));
    loadStates(country.code);
  };

  const handleSelectState = (state: State) => {
    updateField('state', state.name);
    setStateSearch('');
    setShowStateModal(false);
  };

  const validate = () => {
    const nextErrors: PersonalErrors = {
      phone: form.phone.trim()
        ? validatePhone(form.phone.trim(), form.countryCode)
        : 'Phone number is required',
      email: form.email.trim()
        ? validateEmail(form.email.trim())
        : 'Email is required',
      countryCode: form.countryCode ? '' : 'Country code is required',
      country: form.country ? '' : 'Country is required',
      state: form.state ? '' : 'State is required',
      city: form.city.trim() ? '' : 'City is required',
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const getCleanErrorMessage = (error: any, fallback = 'Personal details update failed') => {
    if (typeof error?.message === 'string') {
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(error.message.substring(jsonStart));
          if (parsed?.message) return parsed.message;
        }
      } catch {}
      return error.message;
    }
    return fallback;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('type', 'PERSONAL');
      formData.append('phone', form.phone.trim());
      formData.append('email', form.email.trim());
      formData.append('countryCode', form.countryCode);
      formData.append('country', form.country);
      formData.append('state', form.state);
      formData.append('city', form.city.trim());

      const res = await api.putFormData('/user/auth/update-vehicle', formData);
      if (res.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Personal details updated successfully',
        });
        navigation.navigate('ProfileMain', { refreshProfileAt: Date.now() });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: getCleanErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const renderCountryCodeModal = () => (
    <Modal visible={showCountryCodeModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Country Code</Text>
          {loadingCountryCodes ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.modalLoader} />
          ) : (
            <FlatList
              data={countryCodes}
              keyExtractor={item => item.iso}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectCountryCode(item.code)}
                >
                  <Text style={styles.modalItemText}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setShowCountryCodeModal(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderCountryModal = () => (
    <Modal visible={showCountryModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Country</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            placeholderTextColor={Colors.secondary}
            value={countrySearch}
            onChangeText={setCountrySearch}
          />
          {loadingCountries ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.modalLoader} />
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => {
              setShowCountryModal(false);
              setCountrySearch('');
            }}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStateModal = () => (
    <Modal visible={showStateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select State</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search state..."
            placeholderTextColor={Colors.secondary}
            value={stateSearch}
            onChangeText={setStateSearch}
          />
          {loadingStates ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.modalLoader} />
          ) : (
            <FlatList
              data={filteredStates}
              keyExtractor={item => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectState(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => {
              setShowStateModal(false);
              setStateSearch('');
            }}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const phoneInputValue = toInputValue(form.phone);

  return (
    <SafeWrapper style={styles.safeArea}>
      <Header simpleHeader simpleHeaderTitle="Edit Personal Details" showBackButton />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Personal Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>PHONE</Text>
            <View style={[styles.phoneField, errors.phone || errors.countryCode ? styles.inputError : null]}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                activeOpacity={0.8}
                onPress={() => setShowCountryCodeModal(true)}
              >
                <Text style={styles.countryCodeText}>{form.countryCode}</Text>
                <DropdownIcon width={12} height={12} />
              </TouchableOpacity>
              <TextInput
                key={`phone-${form.countryCode}`}
                style={styles.phoneInput}
                value={phoneInputValue}
                onChangeText={handlePhoneChange}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                selectionColor={Colors.primary}
              />
            </View>
            {errors.phone || errors.countryCode ? (
              <Text style={styles.errorText}>{errors.phone || errors.countryCode}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[
                styles.input,
                styles.disabledInput,
                errors.email ? styles.inputError : null,
              ]}
              value={form.email}
              onChangeText={handleEmailChange}
              placeholder="Enter email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
              selectTextOnFocus={false}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>COUNTRY</Text>
            <TouchableOpacity
              style={[styles.dropdownField, errors.country ? styles.inputError : null]}
              activeOpacity={0.8}
              onPress={() => setShowCountryModal(true)}
            >
              <Text style={[styles.dropdownText, !form.country && styles.placeholder]} numberOfLines={1}>
                {form.country || 'Select country'}
              </Text>
              <DropdownIcon width={12} height={12} />
            </TouchableOpacity>
            {errors.country ? <Text style={styles.errorText}>{errors.country}</Text> : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>CITY</Text>
              <TextInput
                style={[styles.input, errors.city ? styles.inputError : null]}
                value={form.city}
                onChangeText={value => updateField('city', value)}
                placeholder="Enter city"
                placeholderTextColor="#9CA3AF"
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>STATE</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownField,
                  !selectedCountry && styles.disabled,
                  errors.state ? styles.inputError : null,
                ]}
                activeOpacity={0.8}
                onPress={() => selectedCountry && setShowStateModal(true)}
                disabled={!selectedCountry}
              >
                <Text style={[styles.dropdownText, !form.state && styles.placeholder]} numberOfLines={1}>
                  {form.state || 'Select state'}
                </Text>
                <DropdownIcon width={12} height={12} />
              </TouchableOpacity>
              {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
            <View style={styles.saveIconCircle}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <CheckIcon width={20} height={20} />
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderCountryCodeModal()}
      {renderCountryModal()}
      {renderStateModal()}
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: Colors.cardBg },
  keyboardAvoiding: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: scale(24), paddingBottom: verticalScale(40) },
  title: {
    fontSize: fontScale(20),
    fontFamily: 'Rubik-Bold',
    color: '#0D1633',
    marginBottom: verticalScale(18),
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
  phoneField: {
    backgroundColor: '#EFF1F8',
    borderRadius: 12,
    height: verticalScale(60),
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeButton: {
    height: '100%',
    minWidth: scale(86),
    paddingHorizontal: scale(14),
    borderRightWidth: 1,
    borderRightColor: '#DDE1EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  countryCodeText: {
    fontSize: fontScale(16),
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: verticalScale(60),
    paddingHorizontal: scale(14),
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: fontScale(16),
    lineHeight: fontScale(20),
    color: '#111827',
    fontFamily: 'Rubik-Medium',
    backgroundColor: '#EFF1F8',
    textAlignVertical: 'center',
  },
  dropdownField: {
    backgroundColor: '#EFF1F8',
    borderRadius: 12,
    minHeight: verticalScale(60),
    paddingHorizontal: scale(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(8),
  },
  dropdownText: {
    flex: 1,
    fontSize: fontScale(16),
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  placeholder: { color: '#9CA3AF' },
  disabled: { opacity: 0.5 },
  disabledInput: {
    color: '#111827',
    opacity: 1,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#E53935',
  },
  errorText: {
    fontSize: fontScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#E53935',
    marginTop: verticalScale(4),
  },
  saveButton: {
    marginTop: verticalScale(18),
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
  saveButtonDisabled: { opacity: 0.7 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '84%',
    maxHeight: '65%',
    borderRadius: scale(8),
    padding: scale(20),
  },
  modalTitle: {
    fontSize: fontScale(18),
    fontFamily: 'Rubik-Regular',
    marginBottom: verticalScale(15),
    textAlign: 'center',
    color: '#111827',
  },
  modalLoader: { marginVertical: 20 },
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
    fontFamily: 'Rubik-Regular',
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
    fontFamily: 'Rubik-Medium',
    color: '#fff',
  },
});

export default EditPersonalDetailsScreen;
