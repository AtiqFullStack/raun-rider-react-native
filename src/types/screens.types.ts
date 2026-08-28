export type Screen =
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'register'
  | 'review'
  | 'forgotPassword'
  | 'emailVerify'
  | 'resetPassword'
  | 'mobileVerify'
  | 'home';

export type ResetData = {
  email: string;
  message: 'register' | 'forgetpassword' | 'reset';
  otp?: string;
  registrationData?: any;
};