import { supabase } from './supabase';
import type {
  Category,
  DiningTable,
  ItemVariant,
  MenuItem,
  MenuPayload,
  OrderStatusCode,
  OrderStatusLine,
  OrderStatusPayload,
  OrderType,
  PlacedOrder,
  Restaurant,
  RestaurantSettings,
} from '@/types/menu';

export class MenuError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const RESTAURANT_COLS =
  'id,name,slug,logo_url,cover_image_url,description,address,city,opening_time,closing_time,is_active,currency,currency_symbol,rating,total_reviews,primary_color,default_language';
const SETTINGS_COLS =
  'theme_color,gst_percent,service_charge,accept_orders,restaurant_open,whatsapp_number,support_number,instagram_url,facebook_url';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const DEMO_RESTAURANT: Restaurant = {
  id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
  name: 'Spice Garden',
  slug: 'spice-garden',
  description: 'Contemporary artisanal Indian dining and royal culinary heritage.',
  address: '42 Gourmet Avenue, MG Road',
  city: 'Mumbai',
  cover_image_url: null,
  opening_time: '11:00:00',
  closing_time: '23:30:00',
  currency: 'INR',
  currency_symbol: '₹',
  rating: 4.9,
  total_reviews: 1420,
  primary_color: '#0F766E',
  default_language: 'en',
  is_active: true,
  logo_url: '/logo.png',
};

export const DEMO_SETTINGS: RestaurantSettings = {
  theme_color: '#0F766E',
  gst_percent: 5,
  service_charge: 0,
  accept_orders: true,
  restaurant_open: true,
  whatsapp_number: '+919876543210',
  support_number: '+919876543210',
  instagram_url: null,
  facebook_url: null,
};

export const DEMO_TABLE: DiningTable = {
  id: 'a1111111-1111-1111-1111-111111111111',
  restaurant_id: DEMO_RESTAURANT.id,
  table_number: 'T1',
  table_name: 'Window Seat T1',
  capacity: 4,
  is_active: true,
  qr_token: 'TBL-M12WSF9O',
};

export const DEMO_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Starters & Appetizers', icon: '🥘', display_order: 1, description: null, image_url: null },
  { id: 'c2', name: 'Main Course Curry', icon: '🍛', display_order: 2, description: null, image_url: null },
  { id: 'c3', name: 'Biryani & Rice', icon: '🍚', display_order: 3, description: null, image_url: null },
  { id: 'c4', name: 'Tandoori Breads', icon: '🫓', display_order: 4, description: null, image_url: null },
  { id: 'c5', name: 'Beverages & Mocktails', icon: '🍹', display_order: 5, description: null, image_url: null },
  { id: 'c6', name: 'Desserts', icon: '🍨', display_order: 6, description: null, image_url: null },
];

