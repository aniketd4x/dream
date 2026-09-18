// src/lib/hotelService.ts
import { supabase } from '@/lib/supabase';
import type { HotelRoom, RoomServiceRequest, RequestStatus, RoomBill, RoomBillItem, HotelServicesConfig } from '@/types/hotel';
import { DEFAULT_HOTEL_SERVICES_CONFIG } from '@/types/hotel';

const LOCAL_ROOMS_KEY = 'dishgaze_hotel_rooms_cache';
const LOCAL_REQUESTS_KEY = 'dishgaze_room_requests_cache';

// Built-in starter demo rooms for Nirvan Eco Resort & general testing
const DEFAULT_DEMO_ROOMS: HotelRoom[] = [
  {
    id: 'room-101-demo-uuid',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    room_number: '101',
    room_name: 'Garden View Deluxe',
    floor_number: 1,
    room_type: 'Deluxe',
    bed_type: 'King Bed',
    capacity: 2,
    price_per_night: 3500,
    extra_guest_price: 800,
    description: 'Spacious luxury room on ground floor overlooking landscaped gardens with private balcony.',
    image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
    status: 'AVAILABLE',
    is_active: true,
    amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'HD Smart TV', 'Hot Water', 'Electric Kettle', 'Room Service'],
    qr_token: 'RM-101-GARDEN',
    created_at: new Date().toISOString(),
  },
  {
    id: 'room-102-demo-uuid',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    room_number: '102',
    room_name: 'Courtyard Premier',
    floor_number: 1,
    room_type: 'Super Deluxe',
    bed_type: 'Queen Bed',
    capacity: 3,
    price_per_night: 4200,
    extra_guest_price: 900,
    description: 'Premium air-conditioned suite with cozy seating area and luxury bathroom amenities.',
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    status: 'OCCUPIED',
    is_active: true,
    amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'Balcony', 'Mini Bar', 'Daily Housekeeping'],
    qr_token: 'RM-102-COURT',
    created_at: new Date().toISOString(),
  },
  {
    id: 'room-201-demo-uuid',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    room_number: '201',
    room_name: 'Mountain Vista Suite',
    floor_number: 2,
    room_type: 'Suite',
    bed_type: 'King Bed',
    capacity: 4,
    price_per_night: 6500,
    extra_guest_price: 1200,
    description: 'Panoramic top-floor suite featuring king-size plush bedding, work desk, and mini-bar.',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    status: 'AVAILABLE',
    is_active: true,
    amenities: ['Panoramic Mountain View', 'Bathtub', 'High-Speed Wi-Fi', 'Smart TV', 'Coffee Machine'],
    qr_token: 'RM-201-VISTA',
    created_at: new Date().toISOString(),
  },
  {
    id: 'room-202-demo-uuid',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    room_number: '202',
    room_name: 'Heritage Family Suite',
    floor_number: 2,
    room_type: 'Family Room',
    bed_type: 'Twin Beds',
    capacity: 4,
    price_per_night: 5500,
    extra_guest_price: 1000,
    description: 'Spacious interconnected family suite suitable for family vacations with 2 queen beds.',
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    status: 'CLEANING',
    is_active: true,
    amenities: ['Interconnected', '2 Queen Beds', 'High-Speed Wi-Fi', 'Room Service'],
    qr_token: 'RM-202-FAMILY',
    created_at: new Date().toISOString(),
  },
];

// Helper: Get local fallback cache
function getLocalRooms(restaurantId?: string): HotelRoom[] {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    if (raw) {
      const all: HotelRoom[] = JSON.parse(raw);
      if (restaurantId) {
        return all.filter((r) => r.restaurant_id === restaurantId);
      }
      return all;
    }
  } catch (_) {}
  // Initialize with default demo rooms
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(DEFAULT_DEMO_ROOMS));
  return restaurantId ? DEFAULT_DEMO_ROOMS.filter(r => r.restaurant_id === restaurantId) : DEFAULT_DEMO_ROOMS;
}

