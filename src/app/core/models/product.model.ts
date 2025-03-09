import { IUser } from './auth.state.model';
import { IShop } from './seller.model';

export interface IProductImage {
  id: number;
  product_id: number;
  image_url: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IProduct {
  id: number;
  shop_id: number;
  name: string;
  brand?: string;
  slug: string;
  category: string;
  subcategory?: string;
  description?: string;
  currency: string;
  price: number;
  rating: number;
  visit: number;
  stock_quantity: number;
  installment_count: number;
  min_installment_price?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  shop: IShop;
  images: IProductImage[];
  product_code_url: string;
  product_code: string;
}

export interface IProductReview {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  user: IUser;
}

export interface IShopReview {
  id: number;
  shop_id: number;
  user_id: number;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  user: IUser;
}
