
// const BASE_URL = 'https://192.168.1.51:5091/api/v1';
// const BASE_URL = 'https://srrtfv11-5091.inc1.devtunnels.ms/api/v1';

import { BASE_URL } from "../utils/config";
import StorageService from '../utils/Storage';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

const checkNetwork = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    Toast.show({
      type: 'error',
      text1: 'No Internet Connection',
      text2: 'Please check your network and try again.',
      visibilityTime: 3000,
    });
    throw new Error('No internet connection');
  }
};

const createFetchWithTimeout = (timeout = 10000) => {
  return (url: string, options: RequestInit = {}) => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  };
};

const fetchWithTimeout = createFetchWithTimeout();

const getAuthHeaders = async (extraHeaders = {}) => {
    const storedToken = await StorageService.getItem('token')

  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    ...extraHeaders,
  };
};

export const api = {
  get: async (endpoint: string) => {
    await checkNetwork();
    const headers = await getAuthHeaders();
    try {
         const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API GET Error:', error.message);
      if (error.message === 'NO_INTERNET' || error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      throw error;
    }
  },

  post: async (endpoint: string, data: any) => {
    await checkNetwork();
    try {
       const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }
      
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API POST Error:', error.message);
      if (error.message === 'NO_INTERNET' || error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      throw error;
    }
  },

  putFormData: async (endpoint: string, formData: FormData) => {
    await checkNetwork();
    try {
      const token = await StorageService.getItem('token');
      const fetchWithLongTimeout = createFetchWithTimeout(60000);
      const response = await fetchWithLongTimeout(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API PUT FormData Error:', error.message);
      if (error.message === 'NO_INTERNET' || error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      throw error;
    }
  },

  delete: async (endpoint: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API DELETE Error:', error.message);
      throw error;
    }
  },

  patch: async (endpoint: string, data: any = {}) => {
    await checkNetwork();
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API PATCH Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API PATCH Error:', error.message);
      if (error.message === 'NO_INTERNET' || error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      throw error;
    }
  },

  postFormData: async (endpoint: string, formData: FormData) => {
    await checkNetwork();
    try {
       const token = await StorageService.getItem('token');

      const fetchWithLongTimeout = createFetchWithTimeout(60000);

      const response = await fetchWithLongTimeout(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // ❌ Content-Type mat dena (RN khud set karta hai)
        },
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API FormData Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }
      
      return { data: await response.json() };
    } catch (error: any) {
      console.error('API FormData Error:', error.message);
      if (error.message === 'NO_INTERNET' || error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      throw error;
    }
  },
};

export const createPaymentApi = async (payload: {
  type: string;
  amount: number;
  phone: string;
  email: string;
  method: string;
}) => {
  const res = await api.post('/payment/process', payload);

  return res.data as {
    success: boolean;
    flow: string;
    redirectUrl: string;
    pollUrl: string;
    paymentId: string;
    reference: string;
    amount: number;
  };
};
export const checkPaymentStatusApi = async (paymentId: string) => {
  const res = await api.post('/payment/check-status', {
    paymentId,
  });

  return res.data as {
    paid: boolean;
    status: string;
    referenceId: string;
    amount: number;
  };
};