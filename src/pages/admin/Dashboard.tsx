import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Store,
  CreditCard,
  UtensilsCrossed,
  ShoppingBag,
  Table2,
  FolderTree,
  Loader2,
  TrendingUp,
  Zap,
  Clock,
  Flame,
  CheckCircle2,
  ChefHat,
  Plus,
  ChevronRight,
  Sparkles,
  DollarSign,
  Wallet,
  Smartphone,
  X,
  BarChart3,
  CheckCircle,
  XCircle,
  QrCode,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { stopOrderRinging } from '@/lib/audio';
import { DashboardSkeleton } from '@/components/admin/Skeleton';
import { RestaurantQRModal } from '@/components/admin/RestaurantQRModal';

interface DashboardMenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  food_type: string;
  is_available: boolean;
  category_name?: string;
  is_featured?: boolean;
}

interface HourlySlot {
  label: string;
  slotName: string;
  startHour: number;
  endHour: number;
  revenue: number;
  ordersCount: number;
  isCurrent: boolean;
}

interface ShortOrderItem {
  id: string;
  item_name: string;
  quantity: number;
  food_type?: string;
}

interface DashboardOrder {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_mobile?: string;
  table_number?: string;
  order_type?: string;
  grand_total: number;
  order_status: string;
  payment_status: string;
  payment_method?: string;
  payment_method_note?: string;
  notes?: string;
  created_at: string;
  order_items?: ShortOrderItem[];
}

