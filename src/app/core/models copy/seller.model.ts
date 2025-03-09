export interface IUpdateShop {
  name?: string;
  email?: string;
  contact_number?: string;
  description?: string;
  website_url?: string;
  location?: string;
}
export interface IShop {
  id: string;
  name?: string;
  email?: string;
  contact_number?: string;
  description?: string;
  website_url?: string;
  location?: string;
  cover_photo_url?: string;
  logo_url?: string;
  visit_count?: number;
  coordinate?: string;
  rating: number;
}

export interface ISeller {
  rating: number;
  is_verified: boolean;
  shop: IShop;
}
