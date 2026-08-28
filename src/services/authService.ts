// authService.ts
import { api } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DocumentType =
  | 'identityDocument'
  | 'selfiePhoto'
  | 'proofOfAddress'
  | 'vehicleFront'
  | 'vehicleSide'
  | 'vehicleBack'
  | 'vehicleRegistration'
  | 'insurance'
  | 'drivingLicense'
  | 'carTax';

interface RegisterDriverData {
  firstName: string;
  surName?: string;
  email: string;
  password: string;
  phone: string;
  countryCode: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  make: string;
  modelYear: string;
  vehicleColor: string;
  registrationNumber: string;
  categoryId?: string;
  subCategoryId?: string;
  vehicleTrailer: any;
  identityDocument: string;
  selfiePhoto: string;
  proofOfAddress?: string;
  vehicleFront: string;
  vehicleSide?: string;
  vehicleBack?: string;
  vehicleRegistration: string;
  insurance?: string;
  drivingLicense: string;
  carTax?: string;
}

export const authService = {
  uploadDocument: async (file: { uri: string; type: string; name: string }, type: DocumentType) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append(type, file as any);  // field name = documentType (e.g. 'identityDocument')
    const response = await api.postFormData('/user/auth/uploadDocument', formData);
    return response.data.data as { type: string; filePath: string };
  },

  registerDriver: async (data: RegisterDriverData) => {
    const response = await api.post('/user/auth/registerDriver', data);
    console.log('register response', response.data);
    return response.data;
  },

  // ✅ LOGIN
  login: async (email: string, password: string, fcmToken: string) =>
    (await api.post('/user/auth/driverLogin', { email, password, fcmToken })).data,

  // ✅ FORGOT PASSWORD
  forgotPassword: async (email: string) => {
    const response = await api.post('/user/auth/driverForgetPassword', {
      email,
    });

    return response.data;
  },
  verifyOtp: async (email: string, otp: string) => {
    return (
      await api.post('/user/auth/verify/otp', {
        email,
        otp,
      })
    ).data;
  },
  verifyRegisterOtp: async (email: string, otp: string) => {
    return (
      await api.post('/user/auth/verifyOTP', {
        email,
        otp,
      })
    ).data;
  },
  // ✅ RESET PASSWORD
  resetPassword: async (email: string, otp: number, newPassword: string) => {
    const response = await api.post('/user/auth/driverResetPassword', {
      email,
      otp,
      newPassword,
    });

    return response.data;
  },

  saveFcmToken: async (fcmToken: string) => {
    const response = await api.post('/user/auth/saveFCMToken', {
      fcmToken: fcmToken,
    });

    return response.data;
  },

  // ✅ LOGOUT
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
};
