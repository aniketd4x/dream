import { useState, type ReactNode, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Receipt,
  FolderTree,
  UtensilsCrossed,
  Table2,
  ShoppingBag,
  ListOrdered,
  Settings,
  Layers,
  LogOut,
  Menu as MenuIcon,
  X,
  ChefHat,
  Crown,
  Calendar,
  AlertCircle,
  Bell,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Sparkles,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  User,
  ChevronDown,
  BarChart3,
  QrCode,
  Building2,
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { TABLES } from '@/lib/tables';
import { supabase } from '@/lib/supabase';
import { playOrderChime, startOrderRinging, stopOrderRinging } from '@/lib/audio';
import { triggerHaptic } from '@/lib/haptics';
import PullToRefresh from './PullToRefresh';
import { RestaurantQRModal } from './RestaurantQRModal';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Store,
  CreditCard,
  Receipt,
  FolderTree,
  UtensilsCrossed,
  Table2,
  ShoppingBag,
  ListOrdered,
  Settings,
  Layers,
  BarChart3,
};

interface AdminLayoutProps {
  active: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}

// Tables to exclude from the sidebar
const EXCLUDED_TABLES = [
  'restaurants',
  'subscription_plans',
  'restaurant_subscriptions',
  'order_items',
  'item_variants',
];

