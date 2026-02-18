export type Category = {
  id?: number;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  image_url?: string | null;
};

export type ProductImage = {
  id?: number;
  url: string;
  alt?: string | null;
  sort_order?: number;
};

export type Product = {
  id?: number;
  name: string;
  slug: string;
  description?: string | null;
  price?: number | string;
  compare_at_price?: number | string | null;
  stock?: number;
  status?: "draft" | "active";
  tag_delivery?: "PRET_A_ETRE_LIVRE" | "SUR_COMMANDE";
  delivery_delay_days?: number | null;
  sku?: string | null;
  metadata?: Record<string, unknown> | null;
  featured?: boolean;
  is_promo?: boolean;
  images?: ProductImage[];
  categories?: Category[];
};

export type CartItem = {
  id: number;
  product_id: number;
  qty: number;
  product?: Product;
};

export type Cart = {
  id: number;
  user_id: number;
  items: CartItem[];
};

export type Order = {
  id: number;
  status: string;
  tag_delivery: "PRET_A_ETRE_LIVRE" | "SUR_COMMANDE";
  subtotal: number | string;
  total: number | string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
  items?: Array<{
    id: number;
    name: string;
    price: number | string;
    qty: number;
    total: number | string;
    product?: Product | null;
  }>;
};

export type Address = {
  id: number;
  user_id: number;
  type: string;
  full_name: string;
  line1: string;
  line2?: string | null;
  city: string;
  postal_code: string;
  country: string;
  phone?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductReview = {
  id: number;
  product_id: number;
  rating: number;
  title: string;
  body: string;
  name: string;
  email: string;
  helpful_yes: number;
  helpful_no: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductReviewsResponse = {
  data: ProductReview[];
  meta: {
    total: number;
    average: number;
    breakdown: Record<number, number>;
    limit: number;
  };
};