export const DEMO_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    category_id: 'c1',
    name: 'Paneer Tikka Angara',
    description: 'Smoked cottage cheese cubes marinated in Kashmiri red chili, hung curd, and stone-ground spices.',
    price: 280,
    food_type: 'veg',
    preparation_time: 15,
    is_featured: true,
    is_recommended: true,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80',
    variants: [],
  },
  {
    id: 'm2',
    category_id: 'c1',
    name: 'Crispy Corn & Water Chestnut',
    description: 'Golden tossed crispy sweet corn kernels seasoned with scallions and crushed black pepper.',
    price: 220,
    food_type: 'veg',
    preparation_time: 12,
    is_featured: false,
    is_recommended: false,
    display_order: 2,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80',
    variants: [],
  },
  {
    id: 'm3',
    category_id: 'c2',
    name: 'Butter Paneer Masala',
    description: 'Velvety slow-simmered tomato gravy infused with aromatic fenugreek and organic artisanal butter.',
    price: 320,
    food_type: 'veg',
    preparation_time: 18,
    is_featured: true,
    is_recommended: true,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80',
    variants: [],
  },
  {
    id: 'm4',
    category_id: 'c2',
    name: 'Dal Makhani Royal',
    description: 'Black lentils slow-cooked overnight over charcoal, finished with churned white butter.',
    price: 260,
    food_type: 'veg',
    preparation_time: 20,
    is_featured: true,
    is_recommended: false,
    display_order: 2,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80',
    variants: [],
  },
  {
    id: 'm5',
    category_id: 'c3',
    name: 'Hyderabadi Dum Biryani',
    description: 'Long-grain royal Basmati layered with seasonal vegetables, caramelized onions, saffron & mint.',
    price: 310,
    food_type: 'veg',
    preparation_time: 25,
    is_featured: true,
    is_recommended: true,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
    variants: [],
  },
  {
    id: 'm6',
    category_id: 'c4',
    name: 'Garlic Butter Naan',
    description: 'Fluffy clay-oven flatbread topped with toasted garlic flakes and brushed with golden butter.',
    price: 65,
    food_type: 'veg',
    preparation_time: 8,
    is_featured: false,
    is_recommended: false,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80',
    variants: [],
  },
  {
    id: 'm7',
    category_id: 'c5',
    name: 'Fresh Mint Mojito',
    description: 'Crushed fresh garden mint, zesty Key lime, sparkling mineral water, and raw cane sugar.',
    price: 140,
    food_type: 'veg',
    preparation_time: 5,
    is_featured: true,
    is_recommended: false,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80',
    variants: [],
  },
  {
    id: 'm8',
    category_id: 'c6',
    name: 'Gulab Jamun with Rabdi',
    description: 'Warm saffron-scented milk dough dumplings dipped in cardamom syrup, topped with rich rabdi.',
    price: 150,
    food_type: 'veg',
    preparation_time: 5,
    is_featured: true,
    is_recommended: true,
    display_order: 1,
    has_variant: false,
    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80',
    variants: [],
  },
];