export default function AdminLayout({ active, onNavigate, children }: AdminLayoutProps) {
  const { user, signOut, restaurant, isSuperAdmin, isManagingDifferentRestaurant, resetToSuperAdmin } = useAuth();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showStoreQRModal, setShowStoreQRModal] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [subscription, setSubscription] = useState<{
    plan_name: string;
    days_remaining: number;
    is_expired: boolean;
    is_expiring_soon: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundMuted, setSoundMuted] = useState(false);
  const [orderToast, setOrderToast] = useState<{ id: string; order_number: string; grand_total: number } | null>(null);
  const [pendingRoomRequestsCount, setPendingRoomRequestsCount] = useState<number>(0);
  const [roomRequestToast, setRoomRequestToast] = useState<{
    id: string;
    room_number: string;
    request_type: string;
    description?: string;
  } | null>(null);
  const lastOrderTimeRef = useRef<string | null>(null);
  const acceptedOrderIdsRef = useRef<Set<string>>(new Set());
  const acceptedRoomRequestIdsRef = useRef<Set<string>>(new Set());
  const activeToastOrderIdRef = useRef<string | null>(null);
  const activeToastRoomReqIdRef = useRef<string | null>(null);

  // Helper to mark an order as accepted locally, clear matching toast, and stop ringing
  const markOrderAccepted = (orderId: string) => {
    const idStr = String(orderId);
    console.log('✅ Local order acceptance recorded:', idStr);
    acceptedOrderIdsRef.current.add(idStr);

    if (activeToastOrderIdRef.current === idStr) {
      activeToastOrderIdRef.current = null;
    }

    setOrderToast((prev) => {
      if (prev && String(prev.id) === idStr) {
        return null;
      }
      return prev;
    });

    setPendingCount((prev) => Math.max(0, prev - 1));
    if (pendingRoomRequestsCount === 0) {
      stopOrderRinging();
    }
  };

  const markRoomRequestAccepted = (reqId: string) => {
    const idStr = String(reqId);
    console.log('✅ Local room request acceptance recorded:', idStr);
    acceptedRoomRequestIdsRef.current.add(idStr);

    if (activeToastRoomReqIdRef.current === idStr) {
      activeToastRoomReqIdRef.current = null;
    }

    setRoomRequestToast((prev) => {
      if (prev && String(prev.id) === idStr) return null;
      return prev;
    });

    setPendingRoomRequestsCount((prev) => Math.max(0, prev - 1));
    if (pendingCount === 0) {
      stopOrderRinging();
    }
  };

  // Listen for global custom events dispatched when staff accepts an order or room request anywhere in the app
  useEffect(() => {
    const handleOrderAcceptedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        markOrderAccepted(String(detail.id));
      }
    };

    const handleRoomAcceptedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        markRoomRequestAccepted(String(detail.id));
      }
    };

    window.addEventListener('order_accepted', handleOrderAcceptedEvent);
    window.addEventListener('order_status_updated', handleOrderAcceptedEvent);
    window.addEventListener('room_request_accepted', handleRoomAcceptedEvent);
    window.addEventListener('room_request_status_updated', handleRoomAcceptedEvent);

    return () => {
      window.removeEventListener('order_accepted', handleOrderAcceptedEvent);
      window.removeEventListener('order_status_updated', handleOrderAcceptedEvent);
      window.removeEventListener('room_request_accepted', handleRoomAcceptedEvent);
      window.removeEventListener('room_request_status_updated', handleRoomAcceptedEvent);
    };
  }, [pendingCount, pendingRoomRequestsCount]);

  // Global Realtime Orders Listener + 2.5-second Failsafe Polling
  useEffect(() => {
    if (!restaurant) return;

    const handleNewOrder = (orderData: { id: string; order_number?: string; grand_total?: number; created_at?: string }) => {
      const orderIdStr = String(orderData.id);
      if (acceptedOrderIdsRef.current.has(orderIdStr)) {
        return; // Already accepted!
      }

      console.log('🔔 GLOBAL NEW ORDER DETECTED:', orderData);
      triggerHaptic('alert');
      if (orderData.created_at) {
        lastOrderTimeRef.current = orderData.created_at;
      }
      if (!soundMuted) {
        startOrderRinging(); // Ring continuously until accepted!
      }

      if (activeToastOrderIdRef.current !== orderIdStr) {
        activeToastOrderIdRef.current = orderIdStr;
        setOrderToast({
          id: orderIdStr,
          order_number: String(orderData.order_number || 'New Order'),
          grand_total: Number(orderData.grand_total || 0),
        });

        // Dispatch global window event to trigger auto-refresh on Orders page immediately!
        window.dispatchEvent(new CustomEvent('new_order_received', { detail: orderData }));
      }
    };

    // 1. Supabase Realtime Channel (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel(`global_admin_orders_${restaurant.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new?.restaurant_id === restaurant.id && payload.new?.order_status === 'pending') {
              handleNewOrder(payload.new);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new?.restaurant_id === restaurant.id) {
              if (payload.new?.order_status !== 'pending') {
                markOrderAccepted(String(payload.new.id));
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Global Orders Realtime Status:', status);
      });

    // 2. Fetch current latest order timestamp
    supabase
      .from('orders')
      .select('id, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) {
          lastOrderTimeRef.current = data[0].created_at;
        }
      });

    // 3. Failsafe Smart Polling (2.5 seconds): check for pending orders and keep ringing until accepted
    const interval = setInterval(async () => {
      try {
        const { data: pendingData } = await supabase
          .from('orders')
          .select('id, order_number, grand_total, created_at')
          .eq('restaurant_id', restaurant.id)
          .eq('order_status', 'pending')
          .order('created_at', { ascending: false });

        // Filter out orders that have already been accepted locally in this session
        const unacceptedPending = (pendingData || []).filter(
          (o) => !acceptedOrderIdsRef.current.has(String(o.id))
        );

        setPendingCount(unacceptedPending.length);

        if (unacceptedPending.length > 0) {
          const latestPending = unacceptedPending[0];
          const pendingId = String(latestPending.id);

          if (!soundMuted) {
            startOrderRinging(); // Ring continuously while unaccepted pending orders exist!
          }

          // Only update state & dispatch event if active order notification changed
          if (activeToastOrderIdRef.current !== pendingId) {
            activeToastOrderIdRef.current = pendingId;
            setOrderToast({
              id: pendingId,
              order_number: String(latestPending.order_number || 'Pending Order'),
              grand_total: Number(latestPending.grand_total || 0),
            });

            window.dispatchEvent(new CustomEvent('new_order_received', { detail: latestPending }));
          }
        } else {
          // No unaccepted pending orders left - stop ringing!
          activeToastOrderIdRef.current = null;
          setOrderToast(null);
        }

        // Check Room Service Requests (status: NEW)
        let unacceptedRoomReqs: any[] = [];
        try {
          const { data: reqData } = await supabase
            .from('room_service_requests')
            .select('id, room_number, request_type, description, status, hotel_rooms(room_number)')
            .eq('restaurant_id', restaurant.id)
            .eq('status', 'NEW')
            .order('created_at', { ascending: false });

          if (reqData && reqData.length > 0) {
            unacceptedRoomReqs = reqData.map((d: any) => ({
              ...d,
              room_number: d.hotel_rooms?.room_number || d.room_number || 'Room',
            }));
          } else {
            const rawLocal = localStorage.getItem('dishgaze_room_requests_cache');
            if (rawLocal) {
              const allReqs = JSON.parse(rawLocal);
              unacceptedRoomReqs = allReqs.filter(
                (r: any) => r.status === 'NEW' && r.restaurant_id === restaurant.id
              );
            }
          }
        } catch (_) {}

        const activeRoomReqs = unacceptedRoomReqs.filter(
          (r) => !acceptedRoomRequestIdsRef.current.has(String(r.id))
        );

        setPendingRoomRequestsCount(activeRoomReqs.length);

        if (activeRoomReqs.length > 0) {
          const latestReq = activeRoomReqs[0];
          const reqId = String(latestReq.id);

          if (!soundMuted) {
            startOrderRinging(); // Ring continuously for room service requests!
          }

          if (activeToastRoomReqIdRef.current !== reqId) {
            activeToastRoomReqIdRef.current = reqId;
            setRoomRequestToast({
              id: reqId,
              room_number: latestReq.room_number,
              request_type: latestReq.request_type,
              description: latestReq.description,
            });
            window.dispatchEvent(new CustomEvent('new_room_request_received', { detail: latestReq }));
          }
        } else {
          activeToastRoomReqIdRef.current = null;
          setRoomRequestToast(null);
        }

        // Stop ringing only when both orders and room requests are handled
        if (unacceptedPending.length === 0 && activeRoomReqs.length === 0) {
          stopOrderRinging();
        }
      } catch (pollErr) {
        console.warn('Smart polling check error:', pollErr);
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [restaurant, soundMuted]);

  // Fetch subscription info for sidebar
  useEffect(() => {
    async function fetchSubscription() {
      if (!restaurant) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('restaurant_subscriptions')
          .select(`
            end_date,
            status,
            subscription_plans!inner (
              name
            )
          `)
          .eq('restaurant_id', restaurant.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching subscription:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const sub = data[0];
          const endDate = new Date(sub.end_date);
          const today = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          setSubscription({
            plan_name: (sub.subscription_plans as any)?.name || 'Pro Plan',
            days_remaining: daysRemaining,
            is_expired: daysRemaining < 0,
            is_expiring_soon: daysRemaining <= 7 && daysRemaining >= 0,
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [restaurant]);

  // Navigation Items (Room Service placed right after Orders)
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'table:orders', label: 'Orders', icon: ShoppingBag, badge: pendingCount },
    { key: 'operations:room_service', label: 'Room Service', icon: BellRing, badge: pendingRoomRequestsCount },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'table:dining_tables', label: 'Tables & Rooms', icon: Table2 },
    { key: 'table:menu_items', label: 'Menu', icon: UtensilsCrossed },
    { key: 'table:categories', label: 'Categories', icon: FolderTree },
    { key: 'table:restaurant_settings', label: 'Settings', icon: Settings },
  ];

  // Mobile Bottom Bar Primary Tabs (Top 4 most used + More)
  const mobilePrimaryTabs = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { key: 'table:orders', label: 'Orders', icon: ShoppingBag, badge: pendingCount },
    { key: 'operations:room_service', label: 'Room Service', icon: BellRing, badge: pendingRoomRequestsCount },
    { key: 'table:dining_tables', label: 'Tables & Rooms', icon: Table2 },
  ];

  const activeLabel = navItems.find((n) => n.key === active)?.label ?? 'Dashboard';

  function handleNav(key: string) {
    triggerHaptic('selection');
    onNavigate(key);
    setMoreSheetOpen(false);
  }

  return (
    <div className="min-h-screen bg-theme-page flex font-sans antialiased text-slate-900 selection:bg-theme-light selection:text-theme-primary">
      {/* Sidebar - Desktop Only (Hidden on Mobile) */}
      <aside className="hidden lg:flex sticky top-0 left-0 z-40 h-screen w-64 bg-theme-sidebar flex-col shrink-0" style={{ color: 'var(--theme-sidebar-text)' }}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
          <img
            src={restaurant?.logo_url || '/logo.png'}
            alt={restaurant?.name || 'Dishgaze'}
            className="w-9 h-9 rounded-xl object-contain bg-white/10 border border-white/10 shadow-theme shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-tight truncate">{restaurant?.name || 'Dishgaze'}</p>
            <p className="text-slate-400 text-xs truncate">Manager Panel</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all native-press ${
                  isActive
                    ? 'bg-theme-light text-theme-primary border border-theme-light font-bold shadow-xs'
                    : 'hover:bg-white/10'
                }`}
                style={!isActive ? { color: 'var(--theme-sidebar-text)' } : {}}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center animate-live-pulse shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Subscription Plan Info in Sidebar */}
        {!loading && restaurant && subscription && (
          <div className="px-3 py-3 border-t border-slate-800 shrink-0">
            <div className={`rounded-xl p-3 ${
              subscription.is_expired
                ? 'bg-red-500/10 border border-red-500/30'
                : subscription.is_expiring_soon
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-emerald-500/10 border border-emerald-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className={`w-4 h-4 ${
                  subscription.is_expired
                    ? 'text-red-400'
                    : subscription.is_expiring_soon
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`} />
                <span className="text-xs font-semibold text-slate-300">Plan</span>
              </div>
              <p className="text-sm font-bold text-white truncate">
                {subscription.plan_name}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                {!subscription.is_expired ? (
                  <span className={`text-[11px] font-medium ${
                    subscription.is_expiring_soon ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {subscription.days_remaining} days left
                  </span>
                ) : (
                  <span className="text-[11px] text-red-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    Expired
                  </span>
                )}
                <button
                  onClick={() => handleNav('table:subscription_plans')}
                  className="text-xs text-theme-primary hover:underline font-bold"
                >
                  {subscription.is_expired ? 'Renew' : 'Upgrade'}
                </button>
              </div>
            </div>
          </div>
        )}

      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Modern App Header - Clean on Mobile, No Hamburger Menu */}
        <header className="sticky top-0 z-30 min-h-16 h-auto py-2.5 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 gap-3 pt-safe bg-theme-header">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Header Logo/Icon */}
            <img
              src={restaurant?.logo_url || '/logo.png'}
              alt={restaurant?.name || 'Dishgaze'}
              className="lg:hidden w-8 h-8 rounded-lg object-contain bg-white/10 border border-slate-200 shadow-xs shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">{activeLabel}</h1>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">{restaurant?.name || 'Restaurant Admin'}</p>
            </div>
          </div>

          {/* Right Header Action Items */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Restaurant Menu QR Code (Fixed 1 Barcode) */}
            {restaurant && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowStoreQRModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl border border-theme-border bg-theme-light text-theme-primary transition hover:brightness-95 shadow-xs native-press"
                title="View & Print Fixed Restaurant Menu QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                <span className="hidden sm:inline">Menu QR</span>
              </button>
            )}

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
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition native-press ${
                soundMuted
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs'
              }`}
              title={soundMuted ? 'Order Sound Muted (Tap to Unmute)' : 'Order Sound Active (Tap to Mute)'}
            >
              {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
              <span className="hidden sm:inline">{soundMuted ? 'Muted' : 'Live Ring'}</span>
            </button>

            {/* Header Notification Bell Icon Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                handleNav('table:orders');
              }}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition native-press"
              title={pendingCount > 0 ? `${pendingCount} Pending Order Notifications` : 'Order Notifications'}
            >
              <Bell className={`w-4 h-4 ${pendingCount > 0 ? 'text-red-500 animate-bounce' : 'text-slate-600'}`} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-live-pulse shadow-xs border border-white">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Header User Profile / Sign Out Trigger */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setProfileModalOpen(true);
              }}
              className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 transition native-press border border-slate-200/80 shadow-xs"
              title="Account & Sign Out"
            >
              <div className="w-7 h-7 rounded-lg bg-theme-gradient flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                {(user?.email ?? 'A')[0].toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate">
                  {user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Account</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
            </button>
          </div>
        </header>

        {/* Global Live New Order Toast Alert Banner (elevated cleanly above bottom nav bar) */}
        {orderToast && (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+14px)] sm:bottom-28 lg:bottom-8 right-3 sm:right-6 left-3 sm:left-auto z-50 animate-bottom-sheet max-w-sm sm:max-w-md">
            <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-theme-border flex items-center gap-3.5 backdrop-blur-2xl">
              <div className="w-11 h-11 rounded-xl bg-theme-gradient flex items-center justify-center shrink-0 shadow-theme">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-theme-primary bg-theme-light px-2 py-0.5 rounded">
                    🔔 Incoming Order
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {restaurant?.currency_symbol || restaurant?.currency || 'AED'} {orderToast.grand_total.toFixed(2)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1 truncate">
                  Order #{orderToast.order_number}
                </h4>
              </div>
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic('success');
                  const targetOrderId = orderToast?.id;
                  if (targetOrderId) {
                    markOrderAccepted(targetOrderId);
                    window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: targetOrderId } }));
                  } else {
                    stopOrderRinging();
                  }

                  setOrderToast(null);
                  onNavigate('table:orders');

                  if (targetOrderId) {
                    const { error } = await supabase
                      .from('orders')
                      .update({ order_status: 'preparing', updated_at: new Date().toISOString() })
                      .eq('id', targetOrderId);

                    if (error) {
                      console.error('Error updating accepted order status in Supabase:', error);
                    }
                  }
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-xl transition shrink-0 shadow-md shadow-emerald-500/30 flex items-center gap-1 native-press"
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {/* Global Live Room Service Request Toast Alert Banner */}
        {roomRequestToast && !orderToast && (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+14px)] sm:bottom-28 lg:bottom-8 right-3 sm:right-6 left-3 sm:left-auto z-50 animate-bottom-sheet max-w-sm sm:max-w-md">
            <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3.5 backdrop-blur-2xl">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black">
                <BellRing className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    🏨 Room Service Request
                  </span>
                  <span className="text-xs font-black text-amber-300">
                    Room {roomRequestToast.room_number}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-1 truncate">
                  {roomRequestToast.request_type}: {roomRequestToast.description || 'Guest assistance'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  const targetReqId = roomRequestToast?.id;
                  if (targetReqId) {
                    markRoomRequestAccepted(targetReqId);
                  }
                  stopOrderRinging();
                  setRoomRequestToast(null);
                  handleNav('operations:room_service');
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition shrink-0 shadow-md flex items-center gap-1 native-press"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Content Body with Native Mobile Pull-To-Refresh */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 pb-28 lg:pb-8 overflow-x-hidden">
          <PullToRefresh
            onRefresh={async () => {
              window.dispatchEvent(new CustomEvent('app_refresh'));
              await new Promise((r) => setTimeout(r, 600));
            }}
          >
            {children}
          </PullToRefresh>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* NATIVE MOBILE BOTTOM NAVIGATION BAR (Thumb Friendly, iOS/Android style)   */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-theme-mobile-nav backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pb-safe">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {mobilePrimaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleNav(tab.key)}
                className={`relative flex flex-col items-center justify-center h-full py-1 transition-all native-press ${
                  isActive ? 'text-theme-primary font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-theme-primary' : ''}`} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-live-pulse shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-black text-theme-primary' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-theme-primary" />
                )}
              </button>
            );
          })}

          {/* 5th Tab: More Options Bottom Sheet Trigger */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setMoreSheetOpen(true);
            }}
            className={`relative flex flex-col items-center justify-center h-full py-1 transition-all native-press ${
              active === 'table:categories' || active === 'table:restaurant_settings' || moreSheetOpen
                ? 'text-theme-primary font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 transition-transform ${moreSheetOpen ? 'scale-110' : ''}`} />
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">More</span>
            {(active === 'table:categories' || active === 'table:restaurant_settings') && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-theme-primary" />
            )}
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* NATIVE MOBILE "MORE" BOTTOM SHEET DRAWER                                 */}
      {/* ========================================================================= */}
      {moreSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-backdrop"
            onClick={() => setMoreSheetOpen(false)}
          />

          {/* Bottom Sheet Modal Body */}
          <div className="relative bg-white rounded-t-[28px] p-6 shadow-2xl border-t border-slate-200 animate-bottom-sheet max-h-[85vh] overflow-y-auto pb-safe">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={restaurant?.logo_url || '/logo.png'}
                  alt={restaurant?.name || 'Dishgaze'}
                  className="w-8 h-8 rounded-lg object-contain bg-slate-100 border border-slate-200 shadow-xs shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">More Management</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{restaurant?.name || 'Dishgaze'}</p>
                </div>
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Links Grid */}
            <div className="space-y-2">
              <button
                onClick={() => handleNav('reports')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition native-press ${
                  active === 'reports'
                    ? 'bg-theme-light border-theme-light text-theme-primary font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                    <BarChart3 className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Reports & Analytics</p>
                    <p className="text-xs text-slate-500 font-normal">Daily sales, orders & CSV export</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('operations:room_service')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition native-press ${
                  active === 'operations:room_service'
                    ? 'bg-theme-light border-theme-light text-theme-primary font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                    <BellRing className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Room Service</p>
                    <p className="text-xs text-slate-500 font-normal">Guest requests, housekeeping & room food</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('table:categories')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition native-press ${
                  active === 'table:categories'
                    ? 'bg-theme-light border-theme-light text-theme-primary font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                    <FolderTree className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Categories</p>
                    <p className="text-xs text-slate-500 font-normal">Organize menu items & food courses</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  setShowStoreQRModal(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-theme-border bg-theme-light/40 hover:bg-theme-light text-slate-800 transition native-press"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-theme-primary shadow-xs">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Restaurant Menu QR</p>
                    <p className="text-xs text-slate-500 font-normal">Fixed 1 barcode for direct digital menu</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('table:restaurant_settings')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition native-press ${
                  active === 'table:restaurant_settings'
                    ? 'bg-theme-light border-theme-light text-theme-primary font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                    <Settings className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Restaurant Settings</p>
                    <p className="text-xs text-slate-500 font-normal">Brand theme, hours, tax & currency</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('table:subscription_plans')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition native-press"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-xs">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Subscription & Billing</p>
                    <p className="text-xs text-slate-500 font-normal">{subscription?.plan_name || 'View plans'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* HEADER USER PROFILE & SIGN OUT MODAL POPOVER                             */}
      {/* ========================================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-backdrop"
            onClick={() => setProfileModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-slate-200 animate-bottom-sheet sm:animate-scale-in z-10 pb-safe sm:pb-6 mx-auto">
            {/* Grab Handle for Mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-theme-gradient flex items-center justify-center shadow-xs">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">User Account</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{restaurant?.name || 'Dishgaze POS'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 transition native-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-theme-gradient text-white font-black text-lg flex items-center justify-center shadow-theme shrink-0">
                {(user?.email ?? 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-slate-600">Active Staff Session</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2 mb-5">
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  setShowStoreQRModal(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-light/40 hover:bg-theme-light border border-theme-border text-slate-800 transition native-press"
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-theme-primary" />
                  <span className="text-xs font-bold text-slate-900">Restaurant Menu QR</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleNav('table:restaurant_settings');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition native-press"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold">Restaurant Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleNav('table:subscription_plans');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition native-press"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold">Subscription & Plan</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Prominent Sign Out Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setProfileModalOpen(false);
                signOut();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition native-press shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Dishgaze</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FIXED 1 BARCODE / RESTAURANT DIGITAL MENU QR CODE MODAL                   */}
      {/* ========================================================================= */}
      {showStoreQRModal && restaurant && (
        <RestaurantQRModal
          restaurant={restaurant}
          onClose={() => setShowStoreQRModal(false)}
        />
      )}
    </div>
  );
}