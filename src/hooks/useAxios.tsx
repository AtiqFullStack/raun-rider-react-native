import { StyleSheet } from 'react-native'
import { useCallback, useMemo, useState } from 'react'
import axios from 'axios'
import NetInfo from '@react-native-community/netinfo'
import Toast from 'react-native-toast-message'
import { BASE_URL } from '../utils/config'
import { FetchArgs } from '../types/axios.types'


export default function useAxios() {
    const [data, setData] = useState()
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const instance = useMemo(() => {
        const axiosInstance = axios.create({
            baseURL: BASE_URL,
            timeout: 30000, 
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`,
            },
        });

        // Request interceptor — network check before every call
        axiosInstance.interceptors.request.use(
            async (config) => {
                const state = await NetInfo.fetch();
                if (!state.isConnected) {
                    Toast.show({
                        type: 'error',
                        text1: 'No Internet Connection',
                        text2: 'Please check your network and try again.',
                        visibilityTime: 3000,
                    });
                    return Promise.reject({ isNetworkError: true, message: 'No internet connection' });
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        return axiosInstance;
    }, [token])

    const fetchData = useCallback(async ({
        method,
        url,
        params,
        data,
        headers,
        showLoader = true
    }: FetchArgs) => {
        try {
            if (showLoader) setLoading(true)
            setError(null)
            const res = await instance({ method, url, params, data, headers })
            setData(res.data)
            return res.data
        } catch (err: any) {
       if (err?.isNetworkError) {
        // Already handled
    } else if (err?.code === 'ECONNABORTED') {
        Toast.show({
            type: 'error',
            text1: 'Slow Internet',
            text2: 'Your internet connection is too slow.',
        });
    } else if (!err?.response) {
        Toast.show({
            type: 'error',
            text1: 'Network Error',
            text2: 'Unable to connect to server.',
        });
    }

    if (!err?.isNetworkError) {
        setError(err?.response?.data || err.message);
    }

    throw err;
        } finally {
            setLoading(false)
        }
    }, [instance])

    return { data, error, loading, token, setToken, fetchData }
}

const styles = StyleSheet.create({})