function saveLocalRooms(rooms: HotelRoom[]) {
  try {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch (_) {}
}

function getLocalRequests(restaurantId?: string): RoomServiceRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (raw) {
      const all: RoomServiceRequest[] = JSON.parse(raw);
      if (restaurantId) {
        return all.filter((r) => r.restaurant_id === restaurantId);
      }
      return all;
    }
  } catch (_) {}
  return [];
}

function saveLocalRequests(reqs: RoomServiceRequest[]) {
  try {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(reqs));
  } catch (_) {}
}

// Generate unique Room QR Token
export function generateRoomQRToken(roomNumber: string, hotelPrefix = 'RM'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanNum = roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${hotelPrefix}-${cleanNum}-${rand}`;
}

// 1. Fetch All Rooms for Restaurant
export async function fetchHotelRooms(restaurantId: string): Promise<HotelRoom[]> {
  try {
    const { data, error } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('floor_number', { ascending: true })
      .order('room_number', { ascending: true });

    if (error) {
      console.warn('Supabase hotel_rooms query error, using local fallback:', error.message);
      return getLocalRooms(restaurantId);
    }

    if (data && data.length > 0) {
      // Normalize amenities
      const normalized: HotelRoom[] = data.map((d: any) => ({
        ...d,
        amenities: Array.isArray(d.amenities) ? d.amenities : [],
      }));
      // Also sync to local cache
      saveLocalRooms(normalized);
      return normalized;
    } else {
      // If table exists but empty, return empty or default
      return getLocalRooms(restaurantId);
    }
  } catch (err) {
    console.warn('Network error fetching hotel_rooms:', err);
    return getLocalRooms(restaurantId);
  }
}

// 2. Create a Room
export async function createHotelRoom(roomData: Partial<HotelRoom>): Promise<{ data: HotelRoom | null; error: string | null }> {
  const newRoom: HotelRoom = {
    id: roomData.id || crypto.randomUUID(),
    restaurant_id: roomData.restaurant_id!,
    room_number: roomData.room_number!,
    room_name: roomData.room_name || null,
    floor_number: Number(roomData.floor_number) || 1,
    room_type: roomData.room_type || 'Deluxe',
    bed_type: roomData.bed_type || 'Double Bed',
    capacity: Number(roomData.capacity) || 2,
    price_per_night: Number(roomData.price_per_night) || 0,
    extra_guest_price: Number(roomData.extra_guest_price) || 0,
    description: roomData.description || null,
    image_url: roomData.image_url || null,
    status: roomData.status || 'AVAILABLE',
    is_active: roomData.is_active !== undefined ? roomData.is_active : true,
    amenities: roomData.amenities || ['Wi-Fi', 'Air Conditioning', 'Smart TV', 'Hot Water'],
    qr_token: roomData.qr_token || generateRoomQRToken(roomData.room_number!),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('hotel_rooms')
      .insert({
        restaurant_id: newRoom.restaurant_id,
        room_number: newRoom.room_number,
        room_name: newRoom.room_name,
        floor_number: newRoom.floor_number,
        room_type: newRoom.room_type,
        bed_type: newRoom.bed_type,
        capacity: newRoom.capacity,
        price_per_night: newRoom.price_per_night,
        extra_guest_price: newRoom.extra_guest_price,
        description: newRoom.description,
        image_url: newRoom.image_url,
        status: newRoom.status,
        is_active: newRoom.is_active,
        amenities: newRoom.amenities,
        qr_token: newRoom.qr_token,
      })
      .select()
      .single();

    if (!error && data) {
      return { data: data as HotelRoom, error: null };
    }
  } catch (supabaseErr) {
    console.warn('Supabase insert failed, persisting to local cache:', supabaseErr);
  }

  // Fallback to local storage
  const current = getLocalRooms();
  // Ensure unique room_number
  const exists = current.some((r) => r.restaurant_id === newRoom.restaurant_id && r.room_number === newRoom.room_number);
  if (exists) {
    return { data: null, error: `Room ${newRoom.room_number} already exists.` };
  }
  const updated = [newRoom, ...current];
  saveLocalRooms(updated);
  return { data: newRoom, error: null };
}

// 3. Update Room
export async function updateHotelRoom(id: string, updates: Partial<HotelRoom>): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('hotel_rooms')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.warn('Supabase update failed, updating local cache:', error.message);
    }
  } catch (err) {
    console.warn('Network error updating hotel room:', err);
  }

  // Always sync local cache
  const all = getLocalRooms();
  const next = all.map((r) => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r));
  saveLocalRooms(next);
  return { error: null };
}

// 4. Delete Room
export async function deleteHotelRoom(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('hotel_rooms').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete error:', error.message);
    }
  } catch (err) {
    console.warn('Network delete error:', err);
  }

  const all = getLocalRooms();
  const next = all.filter((r) => r.id !== id);
  saveLocalRooms(next);
  return { error: null };
}

const LOCAL_SERVICES_CONFIG_KEY = 'dishgaze_hotel_services_config_';

export function getHotelServicesConfig(restaurantId: string): HotelServicesConfig {
  try {
    const raw = localStorage.getItem(`${LOCAL_SERVICES_CONFIG_KEY}${restaurantId}`);
    if (raw) {
      return { ...DEFAULT_HOTEL_SERVICES_CONFIG, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_HOTEL_SERVICES_CONFIG;
}

export async function saveHotelServicesConfig(restaurantId: string, config: HotelServicesConfig): Promise<void> {
  try {
    localStorage.setItem(`${LOCAL_SERVICES_CONFIG_KEY}${restaurantId}`, JSON.stringify(config));
  } catch (_) {}

  try {
    await supabase.from('restaurant_settings').update({
      room_services_config: config,
    }).eq('restaurant_id', restaurantId);
  } catch (_) {}
}

export async function uploadRoomPhoto(file: File, restaurantId: string): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `room-${restaurantId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `rooms/${fileName}`;

    const { data: storageData, error: storageErr } = await supabase
      .storage
      .from('restaurant-assets')
      .upload(filePath, file, { upsert: true });

    if (!storageErr && storageData?.path) {
      const { data: pubUrlData } = supabase.storage.from('restaurant-assets').getPublicUrl(storageData.path);
      if (pubUrlData?.publicUrl) {
        return pubUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Storage upload fallback to DataURL:', err);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 5. Lookup Room by QR Token
export async function getRoomByQrToken(qrToken: string): Promise<{
  room: HotelRoom | null;
  restaurant: any | null;
  servicesConfig: HotelServicesConfig;
  error: string | null;
}> {
  const clean = qrToken.trim();

  // 1. Try Supabase
  try {
    const { data: room, error: roomErr } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('qr_token', clean)
      .eq('is_active', true)
      .maybeSingle();

    if (!roomErr && room) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, name, slug, currency, currency_symbol, logo_url, phone_code, mobile, address, city, primary_color')
        .eq('id', room.restaurant_id)
        .maybeSingle();

      return {
        room: room as HotelRoom,
        restaurant,
        servicesConfig: getHotelServicesConfig(room.restaurant_id),
        error: null,
      };
    }
  } catch (_) {}

  // 2. Fallback to local cache
  const local = getLocalRooms();
  const matched = local.find((r) => r.qr_token?.toUpperCase() === clean.toUpperCase() || r.room_number === clean);
  if (matched) {
    return {
      room: matched,
      restaurant: {
        id: matched.restaurant_id,
        name: 'Nirvana Eco & Agro Resort',
        currency: 'INR',
        currency_symbol: '₹',
        logo_url: '/logo.png',
        mobile: '+91 98765 43210',
      },
      servicesConfig: getHotelServicesConfig(matched.restaurant_id),
      error: null,
    };
  }

  return {
    room: null,
    restaurant: null,
    servicesConfig: DEFAULT_HOTEL_SERVICES_CONFIG,
    error: 'Invalid or inactive Room QR Code',
  };
}

// 6. Fetch Room Service Requests
export async function fetchRoomRequests(restaurantId: string): Promise<RoomServiceRequest[]> {
  try {
    const { data, error } = await supabase
      .from('room_service_requests')
      .select('*, hotel_rooms(room_number)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted: RoomServiceRequest[] = data.map((d: any) => ({
        ...d,
        room_number: d.hotel_rooms?.room_number || d.room_number || 'Room',
      }));
      saveLocalRequests(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Error fetching room_service_requests:', err);
  }

  return getLocalRequests(restaurantId);
}

// 7. Create Room Service Request
export async function createRoomRequest(req: Partial<RoomServiceRequest>): Promise<{ data: RoomServiceRequest | null; error: string | null }> {
  const newReq: RoomServiceRequest = {
    id: req.id || crypto.randomUUID(),
    restaurant_id: req.restaurant_id!,
    room_id: req.room_id!,
    room_number: req.room_number || '',
    request_type: req.request_type || 'HOUSEKEEPING',
    description: req.description || null,
    notes: req.notes || null,
    priority: req.priority || 'NORMAL',
    status: req.status || 'NEW',
    guest_name: req.guest_name || null,
    guest_mobile: req.guest_mobile || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('room_service_requests')
      .insert({
        restaurant_id: newReq.restaurant_id,
        room_id: newReq.room_id,
        request_type: newReq.request_type,
        description: newReq.description,
        notes: newReq.notes,
        priority: newReq.priority,
        status: newReq.status,
        guest_name: newReq.guest_name,
        guest_mobile: newReq.guest_mobile,
      })
      .select()
      .single();

    if (!error && data) {
      return { data: { ...newReq, id: data.id }, error: null };
    }
  } catch (_) {}

  // Fallback to local cache
  const all = getLocalRequests();
  const next = [newReq, ...all];
  saveLocalRequests(next);
  return { data: newReq, error: null };
}

// 8. Update Request Status
export async function updateRoomRequestStatus(id: string, status: RequestStatus, notes?: string): Promise<{ error: string | null }> {
  try {
    await supabase
      .from('room_service_requests')
      .update({
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
        completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .eq('id', id);
  } catch (_) {}

  const all = getLocalRequests();
  const next = all.map((r) =>
    r.id === id
      ? {
          ...r,
          status,
          notes: notes !== undefined ? notes : r.notes,
          completed_at: status === 'COMPLETED' ? new Date().toISOString() : r.completed_at,
          updated_at: new Date().toISOString(),
        }
      : r
  );
  saveLocalRequests(next);
  return { error: null };
}

// 9. Fetch Itemized Room Bill
export async function fetchRoomBill(restaurantId: string, roomId: string, roomRate = 3500, roomNumber = '101'): Promise<RoomBill> {
  let foodOrders: any[] = [];
  try {
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, grand_total, created_at, order_status')
      .eq('restaurant_id', restaurantId)
      .eq('room_id', roomId)
      .neq('order_status', 'cancelled')
      .order('created_at', { ascending: false });

    if (data) foodOrders = data;
  } catch (_) {}

  // Calculate nights
  const nights = 1;
  const roomCharges = roomRate * nights;

  const items: RoomBillItem[] = [
    {
      id: `rc-${roomId}`,
      title: `Room Stay (1 Night - Room ${roomNumber})`,
      category: 'ROOM_CHARGE',
      amount: roomCharges,
      created_at: new Date().toISOString(),
      details: 'Nightly lodging tariff',
    },
  ];

  let totalFoodCharges = 0;
  foodOrders.forEach((o) => {
    const amt = Number(o.grand_total) || 0;
    totalFoodCharges += amt;
    items.push({
      id: o.id,
      title: `Food Order #${o.order_number || o.id.slice(0, 6)}`,
      category: 'FOOD_ORDER',
      amount: amt,
      created_at: o.created_at,
      details: `Room Service • ${o.order_status?.toUpperCase()}`,
    });
  });

  const totalServiceCharges = 0;
  const subtotal = roomCharges + totalFoodCharges + totalServiceCharges;
  const taxRate = 0.12; // 12% GST
  const taxAmount = Math.round(subtotal * taxRate);
  const discountAmount = 0;
  const grandTotal = subtotal + taxAmount - discountAmount;

  return {
    room_id: roomId,
    room_number: roomNumber,
    nights,
    room_rate: roomRate,
    total_room_charges: roomCharges,
    total_food_charges: totalFoodCharges,
    total_service_charges: totalServiceCharges,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    grand_total: grandTotal,
    items,
  };
}
