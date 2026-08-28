import { NativeModules } from 'react-native';

const { PaynowModule } = NativeModules;

export default PaynowModule as {
  createPayment(
    amount: string,
    email: string,
    phone: string,
  ): Promise<{ success: boolean; pollUrl: string; instructions: string }>;
  checkPaymentStatus(
    pollUrl: string,
  ): Promise<{ paid: boolean; status: string }>;
};
