// Field and table configuration for the generic CRUD admin panel.
// Each table declares its columns, foreign-key relationships, and UI hints.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'time'
  | 'date'
  | 'datetime'
  | 'image'
  | 'color';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  fk?: { table: string; labelKey: string; valueKey: string };
  hideInList?: boolean;
  hideInForm?: boolean;
  default?: unknown;
  step?: number;
  min?: number;
  max?: number;
}

export interface TableConfig {
  name: string;
  label: string;
  singular: string;
  icon: string;
  fields: FieldConfig[];
  displayField: string;
  secondaryDisplayField?: string;
  order_by?: { column: string; ascending: boolean };
}

export const TABLES: TableConfig[] = [
  {
    name: 'restaurants',
    label: 'Restaurants',
    singular: 'Restaurant',
    icon: 'Store',
    displayField: 'name',
    secondaryDisplayField: 'owner_name',
    order_by: { column: 'created_at', ascending: false },
    fields: [
      { key: 'name', label: 'Restaurant Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'owner_name', label: 'Owner Name', type: 'text' },
      { key: 'mobile', label: 'Mobile', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'logo_url', label: 'Logo URL', type: 'image' },
      { key: 'cover_image_url', label: 'Cover Image URL', type: 'image' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'country', label: 'Country', type: 'text', default: 'India' },
      { key: 'pincode', label: 'Pincode', type: 'text' },
      { key: 'gst_number', label: 'GST Number', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'opening_time', label: 'Opening Time', type: 'time' },
      { key: 'closing_time', label: 'Closing Time', type: 'time' },
      { key: 'is_active', label: 'Active', type: 'boolean', default: true },
      { key: 'is_verified', label: 'Verified', type: 'boolean', default: false },
      { key: 'currency', label: 'Currency', type: 'text', default: 'INR' },
      { key: 'currency_symbol', label: 'Currency Symbol', type: 'text', default: '₹' },
      { key: 'timezone', label: 'Timezone', type: 'text', default: 'Asia/Kolkata' },
      { key: 'rating', label: 'Rating', type: 'number', default: 0, step: 0.1, min: 0, max: 5 },
      { key: 'total_reviews', label: 'Total Reviews', type: 'number', default: 0 },
      { key: 'primary_color', label: 'Primary Color', type: 'color', default: '#f97316' },
      { key: 'phone_code', label: 'Phone Code', type: 'text', default: '+91' },
      { key: 'default_language', label: 'Default Language', type: 'text', default: 'en' },
    ],
  },
  {
    name: 'subscription_plans',
    label: 'Subscription Plans',
    singular: 'Plan',
    icon: 'CreditCard',
    displayField: 'name',
    order_by: { column: 'price', ascending: true },
    fields: [
      { key: 'name', label: 'Plan Name', type: 'text', required: true },
      { key: 'price', label: 'Price', type: 'number', required: true, default: 0, step: 0.01 },
      { key: 'duration_days', label: 'Duration (days)', type: 'number', required: true, default: 30 },
      { key: 'max_tables', label: 'Max Tables', type: 'number', default: 10 },
      { key: 'max_menu_items', label: 'Max Menu Items', type: 'number', default: 100 },
      { key: 'max_qr_codes', label: 'Max QR Codes', type: 'number', default: 10 },
      { key: 'max_staff', label: 'Max Staff', type: 'number', default: 5 },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'is_active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  {
    name: 'restaurant_subscriptions',
    label: 'Subscriptions',
    singular: 'Subscription',
    icon: 'Receipt',
    displayField: 'id',
    order_by: { column: 'created_at', ascending: false },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      {
        key: 'plan_id',
        label: 'Plan',
        type: 'select',
        required: true,
        fk: { table: 'subscription_plans', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'start_date', label: 'Start Date', type: 'date' },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
      { key: 'amount', label: 'Amount', type: 'number', default: 0, step: 0.01 },
      {
        key: 'payment_status',
        label: 'Payment Status',
        type: 'select',
        default: 'pending',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        default: 'active',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'expired', label: 'Expired' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    ],
  },
  {
    name: 'categories',
    label: 'Categories',
    singular: 'Category',
    icon: 'FolderTree',
    displayField: 'name',
    order_by: { column: 'display_order', ascending: true },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'name', label: 'Category Name', type: 'text', required: true },
      { key: 'image_url', label: 'Image URL', type: 'image' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
      { key: 'is_active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  {
    name: 'menu_items',
    label: 'Menu Items',
    singular: 'Menu Item',
    icon: 'UtensilsCrossed',
    displayField: 'name',
    order_by: { column: 'display_order', ascending: true },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      {
        key: 'category_id',
        label: 'Category',
        type: 'select',
        required: true,
        fk: { table: 'categories', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'name', label: 'Item Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image_url', label: 'Image URL', type: 'image' },
      { key: 'price', label: 'Price', type: 'number', required: true, default: 0, step: 0.01 },
      {
        key: 'food_type',
        label: 'Food Type',
        type: 'select',
        default: 'veg',
        options: [
          { value: 'veg', label: 'Veg' },
          { value: 'non_veg', label: 'Non-Veg' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'egg', label: 'Egg' },
        ],
      },
      { key: 'preparation_time', label: 'Prep Time (min)', type: 'number', default: 15 },
      { key: 'is_available', label: 'Available', type: 'boolean', default: true },
      { key: 'is_featured', label: 'Featured', type: 'boolean', default: false },
      { key: 'is_recommended', label: 'Recommended', type: 'boolean', default: false },
      { key: 'has_variant', label: 'Has Variants', type: 'boolean', default: false },
      { key: 'has_addon', label: 'Has Add-ons', type: 'boolean', default: false },
      { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      { key: 'sku', label: 'SKU', type: 'text' },
    ],
  },
  {
    name: 'dining_tables',
    label: 'Dining Tables',
    singular: 'Table',
    icon: 'Table2',
    displayField: 'table_number',
    secondaryDisplayField: 'table_name',
    order_by: { column: 'table_number', ascending: true },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'table_number', label: 'Table Number', type: 'text', required: true },
      { key: 'table_name', label: 'Table Name', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'number', default: 4 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        default: 'available',
        options: [
          { value: 'available', label: 'Available' },
          { value: 'occupied', label: 'Occupied' },
          { value: 'reserved', label: 'Reserved' },
          { value: 'cleaning', label: 'Cleaning' },
        ],
      },
      { key: 'is_active', label: 'Active', type: 'boolean', default: true },
      { key: 'qr_token', label: 'QR Token', type: 'text' },
    ],
  },
  {
    name: 'orders',
    label: 'Orders',
    singular: 'Order',
    icon: 'ShoppingBag',
    displayField: 'order_number',
    order_by: { column: 'created_at', ascending: false },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      {
        key: 'table_id',
        label: 'Table',
        type: 'select',
        fk: { table: 'dining_tables', labelKey: 'table_number', valueKey: 'id' },
      },
      { key: 'order_number', label: 'Order Number', type: 'text', required: true },
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'customer_mobile', label: 'Customer Mobile', type: 'text' },
      { key: 'total_amount', label: 'Total Amount', type: 'number', default: 0, step: 0.01 },
      { key: 'tax_amount', label: 'Tax Amount', type: 'number', default: 0, step: 0.01 },
      { key: 'discount_amount', label: 'Discount Amount', type: 'number', default: 0, step: 0.01 },
      { key: 'grand_total', label: 'Grand Total', type: 'number', default: 0, step: 0.01 },
      {
        key: 'payment_method',
        label: 'Payment Method',
        type: 'select',
        options: [
          { value: 'cash', label: 'Cash' },
          { value: 'card', label: 'Card' },
          { value: 'upi', label: 'UPI' },
          { value: 'online', label: 'Online' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'payment_method_note', label: 'Payment Method Note', type: 'text' },
      {
        key: 'payment_status',
        label: 'Payment Status',
        type: 'select',
        default: 'unpaid',
        options: [
          { value: 'unpaid', label: 'Unpaid' },
          { value: 'paid', label: 'Paid' },
          { value: 'partially_paid', label: 'Partially Paid' },
          { value: 'refunded', label: 'Refunded' },
          { value: 'pending', label: 'Pending' },
        ],
      },
      {
        key: 'order_status',
        label: 'Order Status',
        type: 'select',
        default: 'pending',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'preparing', label: 'Preparing' },
          { value: 'ready', label: 'Ready' },
          { value: 'served', label: 'Served' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
      {
        key: 'order_type',
        label: 'Order Type',
        type: 'select',
        default: 'dine_in',
        options: [
          { value: 'dine_in', label: 'Dine In' },
          { value: 'takeaway', label: 'Takeaway' },
          { value: 'delivery', label: 'Delivery' },
        ],
      },
      { key: 'table_number', label: 'Table Number', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    name: 'order_items',
    label: 'Order Items',
    singular: 'Order Item',
    icon: 'ListOrdered',
    displayField: 'item_name',
    order_by: { column: 'created_at', ascending: false },
    fields: [
      {
        key: 'order_id',
        label: 'Order',
        type: 'select',
        required: true,
        fk: { table: 'orders', labelKey: 'order_number', valueKey: 'id' },
      },
      {
        key: 'menu_item_id',
        label: 'Menu Item',
        type: 'select',
        fk: { table: 'menu_items', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, default: 1 },
      { key: 'unit_price', label: 'Unit Price', type: 'number', required: true, default: 0, step: 0.01 },
      { key: 'total_price', label: 'Total Price', type: 'number', default: 0, step: 0.01 },
      {
        key: 'food_type',
        label: 'Food Type',
        type: 'select',
        default: 'veg',
        options: [
          { value: 'veg', label: 'Veg' },
          { value: 'non_veg', label: 'Non-Veg' },
          { value: 'vegan', label: 'Vegan' },
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    name: 'restaurant_settings',
    label: 'Settings',
    singular: 'Setting',
    icon: 'Settings',
    displayField: 'theme_color',
    order_by: { column: 'created_at', ascending: false },
    fields: [
      {
        key: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        fk: { table: 'restaurants', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'theme_color', label: 'Theme Color', type: 'color', default: '#f97316' },
      { key: 'gst_percent', label: 'GST %', type: 'number', default: 0, step: 0.01 },
      { key: 'service_charge', label: 'Service Charge %', type: 'number', default: 0, step: 0.01 },
      { key: 'accept_orders', label: 'Accept Orders', type: 'boolean', default: true },
      { key: 'restaurant_open', label: 'Restaurant Open', type: 'boolean', default: true },
      { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'text' },
      { key: 'support_number', label: 'Support Number', type: 'text' },
      { key: 'website_url', label: 'Website URL', type: 'text' },
      { key: 'facebook_url', label: 'Facebook URL', type: 'text' },
      { key: 'instagram_url', label: 'Instagram URL', type: 'text' },
      { key: 'youtube_url', label: 'YouTube URL', type: 'text' },
    ],
  },
  {
    name: 'item_variants',
    label: 'Item Variants',
    singular: 'Variant',
    icon: 'Layers',
    displayField: 'name',
    order_by: { column: 'display_order', ascending: true },
    fields: [
      {
        key: 'menu_item_id',
        label: 'Menu Item',
        type: 'select',
        required: true,
        fk: { table: 'menu_items', labelKey: 'name', valueKey: 'id' },
      },
      { key: 'name', label: 'Variant Name', type: 'text', required: true },
      { key: 'price', label: 'Price', type: 'number', required: true, default: 0, step: 0.01 },
      { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      { key: 'is_default', label: 'Default', type: 'boolean', default: false },
      { key: 'is_active', label: 'Active', type: 'boolean', default: true },
    ],
  },
];

export const TABLE_MAP: Record<string, TableConfig> = Object.fromEntries(
  TABLES.map((t) => [t.name, t])
);
