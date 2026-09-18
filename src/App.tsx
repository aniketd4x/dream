// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { initPushNotifications } from '@/lib/pushNotifications';
import { triggerHaptic } from '@/lib/haptics';
import { DashboardSkeleton } from '@/components/admin/Skeleton';

// Customer Pages
import { ScannerLandingPage } from '@/pages/customer/ScannerLandingPage';
import { QRMenuPage } from '@/pages/customer/QRMenuPage';
import { OrderStatusPage } from '@/pages/customer/OrderStatusPage';

// Admin Components & Pages
import AdminLogin from '@/pages/admin/Login';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import CrudPage from '@/components/admin/CrudPage';
import CategoryPage from '@/components/admin/CategoryPage';
import MenuItemPage from '@/components/admin/MenuItemPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import SuperAdminPage from '@/pages/admin/SuperAdminPage';

function AdminApp() {
  const { loading, restaurant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Map route pathname to AdminLayout active tab string
  const getActiveFromPath = (pathname: string): string => {
    if (pathname.includes('/admin/restaurants') || pathname.includes('/admin/super')) return 'super:restaurants';
    if (pathname.includes('/admin/categories')) return 'table:categories';
    if (pathname.includes('/admin/menu')) return 'table:menu_items';
    if (pathname.includes('/admin/tables')) return 'table:dining_tables';
    if (pathname.includes('/admin/orders')) return 'table:orders';
    if (pathname.includes('/admin/reports')) return 'reports';
    if (pathname.includes('/admin/settings')) return 'table:restaurant_settings';
    if (pathname.includes('/admin/crud/')) {
      const parts = pathname.split('/admin/crud/');
      return `table:${parts[1]}`;
    }
    return 'dashboard';
  };

  const active = getActiveFromPath(location.pathname);
  const [exitPromptVisible, setExitPromptVisible] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const exitTimerRef = useRef<any>(null);

  const handleNavigate = (newSection: string) => {
    if (newSection === 'dashboard') {
      navigate('/admin');
    } else if (newSection === 'super:restaurants') {
      navigate('/admin/restaurants');
    } else if (newSection === 'reports') {
      navigate('/admin/reports');
    } else if (newSection === 'table:categories') {
      navigate('/admin/categories');
    } else if (newSection === 'table:menu_items') {
      navigate('/admin/menu');
    } else if (newSection === 'table:dining_tables') {
      navigate('/admin/tables');
    } else if (newSection === 'table:orders') {
      navigate('/admin/orders');
    } else if (newSection === 'table:restaurant_settings') {
      navigate('/admin/settings');
    } else if (newSection.startsWith('table:')) {
      navigate(`/admin/crud/${newSection.slice(6)}`);
    } else {
      navigate('/admin');
    }
  };

  // Push Notifications for Admin
  useEffect(() => {
    if (restaurant?.id) {
      initPushNotifications(restaurant.id, handleNavigate);
    }
  }, [restaurant?.id]);

  // Hardware Back Button Handler for Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapApp.addListener('backButton', () => {
      const modalCloseButtons = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button[aria-label="Close"], button[title="Close"], .modal-close-btn, [data-modal-close="true"]'
        )
      );

      if (modalCloseButtons.length > 0) {
        const topBtn = modalCloseButtons[modalCloseButtons.length - 1];
        topBtn.click();
        triggerHaptic('light');
        return;
      }

      window.dispatchEvent(new CustomEvent('app_hardware_back'));

      if (location.pathname !== '/admin' && location.pathname !== '/admin/') {
        navigate(-1);
        triggerHaptic('light');
        return;
      }

      // Root screen: double-tap back within 2s to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        triggerHaptic('medium');
        setExitPromptVisible(true);
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          setExitPromptVisible(false);
        }, 2000);
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
      clearTimeout(exitTimerRef.current);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      'super:restaurants': 'All Restaurants (Super Admin)',
      'table:orders': 'Orders',
      reports: 'Reports & Analytics',
      'table:dining_tables': 'Dining Tables',
      'table:menu_items': 'Menu Items',
      'table:categories': 'Categories',
      'table:restaurant_settings': 'Settings',
    };
    const currentTitle =
      titles[active] ||
      (active.startsWith('table:')
        ? active.slice(6).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'Dashboard');
    const brand = restaurant?.name ? `${restaurant.name} | Dishgaze` : 'Dishgaze';
    document.title = `${currentTitle} - ${brand}`;
  }, [active, restaurant?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <>
      <AdminLayout active={active} onNavigate={handleNavigate}>
        {active === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {active === 'super:restaurants' && <SuperAdminPage />}
        {active === 'table:orders' && <CrudPage table="orders" />}
        {active === 'reports' && <ReportsPage />}
        {active === 'table:categories' && <CategoryPage />}
        {active === 'table:menu_items' && <MenuItemPage />}
        {active === 'table:dining_tables' && <CrudPage table="dining_tables" />}
        {active === 'table:restaurant_settings' && <SettingsPage />}
        {active.startsWith('table:') &&
          active !== 'table:categories' &&
          active !== 'table:menu_items' &&
          active !== 'table:dining_tables' &&
          active !== 'table:orders' &&
          active !== 'table:restaurant_settings' && (
            <CrudPage table={active.slice(6)} />
          )}
      </AdminLayout>

      {/* Double-Tap Back To Exit Toast on Android */}
      {exitPromptVisible && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+14px)] sm:bottom-28 left-1/2 -translate-x-1/2 z-[99999] bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl border border-white/20 backdrop-blur-md animate-scale-in pointer-events-none">
          Press back again to exit Dishgaze
        </div>
      )}
    </>
  );
}

function AdminGate() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (!user) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#020617' }).catch(() => {});
    } else {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-7xl mx-auto flex items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return <AdminApp />;
}

function FullScreenSplash({ onFinish }: { onFinish: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      onFinish();
      return;
    }

    SplashScreen.hide().catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#020617' }).catch(() => {});

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onFinish, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!Capacitor.isNativePlatform()) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#020617] flex items-center justify-center transition-opacity duration-400 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ width: '100vw', height: '100vh' }}
    >
      <img
        src="/splash.png"
        alt="Dishgaze"
        className="w-full h-full object-cover select-none pointer-events-none"
      />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => Capacitor.isNativePlatform());

  // On native Android app, default root to admin if user opens the APK
  const isNative = Capacitor.isNativePlatform();

  return (
    <AuthProvider>
      {showSplash && <FullScreenSplash onFinish={() => setShowSplash(false)} />}
      <Routes>
        {/* Customer Facing Routes */}
        <Route
          path="/"
          element={isNative ? <Navigate to="/admin" replace /> : <ScannerLandingPage />}
        />
        <Route path="/menu/:qrToken" element={<QRMenuPage />} />
        <Route path="/order/:orderId" element={<OrderStatusPage />} />

        {/* Restaurant Staff & Admin Portal Routes */}
        <Route path="/admin" element={<AdminGate />} />
        <Route path="/admin/*" element={<AdminGate />} />
        <Route path="/login" element={<Navigate to="/admin" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
