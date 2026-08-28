import React, { createContext, useContext, useEffect, useState } from 'react';
import { BASE_URL } from '../utils/config';

export type AppService = {
  _id: string;
  name: string;
  image?: { url: string; filename: string; mimetype: string; size: number };
  createdAt?: string;
  updatedAt?: string;
};

type AppServicesContextType = {
  appServices: AppService[];
  loadingServices: boolean;
};

const AppServicesContext = createContext<AppServicesContextType>({
  appServices: [],
  loadingServices: false,
});

export const AppServicesProvider = ({ children }: { children: React.ReactNode }) => {
  const [appServices, setAppServices] = useState<AppService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await fetch(`${BASE_URL}/services`);
        const data = await res.json();
        if (data.success) {
          const list = data.data?.services ?? data.data ?? [];
          setAppServices(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        console.error('Failed to fetch app services:', e);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <AppServicesContext.Provider value={{ appServices, loadingServices }}>
      {children}
    </AppServicesContext.Provider>
  );
};

export const useAppServices = () => useContext(AppServicesContext);
