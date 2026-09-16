import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SocketContextType = {
  socket: Socket | null;
  isSocketConnected: boolean;
  connectSocket: (token?: string) => void;
  disconnectSocket: () => void;
};

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isSocketConnected: false,
  connectSocket: () => { },
  disconnectSocket: () => { },
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  console.log(socket)
  const connectSocket = async (token?: string) => {
    if (socketRef.current) return;

    const authToken = token || (await AsyncStorage.getItem('token'));

    const newSocket = io(SOCKET_URL, {
      extraHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      auth: authToken ? { token: authToken } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket); // 🔥 important

    newSocket.on('connect', () => {

      setIsSocketConnected(true);
    });

    newSocket.on('disconnect', reason => {
      console.log('❌ Socket disconnected:', reason);
      setIsSocketConnected(false);
    });

    newSocket.on('connect_error', err => {
      console.log('⚠️ Socket error:', err.message);
    });
  };

  const disconnectSocket = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocket(null);
    setIsSocketConnected(false);
  };

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isSocketConnected,
        connectSocket,
        disconnectSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
