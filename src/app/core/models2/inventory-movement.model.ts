import { IAdmin } from './auth.state.model';
import { IProduct } from './product.model';

export interface IInventoryMovement {
  id: number;
  product_id: number;
  quantity: number;
  reference_type: 'order' | 'manual' | 'return' | 'adjustment' | 'initial';
  reference_id?: number;
  notes?: string;
  admin_id?: number;
  created_at: string;
  updated_at: string;
  product?: IProduct;
  admin?: IAdmin;
}
