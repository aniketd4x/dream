// src/lib/hotelService.ts
import { supabase } from '@/lib/supabase';
import type { HotelRoom, RoomServiceRequest, RequestStatus, RoomBill, RoomBillItem, HotelServicesConfig } from '@/types/hotel';
import { DEFAULT_HOTEL_SERVICES_CONFIG } from '@/types/hotel';

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

// 1. Fetch All Rooms for Restaurant (Direct Supabase)
export async function fetchHotelRooms(restaurantId: string): Promise<HotelRoom[]> {
  try {
    const { data, error } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('floor_number', { ascending: true })
      .order('room_number', { ascending: true });

    if (error) {
      console.error('Supabase hotel_rooms query error:', error.message);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        amenities: Array.isArray(d.amenities) ? d.amenities : [],
      }));
    }
    return [];
  } catch (err) {
    console.error('Network error fetching hotel_rooms:', err);
    return [];
  }
}

// 2. Create a Room (Direct Supabase)
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

  try {
    const { data, error } = await supabase
      .from('hotel_rooms')
      .insert({
        id: newRoom.id,
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

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as HotelRoom, error: null };
  } catch (supabaseErr: any) {
    console.error('Supabase insert failed:', supabaseErr);
    return { data: null, error: supabaseErr?.message || 'Failed to create room in database.' };
  }
}

// 3. Update Room (Direct Supabase)
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
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error('Network error updating hotel room:', err);
    return { error: err?.message || 'Database error updating room.' };
  }
}

// 4. Delete Room (Direct Supabase)
export async function deleteHotelRoom(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('hotel_rooms').delete().eq('id', id);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error('Network delete error:', err);
    return { error: err?.message || 'Database error deleting room.' };
  }
}

export function getHotelServicesConfig(restaurantId: string): HotelServicesConfig {
  try {
    const raw = localStorage.getItem(`dishgaze_hotel_services_config_${restaurantId}`);
    if (raw) {
      return { ...DEFAULT_HOTEL_SERVICES_CONFIG, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_HOTEL_SERVICES_CONFIG;
}

export async function saveHotelServicesConfig(restaurantId: string, config: HotelServicesConfig): Promise<void> {
  try {
    localStorage.setItem(`dishgaze_hotel_services_config_${restaurantId}`, JSON.stringify(config));
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

// 5. Lookup Room by QR Token (Direct Supabase)
export async function getRoomByQrToken(qrToken: string): Promise<{
  room: HotelRoom | null;
  restaurant: any | null;
  servicesConfig: HotelServicesConfig;
  error: string | null;
}> {
  const clean = qrToken.trim();

  try {
    const { data: room, error: roomErr } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('qr_token', clean)
      .eq('is_active', true)
      .maybeSingle();

    if (roomErr) {
      return {
        room: null,
        restaurant: null,
        servicesConfig: DEFAULT_HOTEL_SERVICES_CONFIG,
        error: roomErr.message,
      };
    }

    if (room) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, name, slug, currency, currency_symbol, logo_url, phone_code, mobile, address, city, primary_color')
        .eq('id', room.restaurant_id)
        .maybeSingle();

      const enrichedRestaurant = restaurant ? {
        ...restaurant,
        currency: restaurant.currency || 'INR',
        currency_symbol: restaurant.currency_symbol || '₹',
      } : null;

      return {
        room: room as HotelRoom,
        restaurant: enrichedRestaurant,
        servicesConfig: getHotelServicesConfig(room.restaurant_id),
        error: null,
      };
    }
  } catch (err: any) {
    return {
      room: null,
      restaurant: null,
      servicesConfig: DEFAULT_HOTEL_SERVICES_CONFIG,
      error: err?.message || 'Error querying database for room token',
    };
  }

  return {
    room: null,
    restaurant: null,
    servicesConfig: DEFAULT_HOTEL_SERVICES_CONFIG,
    error: 'Invalid or inactive Room QR Code',
  };
}

// 6. Fetch Room Service Requests (Direct Supabase)
export async function fetchRoomRequests(restaurantId: string): Promise<RoomServiceRequest[]> {
  try {
    const { data, error } = await supabase
      .from('room_service_requests')
      .select('*, hotel_rooms(room_number)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching room_service_requests:', error.message);
      return [];
    }

    if (data) {
      return data.map((d: any) => ({
        ...d,
        room_number: d.hotel_rooms?.room_number || d.room_number || 'Room',
      }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching room_service_requests:', err);
    return [];
  }
}

// 7. Create Room Service Request (Direct Supabase)
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
        id: newReq.id,
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

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: { ...newReq, id: data?.id || newReq.id }, error: null };
  } catch (err: any) {
    console.error('Supabase createRoomRequest error:', err);
    return { data: null, error: err?.message || 'Failed to submit room request' };
  }
}

// 8. Update Request Status (Direct Supabase)
export async function updateRoomRequestStatus(id: string, status: RequestStatus, notes?: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('room_service_requests')
      .update({
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
        completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error('Error updating room request status in database:', err);
    return { error: err?.message || 'Failed to update request' };
  }
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
