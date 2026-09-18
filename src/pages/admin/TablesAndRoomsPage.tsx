// src/pages/admin/TablesAndRoomsPage.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Table2,
  Bed,
  Plus,
  Search,
  Filter,
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Copy,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Receipt,
  Users,
  Check,
  Eye,
  MoreVertical,
  Building,
  Layers,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Bath,
  SlidersHorizontal,
  X,
  Share2,
  ShieldCheck,
  Flame,
  Upload,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { QRCard } from '@/components/admin/QRCard';
import CrudPage from '@/components/admin/CrudPage';
import { useAuth } from '@/lib/auth';
import {
  fetchHotelRooms,
  createHotelRoom,
  updateHotelRoom,
  deleteHotelRoom,
  generateRoomQRToken,
  fetchRoomBill,
  uploadRoomPhoto,
  getHotelServicesConfig,
  saveHotelServicesConfig,
} from '@/lib/hotelService';
import type { HotelRoom, RoomType, BedType, RoomStatus, RoomBill, HotelServicesConfig } from '@/types/hotel';
import { DEFAULT_HOTEL_SERVICES_CONFIG } from '@/types/hotel';
import { triggerHaptic } from '@/lib/haptics';
import { copyTextToClipboard, downloadImageFile, printIframeHtml } from '@/lib/fileExport';

const ALL_AMENITIES = [
  'High-Speed Wi-Fi',
  'Air Conditioning',
  'HD Smart TV',
  'Hot Water',
  'Electric Kettle',
  'Mini Bar',
  'Private Balcony',
  'Bathtub',
  'Safe Locker',
  'Mountain View',
  'Garden View',
  'Daily Housekeeping',
  'Room Service',
  'Tea/Coffee Maker',
];