export async function resolveContext(identifier: string) {
  const cleanIdentifier = identifier.trim();

  // Check demo token shortcut or unseeded database fallback
  const isDemoToken = cleanIdentifier.toUpperCase() === 'TBL-M12WSF9O' || cleanIdentifier.toLowerCase() === 'demo';

  // Step A: Check if identifier is a Table QR Token
  let table: any = null;
  try {
    const { data, error: tableErr } = await supabase
      .from('dining_tables')
      .select('id,restaurant_id,table_number,table_name,capacity,is_active')
      .eq('qr_token', cleanIdentifier)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!tableErr) {
      table = data;
    }
  } catch (_) {
    table = null;
  }

  if (table) {
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select(RESTAURANT_COLS)
      .eq('id', (table as { restaurant_id: string }).restaurant_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (restErr) throw new MenuError('NETWORK', restErr.message);
    if (!restaurant)
      throw new MenuError('RESTAURANT_INACTIVE', 'This restaurant is currently unavailable.');

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select(SETTINGS_COLS)
      .eq('restaurant_id', (table as { restaurant_id: string }).restaurant_id)
      .limit(1)
      .maybeSingle();

    return {
      mode: 'table' as const,
      table: table as unknown as DiningTable,
      availableTables: [] as DiningTable[],
      restaurant: restaurant as unknown as Restaurant,
      settings: (settings ?? null) as RestaurantSettings | null,
    };
  }

  // Fallback for Demo Table T1 if database is unseeded
  if (isDemoToken || cleanIdentifier.toUpperCase().startsWith('TBL-')) {
    return {
      mode: 'table' as const,
      table: { ...DEMO_TABLE, qr_token: cleanIdentifier },
      availableTables: [DEMO_TABLE],
      restaurant: DEMO_RESTAURANT,
      settings: DEMO_SETTINGS,
    };
  }

  // Step B: Check if identifier is a Restaurant Slug or Restaurant ID
  let restQuery = supabase
    .from('restaurants')
    .select(RESTAURANT_COLS)
    .eq('is_active', true);

  if (UUID_REGEX.test(cleanIdentifier)) {
    restQuery = restQuery.or(`slug.eq.${cleanIdentifier},id.eq.${cleanIdentifier}`);
  } else {
    restQuery = restQuery.eq('slug', cleanIdentifier);
  }

  const { data: restaurant, error: restErr } = await restQuery.limit(1).maybeSingle();

  if (restErr) throw new MenuError('NETWORK', restErr.message);
  if (!restaurant) {
    throw new MenuError('INVALID_QR', 'This restaurant menu or QR code is not valid.');
  }

  const [settingsRes, tablesRes] = await Promise.all([
    supabase
      .from('restaurant_settings')
      .select(SETTINGS_COLS)
      .eq('restaurant_id', (restaurant as { id: string }).id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('dining_tables')
      .select('id,restaurant_id,table_number,table_name,capacity,is_active')
      .eq('restaurant_id', (restaurant as { id: string }).id)
      .eq('is_active', true)
      .order('table_number', { ascending: true }),
  ]);

  return {
    mode: 'direct' as const,
    table: null,
    availableTables: (tablesRes.data ?? []) as unknown as DiningTable[],
    restaurant: restaurant as unknown as Restaurant,
    settings: (settingsRes.data ?? null) as RestaurantSettings | null,
  };
}

export async function loadMenu(identifier: string): Promise<MenuPayload> {
  const { mode, table, restaurant, settings, availableTables } = await resolveContext(identifier);

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id,name,description,image_url,icon,display_order')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select(
        'id,category_id,name,description,image_url,price,food_type,preparation_time,is_featured,is_recommended,display_order,has_variant'
      )
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', true)
      .order('display_order', { ascending: true }),
  ]);

  const rawCategories = (categoriesRes.data ?? []) as unknown as Category[];
  const rawItems = itemsRes.data ?? [];

  // Fallback to rich demo menu items if database is unseeded
  if ((rawCategories.length === 0 && rawItems.length === 0) || categoriesRes.error || itemsRes.error) {
    if (restaurant.id === DEMO_RESTAURANT.id || table?.qr_token?.toUpperCase().startsWith('TBL-')) {
      return {
        mode,
        table: table ?? DEMO_TABLE,
        availableTables: availableTables.length > 0 ? availableTables : [DEMO_TABLE],
        restaurant: {
          ...restaurant,
          rating: restaurant.rating === null ? 4.9 : Number(restaurant.rating),
        },
        settings: settings ?? DEMO_SETTINGS,
        categories: DEMO_CATEGORIES,
        items: DEMO_MENU_ITEMS,
      };
    }
  }

  if (categoriesRes.error) throw new MenuError('NETWORK', categoriesRes.error.message);
  if (itemsRes.error) throw new MenuError('NETWORK', itemsRes.error.message);

  const variantItemIds = rawItems.filter((i) => i.has_variant).map((i) => i.id);

  let variants: ItemVariant[] = [];
  if (variantItemIds.length > 0) {
    const { data, error } = await supabase
      .from('item_variants')
      .select('id,menu_item_id,name,price,display_order,is_default')
      .in('menu_item_id', variantItemIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw new MenuError('NETWORK', error.message);
    variants = (data ?? []) as unknown as ItemVariant[];
  }

  const byItem = new Map<string, ItemVariant[]>();
  for (const v of variants) {
    const list = byItem.get(v.menu_item_id) ?? [];
    list.push({ ...v, price: Number(v.price) });
    byItem.set(v.menu_item_id, list);
  }

  const items: MenuItem[] = rawItems.map((i) => ({
    ...i,
    price: Number(i.price),
    variants: byItem.get(i.id) ?? [],
  }));

  return {
    mode,
    table,
    availableTables,
    restaurant: {
      ...restaurant,
      rating: restaurant.rating === null ? null : Number(restaurant.rating),
    },
    settings,
    categories: (categoriesRes.data ?? []) as unknown as Category[],
    items,
  };
}

export interface OrderInput {
  qrToken?: string;
  identifier?: string;
  orderType?: OrderType;
  tableNumber?: string | null;
  diningTableId?: string | null;
  customerName: string;
  customerMobile: string;
  notes?: string;
  lines: { itemId: string; variantId: string | null; quantity: number }[];
}

