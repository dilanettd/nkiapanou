export interface ICategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent_id?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  subcategories?: ICategory[];
}
