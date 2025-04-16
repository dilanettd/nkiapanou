import { IProduct } from './product.model';
import { IUser } from './user.model';

export interface IOrder {
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
  items?: IOrderItem[];
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
  order?: IOrder;
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
  productDetails?: any;
  subtotal?: number;
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
  currency: string;
  status: string;
  transaction_type: string;
  reference_number?: string;
  fee_amount?: number;
  billing_email?: string;
  billing_name?: string;
  payment_method_details?: string;
  parent_transaction_id?: number;
  notes?: string;
  payment_response?: any;
  created_at: string;
  updated_at: string;
  order?: any;
}

export interface ITransactionStatistics {
  period: {
    start_date: string;
    end_date: string;
  };
  successful_transactions: number;
  total_payments: number;
  total_refunds: number;
  net_revenue: number;
  total_fees: number;
  payment_methods: {
    payment_method: string;
    count: number;
    total: number;
  }[];
}

export interface IRefundRequest {
  parent_transaction_id: number;
  amount: number;
  reason?: string;
}

// Constants pour les méthodes de paiement, statuts et types
export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

export const TRANSACTION_TYPES = {
  PAYMENT: 'payment',
  REFUND: 'refund',
  PARTIAL_REFUND: 'partial_refund',
};

export interface IShippingFormula {
  id: number;
  country_code: string;
  country_name: string;
  base_fee: number;
  price_per_kg: number;
  price_per_cubic_meter: number | null;
  min_shipping_fee: number;
  max_weight: number | null;
  currency: string;
  handling_fee_percentage: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IShippingCalculationResult {
  shipping_cost: number;
  currency: string;
  country_code: string;
  country_name: string;
  weight: number;
  volume: number | null;
  calculation_details: {
    base_fee: number;
    weight_cost: number;
    volume_cost: number;
    handling_fee: number;
    min_shipping_fee: number;
  };
}

export interface IShippingCalculationRequest {
  cart_id: number;
  country_code: string;
}
