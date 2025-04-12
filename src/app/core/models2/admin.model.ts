import { IUser } from './user.model';

export interface IAdmin {
  id: number;
  user_id: number;
  role: 'superadmin' | 'admin' | 'editor';
  status: boolean;
  created_at: string;
  updated_at: string;
  user?: IUser;
}