export default function Dashboard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { restaurant, loading: authLoading, refetchRestaurant } = useAuth();
  const currencySymbol = restaurant?.currency_symbol || restaurant?.currency || 'AED';

  // Live Operations State
  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRestaurantQRModal, setShowRestaurantQRModal] = useState(false);

  // Short Orders & Pipeline
  const [ordersList, setOrdersList] = useState<DashboardOrder[]>([]);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'served' | 'completed'>('all');
  const [settlingOrder, setSettlingOrder] = useState<DashboardOrder | null>(null);

  // Key Counts & Stats
  const [pipelineCounts, setPipelineCounts] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    completed: 0,
  });

  const [topMenuItems, setTopMenuItems] = useState<DashboardMenuItem[]>([]);
  const [totalMenuCount, setTotalMenuCount] = useState(0);
  const [totalTablesCount, setTotalTablesCount] = useState(0);

  // Today's Sales Performance State
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [todayAvgOrderValue, setTodayAvgOrderValue] = useState(0);
  const [todayCashRevenue, setTodayCashRevenue] = useState(0);
  const [todayDigitalRevenue, setTodayDigitalRevenue] = useState(0);
  const [hourlySlots, setHourlySlots] = useState<HourlySlot[]>([]);

  // Fetch Dashboard Data with resilient querying
  const fetchData = useCallback(async () => {
    if (!restaurant) return;

    try {
      // 1. Fetch Restaurant Open Status from Settings
      const { data: settingsData } = await supabase
        .from('restaurant_settings')
        .select('restaurant_open, accept_orders')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (settingsData) {
        setIsOpen(settingsData.restaurant_open !== false && settingsData.accept_orders !== false);
      }

      // 2. Fetch Menu Items count & Dining Tables count
      const [menuCountRes, tablesCountRes] = await Promise.all([
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
        supabase.from('dining_tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      ]);
      setTotalMenuCount(menuCountRes.count || 0);
      setTotalTablesCount(tablesCountRes.count || 0);

      // 3. Fetch Featured Menu Items (Top 4)
      const { data: menuData } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          price,
          image_url,
          food_type,
          is_available,
          is_featured,
          categories ( name )
        `)
        .eq('restaurant_id', restaurant.id)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4);

      if (menuData) {
        setTopMenuItems(
          menuData.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: Number(m.price || 0),
            image_url: m.image_url,
            food_type: m.food_type || 'veg',
            is_available: m.is_available !== false,
            is_featured: !!m.is_featured,
            category_name: m.categories?.name || 'General',
          }))
        );
      }

      // 4. Fetch Today's Orders with Order Items
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let fetchedOrders: DashboardOrder[] = [];

      // Try nested select first
      const { data: ordersWithItems, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_mobile,
          table_number,
          order_type,
          grand_total,
          order_status,
          payment_status,
          payment_method,
          payment_method_note,
          notes,
          created_at,
          order_items (
            id,
            item_name,
            quantity,
            food_type
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!ordersErr && ordersWithItems) {
        fetchedOrders = ordersWithItems as any;
      } else {
        // Fallback: fetch orders separately
        const { data: rawOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
          .limit(25);

        if (rawOrders && rawOrders.length > 0) {
          const orderIds = rawOrders.map((o) => o.id);
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('id, order_id, item_name, quantity, food_type')
            .in('order_id', orderIds);

          const itemsMap = new Map<string, ShortOrderItem[]>();
          (itemsData || []).forEach((it: any) => {
            const arr = itemsMap.get(it.order_id) || [];
            arr.push(it);
            itemsMap.set(it.order_id, arr);
          });

          fetchedOrders = rawOrders.map((o) => ({
            ...o,
            order_items: itemsMap.get(o.id) || [],
          })) as any;
        }
      }

      setOrdersList(fetchedOrders);

      // 5. Calculate Pipeline Counts
      const counts = { pending: 0, preparing: 0, ready: 0, served: 0, completed: 0 };
      fetchedOrders.forEach((o) => {
        const st = String(o.order_status || 'pending').toLowerCase();
        if (st === 'pending') counts.pending++;
        else if (st === 'preparing') counts.preparing++;
        else if (st === 'ready') counts.ready++;
        else if (st === 'served') counts.served++;
        else if (st === 'completed') counts.completed++;
      });
      setPipelineCounts(counts);

      // 6. Calculate Today's Sales Performance & Hourly Slots
      const currentHour = new Date().getHours();
      const slots: HourlySlot[] = [
        { label: '06-09', slotName: 'Morning', startHour: 6, endHour: 9, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 6 && currentHour < 9 },
        { label: '09-12', slotName: 'Breakfast', startHour: 9, endHour: 12, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 9 && currentHour < 12 },
        { label: '12-15', slotName: 'Lunch Rush', startHour: 12, endHour: 15, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 12 && currentHour < 15 },
        { label: '15-18', slotName: 'Afternoon', startHour: 15, endHour: 18, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 15 && currentHour < 18 },
        { label: '18-21', slotName: 'Dinner Rush', startHour: 18, endHour: 21, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 18 && currentHour < 21 },
        { label: '21-24', slotName: 'Late Night', startHour: 21, endHour: 24, revenue: 0, ordersCount: 0, isCurrent: currentHour >= 21 || currentHour < 6 },
      ];

      let totTodayRev = 0;
      let totTodayOrders = 0;
      let totCash = 0;
      let totDigital = 0;

      fetchedOrders.forEach((ord) => {
        const ordDate = new Date(ord.created_at);
        if (ordDate >= todayStart && ord.order_status !== 'cancelled') {
          const amount = Number(ord.grand_total ?? 0);
          totTodayRev += amount;
          totTodayOrders += 1;

          const payMethod = String(ord.payment_method || 'cash').toLowerCase();
          if (payMethod.includes('cash')) {
            totCash += amount;
          } else {
            totDigital += amount;
          }

          const orderHour = ordDate.getHours();
          const targetSlot = slots.find((s) => orderHour >= s.startHour && orderHour < s.endHour);
          if (targetSlot) {
            targetSlot.revenue += amount;
            targetSlot.ordersCount += 1;
          } else if (orderHour < 6 || orderHour >= 21) {
            slots[5].revenue += amount;
            slots[5].ordersCount += 1;
          }
        }
      });

      setTodayRevenue(totTodayRev);
      setTodayOrdersCount(totTodayOrders);
      setTodayAvgOrderValue(totTodayOrders > 0 ? totTodayRev / totTodayOrders : 0);
      setTodayCashRevenue(totCash);
      setTodayDigitalRevenue(totDigital);
      setHourlySlots(slots);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    if (!authLoading && restaurant) {
      fetchData();
    } else if (!authLoading && !restaurant) {
      setLoading(false);
    }

    const handleOrderEvent = () => fetchData();
    window.addEventListener('new_order_received', handleOrderEvent);
    window.addEventListener('order_status_updated', handleOrderEvent);
    window.addEventListener('app_refresh', handleOrderEvent);

    return () => {
      window.removeEventListener('new_order_received', handleOrderEvent);
      window.removeEventListener('order_status_updated', handleOrderEvent);
      window.removeEventListener('app_refresh', handleOrderEvent);
    };
  }, [restaurant, authLoading, fetchData]);

  // Step-by-Step Single Button Order Advance
  const handleAdvanceShortOrder = async (order: DashboardOrder) => {
    triggerHaptic('medium');
    const currentStatus = String(order.order_status || 'pending').toLowerCase();
    const paymentStatus = String(order.payment_status || 'unpaid').toLowerCase();

    let nextStatus = 'preparing';
    if (currentStatus === 'pending') {
      nextStatus = 'preparing';
      stopOrderRinging();
      window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: order.id } }));
    } else if (currentStatus === 'preparing') {
      nextStatus = 'ready';
    } else if (currentStatus === 'ready') {
      nextStatus = 'served';
    } else if (currentStatus === 'served') {
      if (paymentStatus !== 'paid') {
        setSettlingOrder(order);
        return;
      }
      nextStatus = 'completed';
    } else {
      return;
    }

    const nowIso = new Date().toISOString();
    setOrdersList((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, order_status: nextStatus } : o))
    );

    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus, updated_at: nowIso })
      .eq('id', order.id);

    if (error) {
      console.error('Error updating order:', error);
      fetchData();
    }
  };

  // 1-Tap Quick Settle on Home
  const handleSettleShortOrder = async (order: DashboardOrder, payMethod: string, payStatus: string = 'paid', note?: string) => {
    const nowIso = new Date().toISOString();

    setOrdersList((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              order_status: 'completed',
              payment_status: payStatus,
              payment_method: payMethod,
              payment_method_note: note ?? o.payment_method_note,
              notes: note ?? o.notes,
            }
          : o
      )
    );

    setSettlingOrder(null);
    triggerHaptic('success');

    const updatePayload: Record<string, any> = {
      order_status: 'completed',
      payment_status: payStatus,
      payment_method: payMethod,
      updated_at: nowIso,
    };
    if (note !== undefined) {
      updatePayload.payment_method_note = note || null;
      updatePayload.notes = note || null;
    }

    let { error } = await supabase.from('orders').update(updatePayload).eq('id', order.id);
    if (error && note !== undefined) {
      delete updatePayload.payment_method_note;
      await supabase.from('orders').update(updatePayload).eq('id', order.id);
    }
  };

  // Toggle store open/close status
  const handleToggleStoreStatus = async () => {
    if (!restaurant || togglingOpen) return;
    triggerHaptic('success');
    const nextStatus = !isOpen;
    setIsOpen(nextStatus);
    setTogglingOpen(true);

    try {
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('restaurant_settings')
          .update({
            restaurant_open: nextStatus,
            accept_orders: nextStatus,
          })
          .eq('restaurant_id', restaurant.id);
      } else {
        await supabase.from('restaurant_settings').insert({
          restaurant_id: restaurant.id,
          restaurant_open: nextStatus,
          accept_orders: nextStatus,
        });
      }

      await refetchRestaurant();
    } catch (err) {
      console.error('Error updating store status:', err);
    } finally {
      setTogglingOpen(false);
    }
  };

  // Toggle item in-stock status
  const handleToggleStock = async (item: DashboardMenuItem) => {
    triggerHaptic('selection');
    const newStatus = !item.is_available;
    setTopMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_available: newStatus } : m))
    );

    try {
      await supabase.from('menu_items').update({ is_available: newStatus }).eq('id', item.id);
    } catch (err) {
      console.error('Error toggling menu item stock:', err);
    }
  };

  // Filtered Short Orders for Home Showcase
  const filteredOrders = useMemo(() => {
    if (selectedOrderFilter === 'all') return ordersList;
    if (selectedOrderFilter === 'ready') {
      return ordersList.filter(
        (o) => o.order_status?.toLowerCase() === 'ready' || o.order_status?.toLowerCase() === 'served'
      );
    }
    return ordersList.filter((o) => o.order_status?.toLowerCase() === selectedOrderFilter);
  }, [ordersList, selectedOrderFilter]);

  // Clickable Pipeline Handler (Filter & Smooth Scroll)
  const handleSelectPipelineStage = (stage: 'pending' | 'preparing' | 'ready' | 'completed') => {
    triggerHaptic('selection');
    setSelectedOrderFilter((prev) => (prev === stage ? 'all' : stage));
    // Smoothly scroll to the live short orders section
    setTimeout(() => {
      const el = document.getElementById('live-short-orders');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  if (!restaurant) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-md mx-auto my-12">
        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Restaurant Found</h3>
        <p className="text-xs text-slate-500 mt-1">Your account is not linked to a restaurant profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-6">
      {/* ========================================================================= */}
      {/* 1. HERO GREETING & STORE LIVE STATUS BANNER                               */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-theme-primary/20 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/90">
                Live Restaurant Control
              </span>
              <span className="text-[11px] font-semibold text-slate-300">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {restaurant.name}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">
              {pipelineCounts.pending > 0 ? (
                <strong className="text-amber-400 font-bold flex items-center gap-1 inline-flex">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  {pipelineCounts.pending} new order{pipelineCounts.pending > 1 ? 's' : ''} waiting for action
                </strong>
              ) : (
                'All orders up to date'
              )}
            </p>
          </div>

          {/* Quick Header Actions: Store Switch & Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              disabled={togglingOpen}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition backdrop-blur-md native-press shadow-md ${
                isOpen
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-400/50'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-white animate-pulse' : 'bg-rose-400'}`} />
              <span>{isOpen ? 'Store Open' : 'Store Closed'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowRestaurantQRModal(true);
              }}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs transition native-press flex items-center gap-1.5 border border-white/10"
              title="View & Print Restaurant Digital Menu QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-theme-primary" />
              <span>Store QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigate('reports');
              }}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs transition native-press flex items-center gap-1.5 border border-white/10"
            >
              <BarChart3 className="w-3.5 h-3.5 text-theme-primary" />
              <span>Reports</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigate('table:menu_items');
              }}
              className="px-3.5 py-2.5 bg-theme-primary text-white hover:brightness-110 font-bold rounded-2xl text-xs transition shadow-theme native-press flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LIVE ORDER PIPELINE CARDS (STEP-BY-STEP STAGES)                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-theme-primary animate-ping" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              Live Order Stages
            </h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('table:orders');
            }}
            className="text-xs font-bold text-theme-primary hover:opacity-80 flex items-center gap-0.5 native-press"
          >
            <span>Orders Board</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Pending */}
          <button
            type="button"
            onClick={() => handleSelectPipelineStage('pending')}
            className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer native-press border relative overflow-hidden group ${
              selectedOrderFilter === 'pending'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                : 'bg-amber-50/90 border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 text-amber-900 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${selectedOrderFilter === 'pending' ? 'text-white' : 'text-amber-700'}`}>
                1. Pending
              </span>
              {pipelineCounts.pending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              {pipelineCounts.pending}
            </p>
            <p className={`text-[10px] font-semibold mt-1 flex items-center justify-between ${selectedOrderFilter === 'pending' ? 'text-amber-100' : 'text-amber-700/80'}`}>
              <span>Needs Acceptance</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${selectedOrderFilter === 'pending' ? 'rotate-90 text-white' : 'opacity-40 group-hover:opacity-100'}`} />
            </p>
          </button>

          {/* Kitchen / Preparing */}
          <button
            type="button"
            onClick={() => handleSelectPipelineStage('preparing')}
            className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer native-press border relative overflow-hidden group ${
              selectedOrderFilter === 'preparing'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400 scale-[1.02]'
                : 'bg-blue-50/90 border-blue-200/80 hover:bg-blue-100 hover:border-blue-300 text-blue-900 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${selectedOrderFilter === 'preparing' ? 'text-white' : 'text-blue-700'}`}>
                2. Kitchen
              </span>
              <ChefHat className={`w-3.5 h-3.5 ${selectedOrderFilter === 'preparing' ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              {pipelineCounts.preparing}
            </p>
            <p className={`text-[10px] font-semibold mt-1 flex items-center justify-between ${selectedOrderFilter === 'preparing' ? 'text-blue-100' : 'text-blue-700/80'}`}>
              <span>In Preparation</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${selectedOrderFilter === 'preparing' ? 'rotate-90 text-white' : 'opacity-40 group-hover:opacity-100'}`} />
            </p>
          </button>

          {/* Ready / Served */}
          <button
            type="button"
            onClick={() => handleSelectPipelineStage('ready')}
            className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer native-press border relative overflow-hidden group ${
              selectedOrderFilter === 'ready'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400 scale-[1.02]'
                : 'bg-purple-50/90 border-purple-200/80 hover:bg-purple-100 hover:border-purple-300 text-purple-900 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${selectedOrderFilter === 'ready' ? 'text-white' : 'text-purple-700'}`}>
                3. Ready
              </span>
              <CheckCircle2 className={`w-3.5 h-3.5 ${selectedOrderFilter === 'ready' ? 'text-white' : 'text-purple-600'}`} />
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              {pipelineCounts.ready + pipelineCounts.served}
            </p>
            <p className={`text-[10px] font-semibold mt-1 flex items-center justify-between ${selectedOrderFilter === 'ready' ? 'text-purple-100' : 'text-purple-700/80'}`}>
              <span>Ready to Settle</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${selectedOrderFilter === 'ready' ? 'rotate-90 text-white' : 'opacity-40 group-hover:opacity-100'}`} />
            </p>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => handleSelectPipelineStage('completed')}
            className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer native-press border relative overflow-hidden group ${
              selectedOrderFilter === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400 scale-[1.02]'
                : 'bg-emerald-50/90 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-900 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${selectedOrderFilter === 'completed' ? 'text-white' : 'text-emerald-700'}`}>
                4. Completed
              </span>
              <TrendingUp className={`w-3.5 h-3.5 ${selectedOrderFilter === 'completed' ? 'text-white' : 'text-emerald-600'}`} />
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              {pipelineCounts.completed}
            </p>
            <p className={`text-[10px] font-semibold mt-1 flex items-center justify-between ${selectedOrderFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700/80'}`}>
              <span>Settled & Done</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${selectedOrderFilter === 'completed' ? 'rotate-90 text-white' : 'opacity-40 group-hover:opacity-100'}`} />
            </p>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TODAY'S SALES & OPERATIONAL STATS                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              <span className="text-theme-primary text-base mr-0.5">{currencySymbol}</span>
              {todayRevenue.toFixed(2)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500">
              <span className="text-emerald-700">Cash: {todayCashRevenue.toFixed(0)}</span>
              <span>•</span>
              <span className="text-blue-700">Digital: {todayDigitalRevenue.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Today's Orders Count */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Today's Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {todayOrdersCount} <span className="text-xs font-semibold text-slate-400">orders</span>
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-1">
              Avg ticket: {currencySymbol} {todayAvgOrderValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total Menu Items */}
        <button
          type="button"
          onClick={() => onNavigate('table:menu_items')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between text-left hover:border-slate-300 transition native-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Menu Items</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalMenuCount} <span className="text-xs font-semibold text-slate-400">items</span>
            </h3>
            <p className="text-[10px] font-semibold text-theme-primary mt-1 flex items-center gap-0.5">
              <span>Manage Menu</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        </button>

        {/* Dining Tables */}
        <button
          type="button"
          onClick={() => onNavigate('table:dining_tables')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between text-left hover:border-slate-300 transition native-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Dining Tables</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Table2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalTablesCount} <span className="text-xs font-semibold text-slate-400">tables</span>
            </h3>
            <p className="text-[10px] font-semibold text-cyan-700 mt-1 flex items-center gap-0.5">
              <span>QR & Tables</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. LIVE SHORT ORDERS LIST (PROPER SHORT ORDER CARDS & FAST ACTION)         */}
      {/* ========================================================================= */}
      <div id="live-short-orders" className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 scroll-mt-6">
        {/* Header & Quick Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-theme-light rounded-lg text-theme-primary">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Live Short Orders
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant step-by-step processing for recent & active orders
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'preparing', label: 'Kitchen' },
                { id: 'ready', label: 'Ready' },
                { id: 'completed', label: 'Done' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedOrderFilter(tab.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition native-press whitespace-nowrap ${
                  selectedOrderFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Short Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-slate-100">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No {selectedOrderFilter !== 'all' ? selectedOrderFilter : ''} orders found.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">New orders from QR or staff will appear here live.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOrders.map((order) => {
              const status = String(order.order_status || 'pending').toLowerCase();
              const paymentStatus = String(order.payment_status || 'unpaid').toLowerCase();
              const payMethod = String(order.payment_method || 'cash').toUpperCase();
              const items = order.order_items || [];
              const itemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Top Bar: Order # + Table + Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-slate-900">
                            #{order.order_number}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                            Table {order.table_number || 'Walk-in'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {order.customer_name || 'Walk-in Guest'} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Payment Status Pill */}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {paymentStatus === 'paid' ? `Paid (${payMethod})` : 'Unpaid'}
                      </span>
                    </div>

                    {/* Short Items Summary */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-700 space-y-1">
                      {items.length > 0 ? (
                        <p className="font-semibold line-clamp-2 text-[11.5px] leading-snug">
                          {items.map((it) => `${it.quantity}x ${it.item_name}`).join(', ')}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">General Order Items</p>
                      )}
                      <div className="flex items-center justify-between text-[11px] font-bold pt-1 border-t border-slate-200/60 text-slate-900">
                        <span className="text-slate-500 font-normal">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
                        <span>{currencySymbol} {Number(order.grand_total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* STEP-BY-STEP SINGLE ACTION BUTTON */}
                  <div>
                    {status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handleAdvanceShortOrder(order)}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition native-press"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Accept Order (Start Prep)</span>
                      </button>
                    ) : status === 'preparing' ? (
                      <button
                        type="button"
                        onClick={() => handleAdvanceShortOrder(order)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition native-press"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Food Ready ➔ Mark Ready</span>
                      </button>
                    ) : status === 'ready' ? (
                      <button
                        type="button"
                        onClick={() => handleAdvanceShortOrder(order)}
                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition native-press"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Food Served ➔ Mark Served</span>
                      </button>
                    ) : status === 'served' ? (
                      <button
                        type="button"
                        onClick={() => handleAdvanceShortOrder(order)}
                        className={`w-full text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition native-press ${
                          paymentStatus === 'paid'
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-500/20'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20'
                        }`}
                      >
                        {paymentStatus === 'paid' ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Complete Order ✅</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Collect Payment & Complete ➔</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold py-2 px-3 rounded-xl text-[11px] flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Done
                        </span>
                        <span className="text-[10px] text-emerald-900 font-semibold uppercase">
                          {paymentStatus === 'paid' ? `${payMethod}` : 'Unpaid'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. HOURLY SHIFTS CHART & FAST SHORTCUTS GRID                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Hourly Shift Mini Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-theme-primary" />
                  Today's Peak Rush & Shift Distribution
                </h3>
                <p className="text-xs text-slate-400">Live order volume by shift times</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                Peak Shift Active
              </span>
            </div>

            <div className="h-40 w-full flex items-end justify-between gap-2 sm:gap-4 pt-4 pb-1">
              {hourlySlots.map((slot, idx) => {
                const maxSlotRevenue = Math.max(...hourlySlots.map((d) => d.revenue), 40);
                const heightPercent = Math.max(12, Math.round((slot.revenue / maxSlotRevenue) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-xl whitespace-nowrap">
                      {currencySymbol} {slot.revenue.toFixed(0)} • {slot.ordersCount} ord
                    </div>

                    {slot.isCurrent && (
                      <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white animate-pulse">
                        NOW
                      </span>
                    )}

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
                        slot.isCurrent
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md ring-2 ring-emerald-300'
                          : slot.revenue > 0
                          ? 'bg-theme-gradient opacity-90'
                          : 'bg-slate-100'
                      }`}
                    />

                    <span className="text-[10px] font-bold text-slate-700 leading-none mt-1">
                      {slot.label}
                    </span>
                    <span className="text-[8.5px] text-slate-400 font-semibold truncate max-w-[50px]">
                      {slot.slotName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 mt-2">
            <span>Tap bars for shift summary</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-theme-primary hover:underline"
            >
              View Full Reports →
            </button>
          </div>
        </div>

        {/* Quick App Shortcuts Tile (1 Col) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-slate-100">
              <Zap className="w-4 h-4 text-theme-primary" />
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Quick App Shortcuts
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Reports', icon: BarChart3, key: 'reports', color: 'text-blue-600' },
                { label: 'Orders', icon: ShoppingBag, key: 'table:orders', color: 'text-emerald-600' },
                { label: 'Tables & Rooms', icon: QrCode, key: 'table:dining_tables', color: 'text-cyan-600' },
                { label: 'Add Item', icon: UtensilsCrossed, key: 'table:menu_items', color: 'text-purple-600' },
                { label: 'Categories', icon: FolderTree, key: 'table:categories', color: 'text-amber-600' },
                { label: 'Settings', icon: Store, key: 'table:restaurant_settings', color: 'text-rose-600' },
              ].map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      onNavigate(q.key);
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition border border-slate-100 hover:border-slate-200 native-press shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                      <Icon className={`w-4 h-4 ${q.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                      {q.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">Dishgaze Restaurant v1.0 • Native App Sync</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FEATURED MENU HIGHLIGHTS (2-by-2 Grid with fast In-Stock switch)        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-theme-primary" />
              Featured Menu & Fast Stock
            </h3>
            <p className="text-[11px] text-slate-400">1-tap toggle item availability</p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('table:menu_items');
            }}
            className="text-xs font-bold text-theme-primary hover:opacity-80 flex items-center gap-0.5 native-press"
          >
            <span>All Menu Items</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topMenuItems.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">No menu items added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            {topMenuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between group relative"
              >
                {/* Photo (16:10 aspect ratio) */}
                <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-theme-light flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-theme-primary" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute inset-x-0 top-0 p-1.5 flex items-center justify-between pointer-events-none">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                      {item.category_name}
                    </span>
                    {item.is_featured && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-theme-gradient text-white shadow-xs flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-1.5 right-1.5 bg-slate-950/90 text-white px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight backdrop-blur-xs">
                    <span className="text-theme-primary mr-0.5">{currencySymbol}</span>
                    {item.price.toFixed(2)}
                  </div>
                </div>

                {/* Body & Fast Stock Toggle */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <h4 className="font-bold text-slate-900 text-xs truncate mb-2">
                    {item.name}
                  </h4>

                  <button
                    type="button"
                    onClick={() => handleToggleStock(item)}
                    className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-bold py-1.5 rounded-xl border transition native-press ${
                      item.is_available
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. QUICK 1-TAP SETTLE & COMPLETE MODAL ON HOME                            */}
      {/* ========================================================================= */}
      {settlingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 animate-bottom-sheet sm:animate-none pb-safe sm:pb-6">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Settle & Complete Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order #{settlingOrder.order_number} • Table {settlingOrder.table_number || 'Walk-in'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettlingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-4 text-center">
              <span className="text-xs font-semibold text-slate-500">Total Amount to Collect</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                <span className="text-theme-primary text-lg mr-1">{currencySymbol}</span>
                {Number(settlingOrder.grand_total || 0).toFixed(2)}
              </h2>
            </div>

            <p className="text-xs font-bold text-slate-700 mb-3">Select Payment Method:</p>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <button
                type="button"
                onClick={() => handleSettleShortOrder(settlingOrder, 'cash', 'paid')}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm transition native-press"
              >
                <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Cash</p>
                  <span className="text-[10px] text-emerald-700 font-medium">Paid & Complete</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSettleShortOrder(settlingOrder, 'upi', 'paid')}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs sm:text-sm transition native-press"
              >
                <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">UPI / QR</p>
                  <span className="text-[10px] text-blue-700 font-medium">Paid & Complete</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSettleShortOrder(settlingOrder, 'card', 'paid')}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs sm:text-sm transition native-press"
              >
                <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Card / POS</p>
                  <span className="text-[10px] text-purple-700 font-medium">Paid & Complete</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const note = window.prompt('Enter payment reference/note (e.g. Voucher, Cheque #):');
                  if (note !== null) {
                    handleSettleShortOrder(settlingOrder, 'other', 'paid', note.trim());
                  }
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm transition native-press"
              >
                <Wallet className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Other Method</p>
                  <span className="text-[10px] text-amber-700 font-medium">Custom</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSettleShortOrder(settlingOrder, String(settlingOrder.payment_method || 'cash'), 'unpaid')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
            >
              Keep Unpaid & Mark Complete
            </button>
          </div>
        </div>
      )}

      {/* FIXED 1 BARCODE / RESTAURANT MENU QR CODE MODAL */}
      {showRestaurantQRModal && restaurant && (
        <RestaurantQRModal
          restaurant={restaurant}
          onClose={() => setShowRestaurantQRModal(false)}
        />
      )}
    </div>
  );
}