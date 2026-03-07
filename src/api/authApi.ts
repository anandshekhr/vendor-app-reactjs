import { apiClient } from './client';
import {
  LoginRequest,
  OTPVerifyRequest,
  RegisterRequest,
  Vendor,
} from '../models/types';

interface AuthResponse {
  token: string;
  vendor: Vendor;
  isNewUser: boolean;
}

interface OTPResponse {
  success: boolean;
  message: string;
}

export const authApi = {
  sendOTP: (data: LoginRequest): Promise<OTPResponse> =>
    apiClient.post('/auth/send-otp', data),

  verifyOTP: (data: OTPVerifyRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/verify-otp', data),

  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/register', data),

  getProfile: (): Promise<Vendor> =>
    apiClient.get('/vendor/profile'),

  updateProfile: (data: Partial<Vendor>): Promise<Vendor> =>
    apiClient.put('/vendor/profile', data),

  uploadShopImage: (formData: FormData): Promise<{ imageUrl: string }> =>
    apiClient.upload('/vendor/upload-image', formData),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout'),
};
