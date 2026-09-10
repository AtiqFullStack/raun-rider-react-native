import { DeviceEventEmitter } from 'react-native';

export const AppEvents = DeviceEventEmitter;

export const EVENTS = {
  REFRESH_ORDERS: 'REFRESH_ORDERS',
  NEW_FOOD_ORDER: 'NEW_FOOD_ORDER', // navigate to Trips tab → PENDING
};
