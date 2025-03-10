import { ISeller } from './seller.model';

export interface AuthStateModel {
  isAuthenticated: boolean;
  accessToken: string;
  refreshToken: string;
  role: string;
  me: IUser | null;
}

export interface IUser {
  id: string;
  facebookId?: string;
  googleId?: string;
  name: string;
  email: string;
  is_email_verified: boolean;
  phone?: string;
  is_phone_verified: boolean;
  profile_url?: string;
  phone_verified_at?: string;
  email_verified_at?: string;
  is_active: boolean;
  is_admin: boolean;
  password: string;
  role: string;
  rememberToken?: string;
  created_at: string;
  updated_at: string;
  seller: ISeller;
}

export interface IAdmin {
  user_id: string;
  role: string;
  permissions: string[];
}

export interface ILoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  expires_in: number;
}

export interface IResetPasswordRequest {
  email: string;
  password: string;
  token: string;
}

export interface ICreateAdminRequest {
  user_id: string;
  role: string;
  permissions: string[];
}

export interface ICreateFirstAdminRequest {
  user_id: string;
  role: string;
  permissions: string[];
}

export interface IAdminLoginResponse {
  access_token: string;
  role: string;
  expires_in: number;
}