const ROOM_STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  AVAILABLE: {
    label: 'Available',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  OCCUPIED: {
    label: 'Occupied',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  CLEANING: {
    label: 'Cleaning',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  DIRTY: {
    label: 'Dirty',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  OUT_OF_SERVICE: {
    label: 'Out of Service',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
  },
  RESERVED: {
    label: 'Reserved',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
};

export default function TablesAndRoomsPage() {
  const { restaurant } = useAuth();

  // Tab: 'tables' | 'rooms'
  const [activeTab, setActiveTab] = useState<'tables' | 'rooms'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/admin/rooms')) {
      return 'rooms';
    }
    return 'tables';
  });

  // Hotel Rooms State
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [qrModalRoom, setQrModalRoom] = useState<HotelRoom | null>(null);
  const [billModalRoom, setBillModalRoom] = useState<HotelRoom | null>(null);
  const [roomBill, setRoomBill] = useState<RoomBill | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  // Room Services Configuration State
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [servicesConfig, setServicesConfig] = useState<HotelServicesConfig>(DEFAULT_HOTEL_SERVICES_CONFIG);
  const [savingServices, setSavingServices] = useState(false);
  const [servicesFeedback, setServicesFeedback] = useState<string | null>(null);

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<HotelRoom>>({
    room_number: '',
    room_name: '',
    floor_number: 1,
    room_type: 'Deluxe',
    bed_type: 'King Bed',
    capacity: 2,
    price_per_night: 3500,
    extra_guest_price: 800,
    description: '',
    image_url: '',
    status: 'AVAILABLE',
    is_active: true,
    amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'HD Smart TV', 'Hot Water'],
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


  // Handle Photo Select & Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant?.id) return;

    setUploadingPhoto(true);
    triggerHaptic('light');

    try {
      const url = await uploadRoomPhoto(file, restaurant.id);
      setFormData((prev) => ({ ...prev, image_url: url }));
      triggerHaptic('success');
    } catch (err: any) {
      alert(`Could not upload photo: ${err.message || err}`);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Handle Save Services Configuration
  const handleSaveServicesConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setSavingServices(true);
    triggerHaptic('medium');

    try {
      await saveHotelServicesConfig(restaurant.id, servicesConfig);
      setServicesFeedback('Room Services configuration saved! Live on Room QR portal.');
      triggerHaptic('success');
      setTimeout(() => {
        setServicesFeedback(null);
        setServicesModalOpen(false);
      }, 1500);
    } catch (err) {
      alert('Could not save configuration');
    } finally {
      setSavingServices(false);
    }
  };

  // Load Rooms
  const loadRooms = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const data = await fetchHotelRooms(restaurant.id);
      setRooms(data);
    } catch (err) {
      console.error('Failed to load hotel rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms') {
      loadRooms();
    }
    if (restaurant?.id) {
      setServicesConfig(getHotelServicesConfig(restaurant.id));
    }
  }, [restaurant?.id, activeTab]);

  // Distinct floors and room types for filters
  const floors = useMemo(() => {
    const set = new Set(rooms.map((r) => r.floor_number).filter(Boolean));
    return Array.from(set).sort((a, b) => (a as number) - (b as number));
  }, [rooms]);

  const roomTypes = useMemo(() => {
    const set = new Set(rooms.map((r) => r.room_type).filter(Boolean));
    return Array.from(set);
  }, [rooms]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = r.room_number?.toLowerCase().includes(q);
        const matchName = r.room_name?.toLowerCase().includes(q);
        const matchType = r.room_type?.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchType) return false;
      }
      if (selectedFloor !== 'all' && String(r.floor_number) !== selectedFloor) {
        return false;
      }
      if (selectedType !== 'all' && r.room_type !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'all' && r.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [rooms, searchQuery, selectedFloor, selectedType, selectedStatus]);

  // KPI Counts
  const stats = useMemo(() => {
    return {
      total: rooms.length,
      available: rooms.filter((r) => r.status === 'AVAILABLE').length,
      occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
      cleaning: rooms.filter((r) => r.status === 'CLEANING').length,
      maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
      reserved: rooms.filter((r) => r.status === 'RESERVED').length,
    };
  }, [rooms]);

  // Open Add Room Modal
  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      room_name: '',
      floor_number: 1,
      room_type: 'Deluxe',
      bed_type: 'King Bed',
      capacity: 2,
      price_per_night: 3500,
      extra_guest_price: 800,
      description: '',
      image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
      status: 'AVAILABLE',
      is_active: true,
      amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'HD Smart TV', 'Hot Water', 'Room Service'],
    });
    setFormError(null);
    setRoomModalOpen(true);
  };

  // Open Edit Room Modal
  const handleOpenEditModal = (room: HotelRoom) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_name: room.room_name || '',
      floor_number: room.floor_number,
      room_type: room.room_type,
      bed_type: room.bed_type,
      capacity: room.capacity,
      price_per_night: room.price_per_night,
      extra_guest_price: room.extra_guest_price || 0,
      description: room.description || '',
      image_url: room.image_url || '',
      status: room.status,
      is_active: room.is_active,
      amenities: room.amenities || [],
    });
    setFormError(null);
    setRoomModalOpen(true);
  };

  // Save Room (Create / Update)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room_number?.trim()) {
      setFormError('Room number is required');
      return;
    }
    if (!restaurant?.id) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingRoom) {
        const { error } = await updateHotelRoom(editingRoom.id, {
          room_number: formData.room_number.trim(),
          room_name: formData.room_name?.trim() || null,
          floor_number: Number(formData.floor_number) || 1,
          room_type: (formData.room_type as RoomType) || 'Deluxe',
          bed_type: (formData.bed_type as BedType) || 'King Bed',
          capacity: Number(formData.capacity) || 2,
          price_per_night: Number(formData.price_per_night) || 0,
          extra_guest_price: Number(formData.extra_guest_price) || 0,
          description: formData.description?.trim() || null,
          image_url: formData.image_url?.trim() || null,
          status: formData.status as RoomStatus,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
          amenities: formData.amenities || [],
        });
        if (error) throw new Error(error);
      } else {
        const { error } = await createHotelRoom({
          restaurant_id: restaurant.id,
          room_number: formData.room_number.trim(),
          room_name: formData.room_name?.trim() || null,
          floor_number: Number(formData.floor_number) || 1,
          room_type: (formData.room_type as RoomType) || 'Deluxe',
          bed_type: (formData.bed_type as BedType) || 'King Bed',
          capacity: Number(formData.capacity) || 2,
          price_per_night: Number(formData.price_per_night) || 0,
          extra_guest_price: Number(formData.extra_guest_price) || 0,
          description: formData.description?.trim() || null,
          image_url: formData.image_url?.trim() || null,
          status: formData.status as RoomStatus,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
          amenities: formData.amenities || [],
        });
        if (error) throw new Error(error);
      }

      setRoomModalOpen(false);
      triggerHaptic('success');
      await loadRooms();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save room details');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (room: HotelRoom) => {
    if (!window.confirm(`Are you sure you want to delete Room ${room.room_number}?`)) return;
    try {
      await deleteHotelRoom(room.id);
      triggerHaptic('medium');
      await loadRooms();
    } catch (err) {
      alert('Failed to delete room');
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (room: HotelRoom, nextStatus: RoomStatus) => {
    triggerHaptic('light');
    try {
      await updateHotelRoom(room.id, { status: nextStatus });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, status: nextStatus } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Open Room Bill Modal
  const handleOpenBillModal = async (room: HotelRoom) => {
    if (!restaurant?.id) return;
    setBillModalRoom(room);
    setBillLoading(true);
    try {
      const bill = await fetchRoomBill(
        restaurant.id,
        room.id,
        room.price_per_night,
        room.room_number
      );
      setRoomBill(bill);
    } catch (err) {
      console.error('Failed to load bill:', err);
    } finally {
      setBillLoading(false);
    }
  };

  // Print Room Bill
  const handlePrintBill = () => {
    if (!billModalRoom || !roomBill) return;
    triggerHaptic('selection');
    const currency = restaurant?.currency_symbol || restaurant?.currency || '₹';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">${restaurant?.name || 'Hotel & Resort'}</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Live Room Folio & Invoice</p>
          <div style="display: inline-block; background: #0f172a; color: #fff; font-weight: 800; font-size: 14px; padding: 4px 12px; border-radius: 6px; margin-top: 8px;">
            ROOM ${billModalRoom.room_number}
          </div>
        </div>

        <div style="font-size: 12px; color: #475569; margin-bottom: 16px; display: flex; justify-content: space-between;">
          <span>Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          <span>Time: ${new Date().toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span>
        </div>

        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">
              <th style="text-align: left; padding: 6px 0;">Item / Service</th>
              <th style="text-align: right; padding: 6px 0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${roomBill.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px dashed #f1f5f9;">
                <td style="padding: 8px 0;">
                  <strong style="display: block; color: #0f172a;">${item.title}</strong>
                  <span style="font-size: 11px; color: #64748b;">${item.details || ''}</span>
                </td>
                <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #0f172a;">
                  ${currency} ${item.amount.toFixed(2)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="border-top: 2px solid #0f172a; padding-top: 12px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
            <span>Room Tariff (1 Night):</span>
            <span>${currency} ${roomBill.total_room_charges.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
            <span>Room Food Orders:</span>
            <span>${currency} ${roomBill.total_food_charges.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
            <span>Taxes & GST (12%):</span>
            <span>${currency} ${roomBill.tax_amount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 16px; font-weight: 800; color: #0f172a;">
            <span>Total Payable:</span>
            <span>${currency} ${roomBill.grand_total.toFixed(2)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8;">
          Thank you for choosing ${restaurant?.name || 'our hotel'}!
        </div>
      </div>
    `;
    printIframeHtml(html, `Room_${billModalRoom.room_number}_Bill`);
  };


  // Regenerate QR Token
  const handleRegenerateQR = async () => {
    if (!qrModalRoom) return;
    if (!window.confirm('Regenerate QR Code? The old QR stand will stop working.')) return;
    const newToken = generateRoomQRToken(qrModalRoom.room_number);
    await updateHotelRoom(qrModalRoom.id, { qr_token: newToken });
    const updated = { ...qrModalRoom, qr_token: newToken };
    setQrModalRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    triggerHaptic('success');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top Header & Unified Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-theme-gradient flex items-center justify-center text-white shadow-theme">
                {activeTab === 'tables' ? <Table2 className="w-5 h-5" /> : <Bed className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Tables & Rooms</h1>
                <p className="text-xs font-medium text-slate-500">
                  Unified dining tables & hotel room management
                </p>
              </div>
            </div>
          </div>

          {/* Clean Segmented Tabs Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('tables');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all native-press ${
                activeTab === 'tables'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-4 h-4 text-emerald-600" />
              <span>Restaurant Tables</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('rooms');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all native-press ${
                activeTab === 'rooms'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bed className="w-4 h-4 text-theme-primary" />
              <span>Hotel Rooms</span>
              <span className="bg-theme-light text-theme-primary px-2 py-0.5 rounded-full text-[10px] font-black">
                {rooms.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: RESTAURANT TABLES (100% INTACT CrudPage) */}
      {activeTab === 'tables' && (
        <div className="animate-fade-in">
          <CrudPage table="dining_tables" />
        </div>
      )}

      {/* TAB 2: HOTEL ROOMS MANAGEMENT */}
      {activeTab === 'rooms' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Total Rooms</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                <Building className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
              <span className="text-xs font-semibold text-emerald-700">Available</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-700">{stats.available}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 shadow-xs">
              <span className="text-xs font-semibold text-blue-700">Occupied</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-blue-700">{stats.occupied}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <span className="text-xs font-semibold text-amber-700">Cleaning</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-700">{stats.cleaning}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
              <span className="text-xs font-semibold text-rose-700">Maintenance</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-rose-700">{stats.maintenance}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              </div>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/80 shadow-xs">
              <span className="text-xs font-semibold text-purple-700">Reserved</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-purple-700">{stats.reserved}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              </div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search room number, name, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:border-theme-primary focus:outline-hidden transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Floor Filter */}
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Floors</option>
                {floors.map((fl) => (
                  <option key={fl} value={String(fl)}>
                    Floor {fl}
                  </option>
                ))}
              </select>

              {/* Room Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Types</option>
                {roomTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="AVAILABLE">🟢 Available</option>
                <option value="OCCUPIED">🔵 Occupied</option>
                <option value="CLEANING">🟡 Cleaning</option>
                <option value="MAINTENANCE">🔴 Maintenance</option>
                <option value="RESERVED">🟣 Reserved</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadRooms}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition native-press"
                title="Refresh rooms"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setServicesModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition native-press"
                title="Configure services shown on Room QR"
              >
                <SlidersHorizontal className="w-4 h-4 text-theme-primary" />
                <span className="hidden sm:inline">Room Services</span>
                <span className="sm:hidden">Services</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-gradient text-white text-xs sm:text-sm font-bold shadow-theme hover:opacity-95 transition native-press"
              >
                <Plus className="w-4 h-4" />
                <span>Add Room</span>
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Bed className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No rooms match your filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try clearing your search query or status filter, or click "+ Add Room" to register your first hotel room.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-gradient text-white text-xs font-bold shadow-theme"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Room</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRooms.map((room) => {
                const statusCfg = ROOM_STATUS_CONFIG[room.status] || ROOM_STATUS_CONFIG.AVAILABLE;
                const currency = restaurant?.currency_symbol || restaurant?.currency || '₹';

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
                  >
                    {/* Room Header Image & Quick Badges */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden shrink-0">
                      <img
                        src={
                          room.image_url ||
                          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80'
                        }
                        alt={`Room ${room.room_number}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Top Left: Room Number Badge */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-lg border border-white/50 flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</span>
                        <span className="text-base font-black text-slate-900">{room.room_number}</span>
                      </div>

                      {/* Top Right: Status Selector Dropdown */}
                      <div className="absolute top-3 right-3">
                        <select
                          value={room.status}
                          onChange={(e) => handleQuickStatusChange(room, e.target.value as RoomStatus)}
                          className={`text-xs font-black px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md cursor-pointer transition focus:outline-hidden ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <option value="AVAILABLE">🟢 Available</option>
                          <option value="OCCUPIED">🔵 Occupied</option>
                          <option value="CLEANING">🟡 Cleaning</option>
                          <option value="MAINTENANCE">🔴 Maintenance</option>
                          <option value="RESERVED">🟣 Reserved</option>
                        </select>
                      </div>

                      {/* Bottom Image Overlay: Name & Floor */}
                      <div className="absolute bottom-3 inset-x-3 text-white">
                        <h3 className="text-base font-bold truncate drop-shadow-sm">
                          {room.room_name || `${room.room_type} Suite`}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-white/80 mt-0.5">
                          <span>Floor {room.floor_number}</span>
                          <span>•</span>
                          <span>{room.room_type}</span>
                          <span>•</span>
                          <span>{room.bed_type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Room Body Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-2.5">
                        {/* Pricing & Capacity Row */}
                        <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-xs text-slate-400 font-medium block">Nightly Tariff</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-slate-900">
                                {currency} {room.price_per_night?.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-500">/ night</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-400 font-medium block">Max Occupancy</span>
                            <div className="flex items-center justify-end gap-1 text-slate-700 font-bold text-sm">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{room.capacity} Guests</span>
                            </div>
                          </div>
                        </div>

                        {/* Amenities Chips */}
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {room.amenities.slice(0, 4).map((am, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg"
                              >
                                {am}
                              </span>
                            ))}
                            {room.amenities.length > 4 && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-lg">
                                +{room.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Grid */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* QR Code Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setQrModalRoom(room);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition native-press"
                          title="View Room QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5 text-theme-primary" />
                          <span>QR Code</span>
                        </button>

                        {/* Live Room Bill Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenBillModal(room)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition native-press"
                          title="View Itemized Room Bill"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          <span>Room Bill</span>
                        </button>

                        {/* Edit Room */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(room)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition native-press"
                          title="Edit Room"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Room */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition native-press"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT ROOM MODAL                                                  */}
      {/* ========================================================================= */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                  <Bed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add Hotel Room'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure room number, tariffs & amenities</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoomModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRoom} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204, 305"
                    value={formData.room_number || ''}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-theme-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Floor Number</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.floor_number || 1}
                    onChange={(e) => setFormData({ ...formData, floor_number: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:bg-white focus:border-theme-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mountain View Deluxe, Royal Heritage Suite"
                  value={formData.room_name || ''}
                  onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-theme-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Category / Type</label>
                  <select
                    value={formData.room_type || 'Deluxe'}
                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value as RoomType })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="Single Room">Single Room</option>
                    <option value="Double Room">Double Room</option>
                    <option value="Deluxe">Deluxe Room</option>
                    <option value="Super Deluxe">Super Deluxe Room</option>
                    <option value="Suite">Luxury Suite</option>
                    <option value="Family Room">Family Room</option>
                    <option value="Presidential">Presidential Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bed Configuration</label>
                  <select
                    value={formData.bed_type || 'King Bed'}
                    onChange={(e) => setFormData({ ...formData, bed_type: e.target.value as BedType })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="King Bed">King Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="Twin Beds">Twin Beds</option>
                    <option value="Single Bed">Single Bed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guests Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.capacity || 2}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price / Night (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.price_per_night || 0}
                    onChange={(e) => setFormData({ ...formData, price_per_night: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Extra Guest (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.extra_guest_price || 0}
                    onChange={(e) => setFormData({ ...formData, extra_guest_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formData.status || 'AVAILABLE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="AVAILABLE">🟢 Available</option>
                    <option value="OCCUPIED">🔵 Occupied</option>
                    <option value="CLEANING">🟡 Cleaning</option>
                    <option value="MAINTENANCE">🔴 Maintenance</option>
                    <option value="RESERVED">🟣 Reserved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Photo</label>
                  <div className="flex items-center gap-2">
                    {formData.image_url ? (
                      <div className="relative w-14 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                        <img
                          src={formData.image_url}
                          alt="Room Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <input
                      type="file"
                      ref={photoInputRef}
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition native-press"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-primary" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-theme-primary" />
                          <span>{formData.image_url ? 'Change Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                    </button>
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 transition native-press"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Manual URL Input */}
              <div className="space-y-1">
                <input
                  type="url"
                  placeholder="Or paste external image URL (https://images.unsplash.com/...)"
                  value={formData.image_url || ''}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-theme-primary focus:outline-hidden truncate"
                />
              </div>

              {/* Amenities Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Amenities Included</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_AMENITIES.map((amenity) => {
                    const selected = formData.amenities?.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const current = formData.amenities || [];
                          const next = selected
                            ? current.filter((a) => a !== amenity)
                            : [...current, amenity];
                          setFormData({ ...formData, amenities: next });
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center justify-between ${
                          selected
                            ? 'bg-theme-light border-theme-border text-theme-primary font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special amenities, balcony details, interior style..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-theme-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-theme-gradient text-white text-xs font-bold shadow-theme hover:opacity-95 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ROOM QR CODE MODAL                                                     */}
      {/* ========================================================================= */}
      {qrModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop overflow-y-auto">
          <QRCard
            tableNumber={qrModalRoom.room_number}
            tableName={qrModalRoom.room_name || undefined}
            isRoom={true}
            roomType={qrModalRoom.room_type}
            floorNumber={qrModalRoom.floor_number}
            restaurantName={restaurant?.name || 'Hotel & Suites'}
            logoUrl={restaurant?.logo_url}
            qrValue={`${window.location.origin}/room/${qrModalRoom.qr_token}`}
            previewUrl={`/room/${qrModalRoom.qr_token}`}
            onRegenerateToken={handleRegenerateQR}
            onClose={() => setQrModalRoom(null)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ITEMISED ROOM BILL MODAL                                              */}
      {/* ========================================================================= */}
      {billModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Room {billModalRoom.room_number} Folio</h3>
                  <p className="text-xs text-slate-500">Live Itemized Charges & Orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillModalRoom(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {billLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-primary" />
                  <p className="text-xs">Computing live room folio...</p>
                </div>
              ) : roomBill ? (
                <>
                  {/* Bill Items List */}
                  <div className="space-y-2">
                    {roomBill.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.title}</p>
                          <span className="text-[10px] text-slate-500">{item.details}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {restaurant?.currency_symbol || '₹'} {item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals Summary */}
                  <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Room Tariff</span>
                      <span>
                        {restaurant?.currency_symbol || '₹'} {roomBill.total_room_charges.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Room Food Orders</span>
                      <span>
                        {restaurant?.currency_symbol || '₹'} {roomBill.total_food_charges.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & GST (12%)</span>
                      <span>
                        {restaurant?.currency_symbol || '₹'} {roomBill.tax_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-base font-black text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-theme-primary">
                        {restaurant?.currency_symbol || '₹'} {roomBill.grand_total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No active orders or charges found.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setBillModalRoom(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintBill}
                disabled={!roomBill}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-theme-gradient text-white text-xs font-bold shadow-theme hover:opacity-95 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. HOTEL ROOM SERVICES CONFIGURATION MODAL                                */}
      {/* ========================================================================= */}
      {servicesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-theme-light text-theme-primary flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Room Services Configuration</h3>
                  <p className="text-xs text-slate-500">Decide what hospitality services to show on guest QR</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServicesModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveServicesConfig} className="p-6 overflow-y-auto space-y-4 flex-1">
              {servicesFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{servicesFeedback}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Toggle services on or off. Only the enabled services will be visible to guests when they scan the Room QR code.
              </p>

              {/* Service Switches */}
              <div className="space-y-2">
                {[
                  { key: 'order_food', label: '🍽️ In-Room Food Ordering', desc: 'Order food from digital menu delivered to room' },
                  { key: 'room_service', label: '🛎️ General Room Service', desc: 'General staff assistance & room supplies' },
                  { key: 'housekeeping', label: '🧹 Housekeeping & Cleaning', desc: 'Room cleaning, bed making & fresh linens' },
                  { key: 'water', label: '💧 Extra Mineral Water', desc: 'Packaged drinking water delivery' },
                  { key: 'laundry', label: '🧺 Laundry & Ironing', desc: 'Clothes laundry, wash & pressing service' },
                  { key: 'maintenance', label: '🔧 Maintenance & Repairs', desc: 'AC, plumbing, electrical or appliance fixes' },
                  { key: 'taxi', label: '🚖 Taxi & Cab Booking', desc: 'Front desk cab reservation assistance' },
                  { key: 'wakeup', label: '⏰ Wake-up Call', desc: 'Scheduled morning wake-up call from desk' },
                  { key: 'view_bill', label: '🧾 Live Room Bill & Folio', desc: 'Allow guest to view stay charges & food orders' },
                  { key: 'reception', label: '📞 Front Desk Direct Call', desc: 'One-tap phone call directly to reception' },
                  { key: 'feedback', label: '⭐ Guest Feedback & Rating', desc: 'Collect ratings & comments from guests' },
                ].map((s) => {
                  const isEnabled = (servicesConfig as any)[s.key] ?? true;
                  return (
                    <div
                      key={s.key}
                      onClick={() => {
                        triggerHaptic('light');
                        setServicesConfig((prev) => ({
                          ...prev,
                          [s.key]: !isEnabled,
                        }));
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none ${
                        isEnabled
                          ? 'bg-slate-50 border-slate-200/90 hover:border-theme-primary/50'
                          : 'bg-slate-100/50 border-slate-200/50 opacity-50'
                      }`}
                    >
                      <div className="pr-2">
                        <p className="text-xs font-bold text-slate-900">{s.label}</p>
                        <p className="text-[11px] text-slate-500">{s.desc}</p>
                      </div>
                      <div className={`shrink-0 transition ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Front Desk Phone Input */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Front Desk / Reception Direct Phone
                </label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210 or 0 (Intercom)"
                    value={servicesConfig.reception_phone || ''}
                    onChange={(e) => setServicesConfig({ ...servicesConfig, reception_phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Guests tapping the "Contact Reception" button will dial this number directly.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServicesModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingServices}
                  className="px-5 py-2 rounded-xl bg-theme-gradient text-white text-xs font-bold shadow-theme hover:opacity-95 transition disabled:opacity-50"
                >
                  {savingServices ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
