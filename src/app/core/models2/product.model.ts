import { IUser } from './auth.state.model';
import { ICategory } from './category.model';

export interface IProduct {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discount_price?: number;
  quantity: number;
  category_id: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  featured: boolean;
  weight?: number;
  dimensions?: string;
  origin_country?: string;
  sku: string;
  packaging?: string;
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
  images: IProductImage[];
  category?: ICategory;
  reviews?: IProductReview[];
}

export interface IProductImage {
  id: number;
  product_id: number;
  image_path: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface IProductReview {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string;
  status: 'published' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: IUser;
  product?: IProduct;
}
