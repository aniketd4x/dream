// src/pages/admin/RoomServiceStaffPage.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  BellRing,
  Sparkles,
  Droplets,
  Shirt,
  Wrench,
  Car,
  AlarmClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  Phone,
  User,
  UtensilsCrossed,
  Printer,
  X,
  MessageSquare,
  BadgeAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fetchRoomRequests, updateRoomRequestStatus } from '@/lib/hotelService';
import type { RoomServiceRequest, RequestStatus, RequestType } from '@/types/hotel';
import { triggerHaptic } from '@/lib/haptics';
import { printIframeHtml } from '@/lib/fileExport';

const REQUEST_TYPE_META: Record<
  RequestType,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  HOUSEKEEPING: {
    label: 'Housekeeping / Cleaning',
    icon: Sparkles,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  WATER: {
    label: 'Mineral Water Refill',
    icon: Droplets,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  TOWEL: {
    label: 'Fresh Towels & Linen',
    icon: Shirt,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  TOWELS: {
    label: 'Fresh Towels & Linen',
    icon: Shirt,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  PILLOW: {
    label: 'Extra Pillow / Bedding',
    icon: Shirt,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  BLANKET: {
    label: 'Extra Blanket / Quilt',
    icon: Shirt,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  MAINTENANCE: {
    label: 'Maintenance / AC / Repair',
    icon: Wrench,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  LAUNDRY: {
    label: 'Laundry & Ironing',
    icon: Shirt,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  TAXI: {
    label: 'Taxi / Cab Booking',
    icon: Car,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  WAKE_UP_CALL: {
    label: 'Wake-up Call',
    icon: AlarmClock,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  WAKEUP: {
    label: 'Wake-up Call',
    icon: AlarmClock,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  ROOM_SERVICE: {
    label: 'Room Food Delivery',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  RECEPTION: {
    label: 'Front Desk / Reception',
    icon: BellRing,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  OTHER: {
    label: 'General Guest Assistance',
    icon: BellRing,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

export default function RoomServiceStaffPage() {
  const { restaurant } = useAuth();

  // Active Tab: 'requests' | 'orders'
  const [activeTab, setActiveTab] = useState<'requests' | 'orders'>('requests');

  // Requests State
  const [requests, setRequests] = useState<RoomServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Orders State (Room Service Food Orders)
  const [roomOrders, setRoomOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Note Modal
  const [noteModalReq, setNoteModalReq] = useState<RoomServiceRequest | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Load Requests
  const loadRequests = async () => {
    if (!restaurant?.id) return;
    setLoadingRequests(true);
    try {
      const data = await fetchRoomRequests(restaurant.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load Room Food Orders
  const loadRoomOrders = async () => {
    if (!restaurant?.id) return;
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .or('order_type.eq.ROOM_SERVICE,room_id.not.is.null')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setRoomOrders(data);
      }
    } catch (err) {
      console.error('Error loading room orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadRequests();
      loadRoomOrders();

      // Realtime subscription for requests
      const channel = supabase
        .channel('room_staff_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_service_requests', filter: `restaurant_id=eq.${restaurant.id}` },
          () => {
            loadRequests();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
          () => {
            loadRoomOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [restaurant?.id]);

  // Handle Request Status Change
  const handleUpdateStatus = async (reqId: string, nextStatus: RequestStatus) => {
    triggerHaptic('medium');
    await updateRoomRequestStatus(reqId, nextStatus);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: nextStatus,
              completed_at: nextStatus === 'COMPLETED' ? new Date().toISOString() : r.completed_at,
            }
          : r
      )
    );
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!noteModalReq) return;
    triggerHaptic('light');
    await updateRoomRequestStatus(noteModalReq.id, noteModalReq.status, noteInput);
    setRequests((prev) =>
      prev.map((r) => (r.id === noteModalReq.id ? { ...r, notes: noteInput } : r))
    );
    setNoteModalReq(null);
    setNoteInput('');
  };

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = r.room_number?.toLowerCase().includes(q);
        const matchGuest = r.guest_name?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        if (!matchRoom && !matchGuest && !matchDesc) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    return {
      newRequests: requests.filter((r) => r.status === 'NEW').length,
      activeRequests: requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS').length,
      completedToday: requests.filter((r) => r.status === 'COMPLETED').length,
      pendingOrders: roomOrders.filter((o) => o.order_status === 'pending' || o.order_status === 'preparing').length,
    };
  }, [requests, roomOrders]);

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    triggerHaptic('medium');
    try {
      await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
      setRoomOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Print Room Delivery Slip
  const handlePrintDeliverySlip = (order: any) => {
    triggerHaptic('selection');
    const currency = restaurant?.currency_symbol || restaurant?.currency || '₹';
    const items = Array.isArray(order.items) ? order.items : [];
    const html = `
      <div style="font-family: monospace; width: 280px; margin: 0 auto; padding: 16px; border: 1px dashed #000; text-align: left;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 16px;">${restaurant?.name || 'Hotel'}</h2>
          <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">ROOM SERVICE</h3>
          <h1 style="margin: 4px 0 0; font-size: 26px; font-weight: 900;">ROOM ${order.room_number || 'DELIVERY'}</h1>
        </div>

        <div style="font-size: 11px; margin-bottom: 8px;">
          <div>Order #: ${order.order_number || order.id.slice(0, 6)}</div>
          <div>Date: ${new Date(order.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short' })}</div>
          ${order.customer_name ? `<div>Guest: ${order.customer_name}</div>` : ''}
          ${order.notes ? `<div>Note: <b>${order.notes}</b></div>` : ''}
        </div>

        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin-bottom: 8px;">
          ${items
            .map(
              (item: any) => `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span>${item.quantity}x ${item.name}</span>
              <span>${currency} ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between;">
          <span>Total:</span>
          <span>${currency} ${(order.grand_total || 0).toFixed(2)}</span>
        </div>

        <div style="text-align: center; margin-top: 12px; font-size: 10px;">
          Deliver promptly to room. Thank you!
        </div>
      </div>
    `;
    printIframeHtml(html, `Room_Order_${order.order_number}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-theme-gradient flex items-center justify-center text-white shadow-theme">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Room Service & Housekeeping</h1>
              <p className="text-xs font-medium text-slate-500">
                Live staff operational console for guest requests & room deliveries
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('requests');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition native-press ${
                activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Guest Requests</span>
              {stats.newRequests > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  {stats.newRequests}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('orders');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition native-press ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4 text-theme-primary" />
              <span>Room Food Orders</span>
              {stats.pendingOrders > 0 && (
                <span className="bg-theme-primary text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                  {stats.pendingOrders}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-rose-600">New Guest Requests</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.newRequests}</span>
              <BadgeAlert className="w-4 h-4 text-rose-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-amber-600">In Progress</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.activeRequests}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600">Completed Requests</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.completedToday}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-theme-primary">Pending Room Orders</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.pendingOrders}</span>
              <UtensilsCrossed className="w-4 h-4 text-theme-primary" />
            </div>
          </div>
        </div>

        {/* TAB 1: GUEST REQUESTS (HOUSEKEEPING, WATER, TOWELS, REPAIRS) */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by room, guest, or request..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="NEW">🚨 New</option>
                  <option value="ACCEPTED">👍 Accepted</option>
                  <option value="IN_PROGRESS">⏳ In Progress</option>
                  <option value="COMPLETED">✅ Completed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadRequests}
                disabled={loadingRequests}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">No active guest requests</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guest requests submitted via the Room QR Portal will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRequests.map((req) => {
                  const meta = REQUEST_TYPE_META[req.request_type] || REQUEST_TYPE_META.OTHER;
                  const Icon = meta.icon;
                  const isNew = req.status === 'NEW';
                  const isUrgent = req.priority === 'URGENT';

                  return (
                    <div
                      key={req.id}
                      className={`bg-white rounded-2xl p-5 border shadow-xs transition space-y-4 ${
                        isNew ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                      }`}
                    >
                      {/* Top Row: Room Number & Type */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 border ${meta.border}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400 uppercase">Room</span>
                              <span className="text-xl font-black text-slate-900">
                                {req.room_number || 'Room'}
                              </span>
                              {isUrgent && (
                                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 mt-0.5">{meta.label}</h4>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${
                              req.status === 'NEW'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : req.status === 'ACCEPTED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : req.status === 'IN_PROGRESS'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>

                      {/* Description & Guest Details */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
                        {req.description && (
                          <p className="font-semibold text-slate-800 leading-relaxed">
                            "{req.description}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                          <div className="flex items-center gap-3">
                            {req.guest_name && (
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <User className="w-3 h-3 text-slate-400" />
                                {req.guest_name}
                              </span>
                            )}
                            {req.guest_mobile && (
                              <a
                                href={`tel:${req.guest_mobile}`}
                                className="flex items-center gap-1 text-blue-600 font-bold hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {req.guest_mobile}
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(req.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Staff Notes if any */}
                      {req.notes && (
                        <div className="text-[11px] bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl text-amber-900">
                          <span className="font-bold block mb-0.5">Staff Note:</span>
                          {req.notes}
                        </div>
                      )}

                      {/* Action Progression Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNoteModalReq(req);
                            setNoteInput(req.notes || '');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{req.notes ? 'Edit Note' : 'Add Note'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {req.status === 'NEW' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                            >
                              Accept
                            </button>
                          )}

                          {req.status === 'ACCEPTED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS')}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                            >
                              Start Working
                            </button>
                          )}

                          {req.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'COMPLETED')}
                              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Complete</span>
                            </button>
                          )}

                          {req.status === 'COMPLETED' && (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROOM SERVICE FOOD ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            {loadingOrders ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-primary" />
                <p className="text-xs">Loading room food orders...</p>
              </div>
            ) : roomOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">No room food orders</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When guests scan their room QR code and order food, the kitchen tickets show up here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roomOrders.map((order) => {
                  const currency = restaurant?.currency_symbol || restaurant?.currency || '₹';
                  const items = Array.isArray(order.items) ? order.items : [];

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-theme-primary uppercase">Room Order</span>
                            <span className="text-lg font-black text-slate-900">
                              #{order.order_number || order.id.slice(0, 6)}
                            </span>
                          </div>
                          <div className="inline-block bg-slate-900 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-lg mt-1">
                            ROOM {order.room_number || 'SERVICE'}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-slate-900 block">
                            {currency} {(order.grand_total || 0).toFixed(2)}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase ${
                              order.order_status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : order.order_status === 'preparing'
                                ? 'bg-blue-100 text-blue-800'
                                : order.order_status === 'served' || order.order_status === 'delivered'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {order.order_status}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                        {items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-slate-700">
                            <span className="font-semibold">
                              {it.quantity}x {it.name}
                            </span>
                            <span className="font-mono text-slate-500">
                              {currency} {(it.price * it.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handlePrintDeliverySlip(order)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Slip</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {order.order_status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700"
                            >
                              Start Prep
                            </button>
                          )}

                          {order.order_status === 'preparing' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700"
                            >
                              Dispatch to Room
                            </button>
                          )}

                          {order.order_status === 'delivered' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note Modal */}
      {noteModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Staff Note - Room {noteModalReq.room_number}
            </h3>
            <textarea
              rows={3}
              placeholder="e.g. Assigned to John, extra towels delivered at 3:15 PM..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteModalReq(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-500 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-4 py-1.5 rounded-xl bg-theme-primary text-white text-xs font-bold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