export async function createOrder(input: OrderInput): Promise<PlacedOrder> {
  const tokenOrSlug = input.identifier || input.qrToken || '';
  const { mode, table, restaurant, settings, availableTables } = await resolveContext(tokenOrSlug);

  if (settings && (settings.accept_orders === false || settings.restaurant_open === false)) {
    throw new MenuError('ORDERING_DISABLED', 'Ordering is currently unavailable at this restaurant.');
  }

  const requestedOrderType = input.orderType ?? (mode === 'table' ? 'dine_in' : 'dine_in');
  let tableId: string | null = null;
  let tableNumber: string | null = null;

  if (mode === 'table' && table) {
    tableId = table.id;
    tableNumber = table.table_number;
  } else if (requestedOrderType === 'dine_in') {
    if (input.diningTableId) {
      const match = availableTables.find((t) => t.id === input.diningTableId);
      tableId = match?.id ?? input.diningTableId;
      tableNumber = match?.table_number ?? input.tableNumber ?? null;
    } else if (input.tableNumber) {
      tableNumber = input.tableNumber.trim();
      const match = availableTables.find(
        (t) => (t.table_number ?? '').toLowerCase() === (tableNumber ?? '').toLowerCase()
      );
      if (match) {
        tableId = match.id;
      }
    }
  }

  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const { data: itemRows, error: itemErr } = await supabase
    .from('menu_items')
    .select('id,name,price,food_type,has_variant,preparation_time')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .in('id', itemIds);
  if (itemErr) throw new MenuError('NETWORK', itemErr.message);

  const itemMap = new Map(
    ((itemRows ?? []) as unknown as {
      id: string;
      name: string;
      price: number;
      food_type: string | null;
      has_variant: boolean | null;
      preparation_time: number | null;
    }[]).map((r) => [r.id, r])
  );

  const variantIds = input.lines
    .map((l) => l.variantId)
    .filter((v): v is string => typeof v === 'string');
  const variantMap = new Map<string, { id: string; menu_item_id: string; name: string; price: number }>();
  if (variantIds.length > 0) {
    const { data, error } = await supabase
      .from('item_variants')
      .select('id,menu_item_id,name,price')
      .eq('is_active', true)
      .in('id', variantIds);
    if (error) throw new MenuError('NETWORK', error.message);
    for (const v of (data ?? []) as unknown as {
      id: string;
      menu_item_id: string;
      name: string;
      price: number;
    }[]) {
      variantMap.set(v.id, v);
    }
  }

  let subtotal = 0;
  let maxPrep = 0;
  const orderItems: Record<string, unknown>[] = [];

  for (const line of input.lines) {
    const item = itemMap.get(line.itemId);
    if (!item) {
      throw new MenuError('ITEM_UNAVAILABLE', 'Some items are no longer available.');
    }
    let unitPrice = Number(item.price);
    let name = item.name;
    if (line.variantId) {
      const variant = variantMap.get(line.variantId);
      if (!variant || variant.menu_item_id !== item.id) {
        throw new MenuError('ITEM_UNAVAILABLE', 'Some selected options are no longer available.');
      }
      unitPrice = Number(variant.price);
      name = `${item.name} (${variant.name})`;
    }
    const total = round2(unitPrice * line.quantity);
    subtotal += total;
    maxPrep = Math.max(maxPrep, Number(item.preparation_time ?? 0));
    orderItems.push({
      menu_item_id: item.id,
      item_name: name,
      quantity: line.quantity,
      unit_price: unitPrice,
      total_price: total,
      notes: null,
      food_type: item.food_type,
    });
  }

  subtotal = round2(subtotal);
  const gstPercent = Number(settings?.gst_percent ?? 0);
  const servicePercent = Number(settings?.service_charge ?? 0);
  const taxAmount = round2((subtotal * gstPercent) / 100);
  const serviceAmount = round2((subtotal * servicePercent) / 100);
  const grandTotal = round2(subtotal + taxAmount + serviceAmount);

  const orderNumber = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

  const basePayload: Record<string, unknown> = {
    restaurant_id: restaurant.id,
    table_id: tableId,
    table_number: tableNumber,
    customer_name: input.customerName,
    customer_mobile: input.customerMobile,
    total_amount: subtotal,
    tax_amount: round2(taxAmount + serviceAmount),
    discount_amount: 0,
    grand_total: grandTotal,
    payment_method: 'cash',
    payment_status: 'pending',
    order_status: 'pending',
    order_type: requestedOrderType,
    notes: input.notes ? input.notes : null,
  };

  let inserted: { id: string; order_number: string | null } | null = null;
  let insertError: string | null = null;

  for (const payload of [basePayload, { ...basePayload, order_number: orderNumber }]) {
    const { data, error } = await supabase
      .from('orders')
      .insert(payload)
      .select('id,order_number')
      .single();
    if (!error && data) {
      inserted = data as unknown as { id: string; order_number: string | null };
      break;
    }
    insertError = error?.message ?? 'Unable to place the order.';
  }

  if (!inserted) throw new MenuError('ORDER_FAILED', insertError ?? 'Unable to place the order.');

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems.map((oi) => ({ ...oi, order_id: inserted!.id })));
  if (itemsErr) throw new MenuError('ORDER_FAILED', itemsErr.message);

  return {
    orderId: inserted.id,
    orderNumber: inserted.order_number ?? orderNumber,
    grandTotal,
    tableNumber: tableNumber,
    orderType: requestedOrderType,
    prepTime: maxPrep > 0 ? maxPrep : null,
    currencySymbol: restaurant.currency_symbol,
  };
}

