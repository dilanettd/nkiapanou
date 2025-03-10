import { IUser } from './user.model';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  language: string;
}

export interface ISocialLoginRequest {
  name: string;
  email: string;
  social_id: string;
  social_type: 'facebook' | 'google';
  language?: string;
}

export interface IPasswordResetRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface IAuthResponse {
  status: string;
  message: string;
  user?: IUser;
  token?: string;
  errors?: any;
  email_verified?: boolean;
}
