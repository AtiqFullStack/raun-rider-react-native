import {DeviceEventEmitter} from 'react-native';

export type AppEvents = {
  notificationReceived: {
    type: string;
    orderId?: string;
    message?: string;
  };

  orderUpdated: {
    orderId: string;
    status: string;
  };
};

export const emitEvent = <K extends keyof AppEvents>(
  eventName: K,
  data: AppEvents[K],
) => {
  DeviceEventEmitter.emit(eventName, data);
};

export const addEventListener = <K extends keyof AppEvents>(
  eventName: K,
  callback: (data: AppEvents[K]) => void,
) => {
  return DeviceEventEmitter.addListener(eventName, callback);
};