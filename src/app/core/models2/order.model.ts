import { IUser } from './auth.state.model';
import { IProduct } from './product.model';

export interface Order {
  id: number;
  user_id: number;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_fee: number;
  tax_amount: number;
  discount_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'stripe' | 'paypal';
  payment_id?: string;
  billing_address: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  notes?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  user?: IUser;
  order_items?: IOrderItem[];
  transactions?: ITransaction[];
}

export interface IOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  updated_at: string;
  product?: IProduct;
  order?: Order;
}

export interface Cart {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  user?: IUser;
  cart_items?: ICartItem[];
}

export interface ICartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: IProduct;
  cart?: Cart;
}

export interface IShipping {
  id: number;
  name: string;
  price: number;
  description: string;
  estimated_delivery_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ITransaction {
  id: number;
  order_id: number;
  payment_method: string;
  payment_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  order?: Order;
}