const ALLOWED_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
] as const;

export async function loadOrderStatus(orderId: string): Promise<OrderStatusPayload> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id,restaurant_id,order_number,order_status,payment_status,order_type,created_at,table_number,customer_name,customer_mobile,notes,total_amount,tax_amount,discount_amount,grand_total'
    )
    .eq('id', orderId)
    .limit(1)
    .maybeSingle();

  if (error) throw new MenuError('NETWORK', error.message);
  if (!order) throw new MenuError('ORDER_NOT_FOUND', "We couldn't find that order.");

  const row = order as unknown as Record<string, unknown>;

  const [restaurantRes, settingsRes, itemsRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name,logo_url,currency_symbol,primary_color')
      .eq('id', row['restaurant_id'] as string)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('restaurant_settings')
      .select('theme_color')
      .eq('restaurant_id', row['restaurant_id'] as string)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('order_items')
      .select('id,item_name,quantity,unit_price,total_price,food_type')
      .eq('order_id', orderId),
  ]);

  const restaurant = (restaurantRes.data ?? null) as unknown as {
    name: string;
    logo_url: string | null;
    currency_symbol: string | null;
    primary_color: string | null;
  } | null;
  const theme = (settingsRes.data ?? null) as unknown as { theme_color: string | null } | null;

  const rawStatus = String(row['order_status'] ?? 'pending').toLowerCase();
  const status = (ALLOWED_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as OrderStatusPayload['status'])
    : 'pending';

  return {
    id: String(row['id']),
    orderNumber: String(row['order_number'] ?? '').trim() || String(row['id']).slice(0, 8),
    status,
    orderType: (row['order_type'] as string | null) ?? null,
    paymentStatus: (row['payment_status'] as string | null) ?? null,
    createdAt: (row['created_at'] as string | null) ?? null,
    tableNumber: (row['table_number'] as string | null) ?? null,
    customerName: (row['customer_name'] as string | null) ?? null,
    customerMobile: (row['customer_mobile'] as string | null) ?? null,
    notes: (row['notes'] as string | null) ?? null,
    subtotal: Number(row['total_amount'] ?? 0),
    taxAmount: Number(row['tax_amount'] ?? 0),
    discountAmount: Number(row['discount_amount'] ?? 0),
    grandTotal: Number(row['grand_total'] ?? 0),
    currencySymbol: restaurant?.currency_symbol ?? null,
    restaurantName: restaurant?.name ?? 'Your order',
    restaurantLogo: restaurant?.logo_url ?? null,
    brandColor: theme?.theme_color ?? restaurant?.primary_color ?? null,
    lines: ((itemsRes.data ?? []) as unknown as OrderStatusLine[]).map((l) => ({
      ...l,
      unit_price: Number(l.unit_price),
      total_price: Number(l.total_price),
    })),
  };
}

export async function loadMultipleOrderStatuses(orderIds: string[]): Promise<OrderStatusPayload[]> {
  const results = await Promise.all(
    orderIds.map(async (id) => {
      try {
        return await loadOrderStatus(id);
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is OrderStatusPayload => r !== null);
}
