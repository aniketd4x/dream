// src/types/hotel.ts

export type RoomType =
  | 'Single'
  | 'Double'
  | 'Twin'
  | 'Deluxe'
  | 'Super Deluxe'
  | 'Suite'
  | 'Family Room'
  | 'Executive Room'
  | 'Premium Room'
  | string;

export type BedType =
  | 'Single Bed'
  | 'Double Bed'
  | 'Queen Bed'
  | 'King Bed'
  | 'Twin Beds'
  | 'Bunk Bed'
  | string;

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING'
  | 'DIRTY'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

export interface HotelRoom {
  id: string;
  restaurant_id: string;
  room_number: string;
  room_name?: string | null;
  floor_number: number;
  room_type: RoomType;
  bed_type: BedType;
  capacity: number;
  price_per_night: number;
  extra_guest_price?: number;
  description?: string | null;
  image_url?: string | null;
  status: RoomStatus;
  is_active: boolean;
  amenities: string[];
  qr_token?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RequestType =
  | 'HOUSEKEEPING'
  | 'WATER'
  | 'TOWEL'
  | 'TOWELS'
  | 'PILLOW'
  | 'BLANKET'
  | 'LAUNDRY'
  | 'MAINTENANCE'
  | 'TAXI'
  | 'WAKE_UP_CALL'
  | 'WAKEUP'
  | 'ROOM_SERVICE'
  | 'RECEPTION'
  | 'OTHER';

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type RequestStatus = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RoomServiceRequest {
  id: string;
  restaurant_id: string;
  room_id: string;
  room_number?: string;
  request_type: RequestType;
  description?: string | null;
  notes?: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  guest_name?: string | null;
  guest_mobile?: string | null;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface RoomBillItem {
  id: string;
  title: string;
  category: 'ROOM_CHARGE' | 'FOOD_ORDER' | 'SERVICE' | 'TAX' | 'DISCOUNT';
  amount: number;
  created_at: string;
  details?: string;
}

export interface RoomBill {
  room_id: string;
  room_number: string;
  guest_name?: string;
  check_in_date?: string;
  nights: number;
  room_rate: number;
  total_room_charges: number;
  total_food_charges: number;
  total_service_charges: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  items: RoomBillItem[];
}

export interface HotelServicesConfig {
  order_food: boolean;
  room_service: boolean;
  housekeeping: boolean;
  water: boolean;
  laundry: boolean;
  maintenance: boolean;
  taxi: boolean;
  wakeup: boolean;
  view_bill: boolean;
  reception: boolean;
  feedback: boolean;
  reception_phone?: string;
}

export const DEFAULT_HOTEL_SERVICES_CONFIG: HotelServicesConfig = {
  order_food: true,
  room_service: true,
  housekeeping: true,
  water: true,
  laundry: true,
  maintenance: true,
  taxi: true,
  wakeup: true,
  view_bill: true,
  reception: true,
  feedback: true,
  reception_phone: '',
};

