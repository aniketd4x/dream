// src/pages/staff/StaffPortalPage.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  ChefHat,
  BellRing,
  BedDouble,
  Wrench,
  Receipt,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  X,
  Search,
  ExternalLink,
  ShieldCheck,
  Building2,
  Store,
  DollarSign,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/haptics';
import { startOrderRinging, stopOrderRinging, playOrderChime } from '@/lib/audio';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { StaffRole } from '@/types/staff';
import { STAFF_ROLES } from '@/types/staff';

interface StaffOrder {
  id: string;
  order_number: string;
  table_number?: string;
  room_number?: string;
  customer_name?: string;
  customer_mobile?: string;
  total_amount: number;
  grand_total: number;
  order_status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'pending';
  order_type?: string;
  notes?: string;
  created_at: string;
  items?: {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    food_type?: string;
    notes?: string;
  }[];
}

interface StaffRoomRequest {
  id: string;
  room_id: string;
  room_number?: string;
  request_type: string;
  description?: string;
  notes?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  guest_name?: string;
  guest_mobile?: string;
  created_at: string;
}

interface StaffRoom {
  id: string;
  room_number: string;
  room_name?: string;
  status: string;
  floor_number: number;
  room_type: string;
}

export default function StaffPortalPage() {
  const { user, restaurant, signOut } = useAuth();
  const navigate = useNavigate();

  // Role preview switcher for Admins or testing
  const [activeRole, setActiveRole] = useState<StaffRole>(() => {
    return (user?.staff_role as StaffRole) || 'WAITER';
  });

  const [soundMuted, setSoundMuted] = useState(false);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [roomRequests, setRoomRequests] = useState<StaffRoomRequest[]>([]);
  const [rooms, setRooms] = useState<StaffRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tableScopeFilter, setTableScopeFilter] = useState<'my' | 'all'>('my');
  const [roomScopeFilter, setRoomScopeFilter] = useState<'my' | 'all'>('my');
  const [orderTab, setOrderTab] = useState<'pending' | 'preparing' | 'ready' | 'served'>('pending');
  const [kitchenTab, setKitchenTab] = useState<'new' | 'preparing' | 'ready'>('new');
  const [roomReqTab, setRoomReqTab] = useState<'new' | 'in_progress' | 'completed'>('new');
  const [selectedOrderForSettle, setSelectedOrderForSettle] = useState<StaffOrder | null>(null);

  const restaurantId = restaurant?.id || user?.restaurant_id || 'd3b07384-d113-4678-bb56-9a2c270c5387';

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Orders with Items
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersData) {
        const formattedOrders: StaffOrder[] = ordersData.map((o: any) => ({
          ...o,
          items: o.order_items || [],
        }));
        setOrders(formattedOrders);
      } else {
        setOrders([]);
      }

      // 2. Fetch Room Service Requests
      const { data: reqsData } = await supabase
        .from('room_service_requests')
        .select('*, hotel_rooms(room_number)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (reqsData) {
        setRoomRequests(
          reqsData.map((r: any) => ({
            ...r,
            room_number: r.hotel_rooms?.room_number || r.room_number || 'Room',
          }))
        );
      } else {
        setRoomRequests([]);
      }

      // 3. Fetch Hotel Rooms
      const { data: roomsData } = await supabase
        .from('hotel_rooms')
        .select('id, room_number, room_name, status, floor_number, room_type')
        .eq('restaurant_id', restaurantId)
        .order('room_number', { ascending: true });

      if (roomsData) {
        setRooms(roomsData);
      } else {
        setRooms([]);
      }
    } catch (err) {
      console.error('Error fetching staff operational data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Real-time listener for Orders & Requests
    const channel = supabase
      .channel(`staff_portal_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (!soundMuted && payload.eventType === 'INSERT') {
          startOrderRinging();
          triggerHaptic('alert');
        }
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_service_requests' }, () => {
        if (!soundMuted) {
          playOrderChime();
        }
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopOrderRinging();
    };
  }, [restaurantId, soundMuted]);

  // Handle Order Status Update (e.g. Accept, Prepare, Ready, Serve)
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  ) => {
    triggerHaptic('medium');
    stopOrderRinging();

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
    );

    try {
      await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Error updating order status in DB:', err);
    }
  };

  // Handle Room Request Status Update
  const handleUpdateRoomRequest = async (
    reqId: string,
    newStatus: 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED'
  ) => {
    triggerHaptic('medium');
    setRoomRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );

    try {
      await supabase
        .from('room_service_requests')
        .update({
          status: newStatus,
          completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
        })
        .eq('id', reqId);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Error updating room request:', err);
    }
  };

  // Handle Room Status Change (Housekeeping)
  const handleUpdateRoomStatus = async (roomId: string, newStatus: string) => {
    triggerHaptic('selection');
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r))
    );

    try {
      await supabase.from('hotel_rooms').update({ status: newStatus }).eq('id', roomId);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Error updating room status:', err);
    }
  };

  // Quick Settle Payment
  const handleSettleOrder = async (orderId: string, method: string) => {
    triggerHaptic('medium');
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, payment_status: 'paid', order_status: 'completed' }
          : o
      )
    );
    setSelectedOrderForSettle(null);

    try {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          payment_method: method,
        })
        .eq('id', orderId);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Error settling payment:', err);
    }
  };

  // Assigned tables of logged-in staff
  const assignedTables = useMemo(() => {
    return user?.assigned_tables || ['1', '2', '3', '4'];
  }, [user]);

  // Assigned rooms of logged-in staff
  const assignedRooms = useMemo(() => {
    return user?.assigned_rooms || ['101', '102', '201', '202'];
  }, [user]);

  // Filtered Orders for Waiter / Cashier
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Table assignment check
      if (
        tableScopeFilter === 'my' &&
        assignedTables.length > 0 &&
        activeRole === 'WAITER'
      ) {
        if (o.table_number && !assignedTables.includes(o.table_number)) return false;
      }

      if (orderTab === 'pending') return o.order_status === 'pending';
      if (orderTab === 'preparing') return o.order_status === 'preparing';
      if (orderTab === 'ready') return o.order_status === 'ready';
      if (orderTab === 'served') return o.order_status === 'served' || o.order_status === 'completed';
      return true;
    });
  }, [orders, tableScopeFilter, assignedTables, activeRole, orderTab]);

  // Filtered Orders for Kitchen KDS
  const kitchenOrders = useMemo(() => {
    return orders.filter((o) => {
      if (kitchenTab === 'new') return o.order_status === 'pending';
      if (kitchenTab === 'preparing') return o.order_status === 'preparing';
      if (kitchenTab === 'ready') return o.order_status === 'ready';
      return false;
    });
  }, [orders, kitchenTab]);

  // Filtered Room Requests for Room Service
  const filteredRoomRequests = useMemo(() => {
    return roomRequests.filter((r) => {
      if (
        roomScopeFilter === 'my' &&
        assignedRooms.length > 0 &&
        ['ROOM_SERVICE', 'HOUSEKEEPING'].includes(activeRole)
      ) {
        if (r.room_number && !assignedRooms.includes(r.room_number)) return false;
      }

      if (roomReqTab === 'new') return r.status === 'NEW';
      if (roomReqTab === 'in_progress') return r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS';
      if (roomReqTab === 'completed') return r.status === 'COMPLETED';
      return true;
    });
  }, [roomRequests, roomScopeFilter, assignedRooms, activeRole, roomReqTab]);

  const currentRoleMeta = STAFF_ROLES[activeRole] || STAFF_ROLES.WAITER;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* =========================================================================
          TOP NAV BAR (STICKY, MOBILE FIRST)
         ========================================================================= */}
      <header className="sticky top-0 z-30 px-4 py-2.5 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.name || 'Staff User'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentRoleMeta.badgeBg} ${currentRoleMeta.color} shrink-0`}
              >
                {currentRoleMeta.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {restaurant?.name || 'Restaurant / Hotel'}
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (soundMuted) {
                setSoundMuted(false);
              } else {
                setSoundMuted(true);
                stopOrderRinging();
              }
            }}
            className={`p-2 rounded-xl border transition native-press ${
              soundMuted
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-xs'
            }`}
            title={soundMuted ? 'Ringtone Muted' : 'Ringtone Active'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition native-press"
            title="Refresh Live Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          <ThemeToggle />

          {/* Admin Panel Link */}
          {(!user?.is_staff || ['RESTAURANT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_SUPERVISOR', 'HOTEL_SUPERVISOR'].includes(user?.staff_role || '')) && (
            <Link
              to="/admin"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition native-press"
              title="Open Admin Dashboard"
            >
              <Store className="w-4 h-4" />
            </Link>
          )}

          {/* Sign Out */}
          <button
            type="button"
            onClick={async () => {
              triggerHaptic('light');
              await signOut();
              navigate('/staff/login');
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition native-press"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Role Switcher Pill Bar (for Testing & Multi-role Staff) */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>Role View:</span>
        </span>
        {(
          [
            'WAITER',
            'KITCHEN_STAFF',
            'ROOM_SERVICE',
            'HOUSEKEEPING',
            'CASHIER',
            'MAINTENANCE',
            'RESTAURANT_MANAGER',
          ] as StaffRole[]
        ).map((rKey) => {
          const isSelected = activeRole === rKey;
          return (
            <button
              key={rKey}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveRole(rKey);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition native-press ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {STAFF_ROLES[rKey]?.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          ROLE VIEW 1: WAITER CONSOLE
         ========================================================================= */}
      {activeRole === 'WAITER' && (
        <main className="flex-1 p-3 sm:p-5 max-w-5xl mx-auto w-full space-y-4">
          {/* Waiter Subheader with Assigned Tables switch */}
          <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Floor Tables</p>
                <p className="text-[10px] text-slate-400">
                  Assigned: {assignedTables.map((t) => `T-${t}`).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTableScopeFilter('my')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tableScopeFilter === 'my'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                My Tables
              </button>
              <button
                type="button"
                onClick={() => setTableScopeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tableScopeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                All Tables
              </button>
            </div>
          </div>

          {/* Waiter Workflow Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setOrderTab('pending')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                orderTab === 'pending'
                  ? 'bg-white dark:bg-[#111827] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">New QR</span>
              <span className="text-sm font-black">
                {orders.filter((o) => o.order_status === 'pending').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTab('preparing')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                orderTab === 'preparing'
                  ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">In Kitchen</span>
              <span className="text-sm font-black">
                {orders.filter((o) => o.order_status === 'preparing').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTab('ready')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                orderTab === 'ready'
                  ? 'bg-white dark:bg-[#111827] text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">Ready to Serve</span>
              <span className="text-sm font-black">
                {orders.filter((o) => o.order_status === 'ready').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTab('served')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                orderTab === 'served'
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">Served</span>
              <span className="text-sm font-black">
                {orders.filter((o) => o.order_status === 'served' || o.order_status === 'completed').length}
              </span>
            </button>
          </div>

          {/* Orders Cards List */}
          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No {orderTab} orders right now</p>
              <p className="text-xs text-slate-400">New customer orders will ring here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black px-2.5 py-1 bg-amber-500 text-white rounded-xl shadow-xs">
                        T-{order.table_number || 'Takeaway'}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Order {order.order_number}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {order.customer_name || 'Guest'} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ₹{order.grand_total || order.total_amount}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-1.5 text-xs">
                    {order.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${it.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span className="font-bold">{it.quantity}x</span>
                          <span>{it.item_name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">₹{it.unit_price * it.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200/60">
                      <strong>Note:</strong> {order.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    {order.order_status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept & Send to Kitchen</span>
                      </button>
                    )}

                    {order.order_status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>Mark Ready</span>
                      </button>
                    )}

                    {order.order_status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Mark as Served</span>
                      </button>
                    )}

                    {order.order_status === 'served' && order.payment_status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForSettle(order)}
                        className="py-2 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs transition"
                      >
                        Collect ₹{order.grand_total}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          ROLE VIEW 2: KITCHEN DISPLAY SYSTEM (KDS)
         ========================================================================= */}
      {activeRole === 'KITCHEN_STAFF' && (
        <main className="flex-1 p-3 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 rounded-xl text-white">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">Kitchen Display System (KDS)</h2>
                <p className="text-[11px] text-slate-400">Live order tickets ready for preparation</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setKitchenTab('new')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenTab === 'new' ? 'bg-amber-500 text-white' : 'text-slate-400'
                }`}
              >
                Cooking Queue ({orders.filter((o) => o.order_status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setKitchenTab('preparing')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenTab === 'preparing' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                On Stove ({orders.filter((o) => o.order_status === 'preparing').length})
              </button>
              <button
                type="button"
                onClick={() => setKitchenTab('ready')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenTab === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Ready ({orders.filter((o) => o.order_status === 'ready').length})
              </button>
            </div>
          </div>

          {kitchenOrders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <ChefHat className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Kitchen queue is clear!</p>
              <p className="text-xs text-slate-400">Incoming dishes will display here in real time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-700 shadow-md p-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Ticket Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      <span className="text-lg font-black px-2.5 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg">
                        T-{order.table_number || 'Takeaway'}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Ticket {order.order_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Items */}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((it) => (
                        <div key={it.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center">
                              {it.quantity}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">{it.item_name}</span>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${it.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-2 mb-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs rounded-lg font-medium border border-amber-200">
                        ⚡ {order.notes}
                      </div>
                    )}
                  </div>

                  {/* KDS Action Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    {order.order_status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition"
                      >
                        Start Cooking
                      </button>
                    )}
                    {order.order_status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition"
                      >
                        Dish Ready for Pickup
                      </button>
                    )}
                    {order.order_status === 'ready' && (
                      <div className="text-center py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                        Waiting for Waiter to Serve
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          ROLE VIEW 3: ROOM SERVICE CONSOLE
         ========================================================================= */}
      {activeRole === 'ROOM_SERVICE' && (
        <main className="flex-1 p-3 sm:p-5 max-w-5xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between p-3 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-cyan-500" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Room Service Queue</p>
                <p className="text-[10px] text-slate-400">Assigned: {assignedRooms.map((r) => `RM-${r}`).join(', ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRoomScopeFilter('my')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  roomScopeFilter === 'my'
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                My Rooms
              </button>
              <button
                type="button"
                onClick={() => setRoomScopeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  roomScopeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                All Rooms
              </button>
            </div>
          </div>

          {/* Workflow Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setRoomReqTab('new')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                roomReqTab === 'new'
                  ? 'bg-white dark:bg-[#111827] text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">New Requests</span>
              <span className="text-sm font-black">
                {roomRequests.filter((r) => r.status === 'NEW').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoomReqTab('in_progress')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                roomReqTab === 'in_progress'
                  ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">Out for Delivery</span>
              <span className="text-sm font-black">
                {roomRequests.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoomReqTab('completed')}
              className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 ${
                roomReqTab === 'completed'
                  ? 'bg-white dark:bg-[#111827] text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] uppercase">Delivered</span>
              <span className="text-sm font-black">
                {roomRequests.filter((r) => r.status === 'COMPLETED').length}
              </span>
            </button>
          </div>

          {filteredRoomRequests.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No {roomReqTab} room requests</p>
              <p className="text-xs text-slate-400">Guest requests will notify you in real time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoomRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black px-2.5 py-0.5 bg-cyan-600 text-white rounded-xl shadow-xs">
                        Room {req.room_number}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {req.request_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {req.guest_name || 'Guest'} · {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {req.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">{req.description}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    {req.status === 'NEW' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRoomRequest(req.id, 'IN_PROGRESS')}
                        className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        Accept & Dispatch
                      </button>
                    )}
                    {req.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRoomRequest(req.id, 'COMPLETED')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        Mark Delivered to Room
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          ROLE VIEW 4: HOUSEKEEPING / MAINTENANCE CONSOLE
         ========================================================================= */}
      {(activeRole === 'HOUSEKEEPING' || activeRole === 'MAINTENANCE') && (
        <main className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="p-3.5 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeRole === 'HOUSEKEEPING' ? 'Housekeeping Room Status Matrix' : 'Maintenance & Repairs Matrix'}
                </h2>
                <p className="text-[11px] text-slate-400">Tap room status pill to update cleaning state</p>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => {
              const status = room.status.toUpperCase();
              let badgeColor = 'bg-slate-100 text-slate-700';
              if (status === 'AVAILABLE' || status === 'CLEAN') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              if (status === 'DIRTY') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
              if (status === 'CLEANING') badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              if (status === 'OCCUPIED') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';

              return (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        Room {room.room_number}
                      </span>
                      <p className="text-[11px] text-slate-400">{room.room_name || room.room_type}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                      {status}
                    </span>
                  </div>

                  {/* 1-Tap Status Switch Buttons */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleUpdateRoomStatus(room.id, 'DIRTY')}
                      className={`p-1.5 rounded-lg border transition ${
                        status === 'DIRTY'
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Dirty
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateRoomStatus(room.id, 'CLEANING')}
                      className={`p-1.5 rounded-lg border transition ${
                        status === 'CLEANING'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Cleaning
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateRoomStatus(room.id, 'AVAILABLE')}
                      className={`p-1.5 rounded-lg border transition ${
                        status === 'AVAILABLE' || status === 'CLEAN'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Clean & Ready
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* =========================================================================
          ROLE VIEW 5: CASHIER / BILLING CONSOLE
         ========================================================================= */}
      {activeRole === 'CASHIER' && (
        <main className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="p-4 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Cashier & Billing Terminal</h2>
                <p className="text-xs text-slate-400">Collect payments, settle table bills & view invoices</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {orders.filter((o) => o.payment_status === 'unpaid').length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">All table bills are settled!</p>
              </div>
            ) : (
              orders
                .filter((o) => o.payment_status === 'unpaid')
                .map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500 text-white rounded-lg text-xs font-black">
                          T-{order.table_number || 'Takeaway'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Order {order.order_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {order.items?.length || 0} items · {order.customer_name || 'Walk-in'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ₹{order.grand_total || order.total_amount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForSettle(order)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        Settle Bill
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </main>
      )}

      {/* =========================================================================
          ROLE VIEW 6: RESTAURANT / HOTEL MANAGER CONSOLE
         ========================================================================= */}
      {(activeRole === 'RESTAURANT_MANAGER' || activeRole === 'HOTEL_MANAGER') && (
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5">
          <div className="p-5 rounded-3xl bg-linear-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Manager Duty View
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-2">
                Operations Overview
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Monitoring live orders, housekeeping readiness, and staff rosters.
              </p>
            </div>
            <Link
              to="/admin"
              className="px-4 py-2.5 bg-white text-blue-900 font-bold rounded-xl text-xs shadow-md hover:bg-blue-50 transition self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>Full Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Live Orders</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {orders.filter((o) => o.order_status !== 'completed' && o.order_status !== 'cancelled').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Settled</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {orders.filter((o) => o.payment_status === 'paid').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">Room Requests</p>
              <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                {roomRequests.filter((r) => r.status !== 'COMPLETED').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">Rooms Occupied</p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {rooms.filter((r) => r.status.toUpperCase() === 'OCCUPIED').length}
              </p>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          SETTLE PAYMENT MODAL
         ========================================================================= */}
      {selectedOrderForSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Settle Order {selectedOrderForSettle.order_number}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrderForSettle(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center">
              <span className="text-xs text-slate-400 block mb-1">Total Bill Amount</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{selectedOrderForSettle.grand_total || selectedOrderForSettle.total_amount}
              </span>
              <p className="text-xs text-slate-500 mt-1">Table {selectedOrderForSettle.table_number || 'Takeaway'}</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Select Payment Mode:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSettleOrder(selectedOrderForSettle.id, 'cash')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition"
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleOrder(selectedOrderForSettle.id, 'upi')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition"
                >
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleOrder(selectedOrderForSettle.id, 'card')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition"
                >
                  Card POS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
