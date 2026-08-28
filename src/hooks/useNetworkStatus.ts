import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Initial check
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected };
};
