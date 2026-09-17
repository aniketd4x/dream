export interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  opening_time: string | null;
  closing_time: string | null;
  is_active: boolean | null;
  currency: string | null;
  currency_symbol: string | null;
  rating: number | null;
  total_reviews: number | null;
  primary_color: string | null;
  default_language: string | null;
}

export interface RestaurantSettings {
  theme_color: string | null;
  gst_percent: number | null;
  service_charge: number | null;
  accept_orders: boolean | null;
  restaurant_open: boolean | null;
  whatsapp_number: string | null;
  support_number: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
}

export interface DiningTable {
  id: string;
  restaurant_id: string;
  table_number: string | null;
  table_name: string | null;
  capacity: number | null;
  qr_token?: string | null;
  is_active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  display_order: number | null;
}

export interface ItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  display_order: number | null;
  is_default: boolean | null;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  food_type: string | null;
  preparation_time: number | null;
  is_featured: boolean | null;
  is_recommended: boolean | null;
  display_order: number | null;
  has_variant: boolean | null;
  variants: ItemVariant[];
}

export type OrderType = "dine_in" | "takeaway" | "counter";

export interface MenuPayload {
  table: DiningTable | null;
  mode: "table" | "direct";
  availableTables?: DiningTable[];
  restaurant: Restaurant;
  settings: RestaurantSettings | null;
  categories: Category[];
  items: MenuItem[];
}

export type MenuErrorCode =
  | "INVALID_QR"
  | "TABLE_INACTIVE"
  | "RESTAURANT_INACTIVE"
  | "ORDERING_DISABLED"
  | "EMPTY_MENU"
  | "NETWORK";

export interface CartLine {
  key: string;
  itemId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  foodType: string | null;
}

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  tableNumber: string | null;
  orderType?: OrderType | string;
  prepTime: number | null;
  currencySymbol?: string | null;
}

export type OrderStatusCode =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export interface OrderStatusLine {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  food_type: string | null;
}

export interface OrderStatusPayload {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  orderType?: OrderType | string | null;
  paymentStatus: string | null;
  createdAt: string | null;
  tableNumber: string | null;
  customerName: string | null;
  customerMobile?: string | null;
  notes: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  currencySymbol: string | null;
  restaurantName: string;
  restaurantLogo: string | null;
  brandColor: string | null;
  lines: OrderStatusLine[];
}
