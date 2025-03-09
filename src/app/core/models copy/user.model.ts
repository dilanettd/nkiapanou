import { IProduct } from './product.model';

export interface IUser {
  id: number;
  name: string;
  email: string;
  password?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  profile_image?: string;
  email_verified_at?: string;
  remember_token?: string;
  social_id?: string;
  social_type?: 'facebook' | 'google';
  is_social: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: number;
  user_id: number;
  content: string;
  rating: number;
  status: 'published' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: IUser;
}

export interface UserPreference {
  id: number;
  user_id: number;
  newsletter_subscription: boolean;
  preferred_categories?: { [key: number]: boolean };
  preferred_payment_method?: string;
  language: string;
  created_at: string;
  updated_at: string;
  user?: IUser;
}

export interface Wishlist {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  updated_at: string;
  user?: IUser;
  product?: IProduct;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: number;
  user_id: number;
  address_type: 'shipping' | 'billing';
  is_default: boolean;
  recipient_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province?: string;
  postal_code: string;
  country: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
  user?: IUser;
}
