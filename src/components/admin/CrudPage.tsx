import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Store,
  Table2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Printer,
  Eye,
  ShoppingBag,
  DollarSign,
  Calendar,
  User,
  QrCode,
  Bell,
  ChefHat,
  UtensilsCrossed,
  Wallet,
  CreditCard,
  Smartphone,
  Minus,
  Sparkles,
  RefreshCw,
  Tag,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type TableConfig, type FieldConfig, TABLE_MAP } from '@/lib/tables';
import { useAuth } from '@/lib/auth';
import { playOrderChime, stopOrderRinging } from '@/lib/audio';
import { triggerHaptic } from '@/lib/haptics';
import OrderPrint from './OrderPrint';
import { QRCard } from './QRCard';
import { BulkQRPrintModal } from './BulkQRPrintModal';
import { RestaurantQRModal } from './RestaurantQRModal';
import {
  CrudTableSkeleton,
  OrderCardsSkeleton,
  DiningTableCardsSkeleton,
} from './Skeleton';

interface CrudPageProps {
  table: string;
}

const PAGE_SIZE = 15;

type Row = Record<string, unknown>;

export default function CrudPage({ table }: CrudPageProps) {
  const config = TABLE_MAP[table];
  const { restaurant, loading: authLoading } = useAuth();
  const currencySymbol = restaurant?.currency_symbol || restaurant?.currency || 'AED';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [fkOptions, setFkOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };
  const [printOrderId, setPrintOrderId] = useState<string | number | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Row | null>(null);
  const [settlingOrder, setSettlingOrder] = useState<Row | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Row | null>(null);
  const [showBulkQRPrint, setShowBulkQRPrint] = useState(false);
  const [showRestaurantQRModal, setShowRestaurantQRModal] = useState(false);
  const [bellNotification, setBellNotification] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed'>('all');

  // Menu items & Order creation states
  const [availableMenuItems, setAvailableMenuItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    food_type: string;
    image_url: string | null;
    category_id?: string;
    category_name?: string;
    is_available?: boolean;
  }>>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [orderCartItems, setOrderCartItems] = useState<Array<{
    menu_item_id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    food_type?: string;
    notes?: string;
  }>>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('all');
  const [customItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '', food_type: 'veg' });
  const [gstPercent, setGstPercent] = useState<number>(0);

  // Play bell notification sound using pure MP3
  const playBellSound = useCallback(() => {
    try {
      console.log('🔔 Playing live order chime sound (MP3)...');
      playOrderChime();
      setBellNotification(true);
      setTimeout(() => setBellNotification(false), 600);
    } catch (error) {
      console.error('Error playing bell sound:', error);
    }
  }, []);

  const listFields = useMemo(
    () => config.fields.filter((f) => !f.hideInList).slice(0, 7),
    [config]
  );

  const formFields = useMemo(
    () => config.fields.filter((f) => !f.hideInForm),
    [config]
  );

  const isTablePage = table === 'dining_tables';
  const isOrderPage = table === 'orders';

  const getRestaurantIdField = useCallback(() => {
    const fkField = config.fields.find(
      (f) => f.type === 'select' && f.fk?.table === 'restaurants'
    );
    return fkField?.key || 'restaurant_id';
  }, [config]);

  const generateQRToken = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = restaurant?.name 
      ? restaurant.name.substring(0, 3).toUpperCase() 
      : 'TBL';
    let token = `${prefix}-`;
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }, [restaurant]);

  const getTableQRUrl = useCallback((token: string) => {
    const baseUrl = 'https://dishgaze.com';
    return `${baseUrl}/menu/${token}`;
  }, []);

  const fetchFkOptions = useCallback(async () => {
    const fkFields = config.fields.filter((f) => f.type === 'select' && f.fk);
    const results = await Promise.all(
      fkFields.map(async (f) => {
        const fk = f.fk!;
        let query = supabase.from(fk.table).select(`${fk.valueKey}, ${fk.labelKey}`);
        
        if (fk.table === 'restaurants') {
          if (restaurant) {
            query = query.eq(fk.valueKey, restaurant.id);
          } else {
            return { key: f.key, options: [] };
          }
        } else {
          query = query.order(fk.labelKey, { ascending: true }).limit(500);
        }
        
        const { data, error } = await query;
        if (error) return { key: f.key, options: [] };
        const rows = (data ?? []) as unknown as Row[];
        return {
          key: f.key,
          options: rows.map((r) => ({
            value: String(r[fk.valueKey]),
            label: String(r[fk.labelKey] ?? '—'),
          })),
        };
      })
    );
    setFkOptions(Object.fromEntries(results.map((r) => [r.key, r.options])));
  }, [config, restaurant]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!restaurant && !authLoading) {
      setRows([]);
      setLoading(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!isSilent && rows.length === 0) {
      setLoading(true);
    }
    setError(null);
    
    let query = supabase.from(config.name).select('*', { count: 'exact' });

    const restaurantIdField = getRestaurantIdField();
    if (restaurant && restaurantIdField && config.name !== 'restaurants') {
      query = query.eq(restaurantIdField, restaurant.id);
    } else if (restaurant && config.name === 'restaurants') {
      query = query.eq('id', restaurant.id);
    }

    const orderBy = sortCol ?? config.order_by?.column ?? 'created_at';
    const ascending = sortCol ? sortAsc : (config.order_by?.ascending ?? false);
    query = query.order(orderBy, { ascending });
    query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [config, page, sortCol, sortAsc, restaurant, authLoading, getRestaurantIdField, rows.length]);

  useEffect(() => {
    if (restaurant || !authLoading) {
      fetchFkOptions();
    }
  }, [fetchFkOptions, restaurant, authLoading]);

  useEffect(() => {
    fetchData();

    const handleAppRefresh = () => fetchData(true);
    window.addEventListener('app_refresh', handleAppRefresh);
    return () => {
      window.removeEventListener('app_refresh', handleAppRefresh);
    };
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [table]);

  // Real-time & Smart background order detector (seamless background auto-refresh on new order)
  useEffect(() => {
    if (!restaurant || !isOrderPage) {
      return;
    }

    // 1. Listen for global new_order_received DOM event from AdminLayout
    const handleNewOrderEvent = () => {
      console.log('🔄 New order event detected -> Refreshing Orders page silently...');
      fetchData(true);
    };
    window.addEventListener('new_order_received', handleNewOrderEvent);

    // 2. Supabase Real-Time Channel for INSERT / UPDATE / DELETE on orders
    const channelName = `orders_channel_${restaurant.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (payload.new?.restaurant_id === restaurant.id || payload.old?.restaurant_id === restaurant.id) {
            console.log('✨ REALTIME ORDER UPDATE -> Refreshing Orders Page:', payload);
            fetchData(true);
          }
        }
      )
      .subscribe();

    // 3. Silent Smart Check (every 2.5s): checks if latest order timestamp changed
    let lastKnownTimestamp = '';
    const smartCheckInterval = setInterval(async () => {
      try {
        const { data: latest } = await supabase
          .from('orders')
          .select('id, created_at')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (latest && latest[0]) {
          const currentLatest = String(latest[0].created_at);
          if (lastKnownTimestamp && currentLatest !== lastKnownTimestamp) {
            console.log('⚡ SMART CHECK DETECTED NEW ORDER -> Refreshing Orders Page!');
            fetchData(true);
          }
          lastKnownTimestamp = currentLatest;
        }
      } catch (err) {
        console.warn('Smart check error:', err);
      }
    }, 2500);

    return () => {
      window.removeEventListener('new_order_received', handleNewOrderEvent);
      channel.unsubscribe();
      clearInterval(smartCheckInterval);
    };
  }, [restaurant, isOrderPage, fetchData]);

  // Handle Hardware Back Button Event on Android to dismiss open modals first
  useEffect(() => {
    const handleHardwareBack = () => {
      if (printOrderId) {
        setPrintOrderId(null);
      } else if (viewingOrder) {
        setViewingOrder(null);
      } else if (settlingOrder) {
        setSettlingOrder(null);
      } else if (showQRModal) {
        setShowQRModal(false);
      } else if (confirmDelete) {
        setConfirmDelete(null);
      } else if (modalOpen) {
        setModalOpen(false);
      }
    };

    window.addEventListener('app_hardware_back', handleHardwareBack);
    return () => {
      window.removeEventListener('app_hardware_back', handleHardwareBack);
    };
  }, [printOrderId, viewingOrder, settlingOrder, showQRModal, confirmDelete, modalOpen]);

  const orderPipelineCounts = useMemo(() => {
    if (!isOrderPage) return { all: 0, pending: 0, preparing: 0, ready: 0, completed: 0 };
    const counts = { all: rows.length, pending: 0, preparing: 0, ready: 0, completed: 0 };
    for (const r of rows) {
      const st = String(r.order_status || 'pending').toLowerCase();
      if (st === 'pending') counts.pending++;
      else if (st === 'preparing') counts.preparing++;
      else if (st === 'ready' || st === 'served') counts.ready++;
      else if (st === 'completed') counts.completed++;
    }
    return counts;
  }, [rows, isOrderPage]);

  const filtered = useMemo(() => {
    let list = rows;
    if (isOrderPage && orderStatusFilter !== 'all') {
      if (orderStatusFilter === 'ready') {
        list = list.filter(
          (r) =>
            String(r.order_status || '').toLowerCase() === 'ready' ||
            String(r.order_status || '').toLowerCase() === 'served'
        );
      } else {
        list = list.filter((r) => String(r.order_status || '').toLowerCase() === orderStatusFilter);
      }
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) =>
      config.fields.some((f) => {
        const v = r[f.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, search, config, isOrderPage, orderStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Generate unique memorable order number (e.g. ORD-4821)
  const generateOrderNumber = useCallback(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${rand}`;
  }, []);

  // Fetch available menu items & restaurant settings for order building
  useEffect(() => {
    if (!restaurant || !isOrderPage) return;
    const restId = restaurant.id;

    async function loadMenuAndSettings() {
      try {
        const [menuRes, catRes, settingsRes] = await Promise.all([
          supabase
            .from('menu_items')
            .select('id, name, price, food_type, image_url, category_id, is_available, categories(name)')
            .eq('restaurant_id', restId)
            .order('name', { ascending: true }),
          supabase
            .from('categories')
            .select('id, name')
            .eq('restaurant_id', restId)
            .order('name', { ascending: true }),
          supabase
            .from('restaurant_settings')
            .select('gst_percent')
            .eq('restaurant_id', restId)
            .maybeSingle(),
        ]);

        if (menuRes.data) {
          setAvailableMenuItems(
            menuRes.data.map((m: any) => ({
              id: m.id,
              name: m.name,
              price: Number(m.price || 0),
              food_type: m.food_type || 'veg',
              image_url: m.image_url,
              category_id: m.category_id,
              category_name: m.categories?.name || 'General',
              is_available: m.is_available !== false,
            }))
          );
        }

        if (catRes.data) {
          setAvailableCategories(catRes.data);
        }

        if (settingsRes.data?.gst_percent) {
          setGstPercent(Number(settingsRes.data.gst_percent));
        }
      } catch (err) {
        console.warn('Error loading menu items for order building:', err);
      }
    }

    loadMenuAndSettings();
  }, [restaurant, isOrderPage]);

  // Cart operations for Order creation & editing
  const handleAddMenuItemToOrder = (item: { id?: string; name: string; price: number; food_type: string }) => {
    triggerHaptic('selection');
    setOrderCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => (item.id ? i.menu_item_id === item.id : i.item_name === item.name));
      if (existingIdx >= 0) {
        const updated = [...prev];
        const cur = updated[existingIdx];
        const newQty = cur.quantity + 1;
        updated[existingIdx] = {
          ...cur,
          quantity: newQty,
          total_price: Number((newQty * cur.unit_price).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            menu_item_id: item.id,
            item_name: item.name,
            quantity: 1,
            unit_price: Number(item.price || 0),
            total_price: Number(item.price || 0),
            food_type: item.food_type || 'veg',
            notes: '',
          },
        ];
      }
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    triggerHaptic('light');
    setOrderCartItems((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      const newQty = cur.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...cur,
        quantity: newQty,
        total_price: Number((newQty * cur.unit_price).toFixed(2)),
      };
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    triggerHaptic('alert');
    setOrderCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemNotes = (index: number, notes: string) => {
    setOrderCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes };
      return updated;
    });
  };

  const handleAddCustomItem = () => {
    if (!customItem.name.trim()) return;
    triggerHaptic('success');
    const price = Number(customItem.price || 0);
    handleAddMenuItemToOrder({
      name: customItem.name.trim(),
      price: price,
      food_type: customItem.food_type || 'veg',
    });
    setCustomItem({ name: '', price: '', food_type: 'veg' });
    setCustomItemModalOpen(false);
  };

  // Auto-calculate Subtotal, Tax and Grand Total in Order Modal
  useEffect(() => {
    if (!isOrderPage || !modalOpen) return;

    const subtotal = Number(orderCartItems.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0).toFixed(2));
    const discount = Number(form.discount_amount || 0);
    
    let tax = Number(form.tax_amount || 0);
    // If tax_amount was auto-calculated or 0, compute via gstPercent
    if (gstPercent > 0 && (!form.tax_amount || form._autoTax)) {
      tax = Number(((subtotal * gstPercent) / 100).toFixed(2));
    }
    
    const grandTotal = Math.max(0, Number((subtotal + tax - discount).toFixed(2)));

    setForm((prev) => {
      if (prev.total_amount === subtotal && prev.grand_total === grandTotal && prev.tax_amount === tax) {
        return prev;
      }
      return {
        ...prev,
        total_amount: subtotal,
        tax_amount: tax,
        grand_total: grandTotal,
        _autoTax: true,
      };
    });
  }, [orderCartItems, form.discount_amount, isOrderPage, modalOpen, gstPercent]);

  function openCreate() {
    setEditing(null);
    const defaults: Row = {};
    for (const f of config.fields) {
      if (f.default !== undefined) defaults[f.key] = f.default;
    }
    const restaurantIdField = getRestaurantIdField();
    if (restaurant && restaurantIdField && config.name !== 'restaurants') {
      defaults[restaurantIdField] = restaurant.id;
    }
    
    if (isTablePage) {
      defaults.qr_token = generateQRToken();
    }

    if (isOrderPage) {
      defaults.order_number = generateOrderNumber();
      defaults.order_status = 'pending';
      defaults.payment_status = 'unpaid';
      defaults.payment_method = 'cash';
      defaults.order_type = 'dine_in';
      defaults.total_amount = 0;
      defaults.tax_amount = 0;
      defaults.discount_amount = 0;
      defaults.grand_total = 0;
      setOrderCartItems([]);
      setMenuSearch('');
      setSelectedMenuCategory('all');
    }
    
    setForm(defaults);
    setFormError(null);
    setModalOpen(true);
  }

  async function openEdit(row: Row) {
    setEditing(row);
    setForm({ ...row });
    setFormError(null);

    if (isOrderPage && row.id) {
      try {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, menu_item_id, item_name, quantity, unit_price, total_price, food_type, notes')
          .eq('order_id', row.id);

        if (items && items.length > 0) {
          setOrderCartItems(
            items.map((it) => ({
              menu_item_id: it.menu_item_id || undefined,
              item_name: it.item_name,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.unit_price || 0),
              total_price: Number(it.total_price || 0),
              food_type: it.food_type || 'veg',
              notes: it.notes || '',
            }))
          );
        } else {
          setOrderCartItems([]);
        }
      } catch (err) {
        console.warn('Error fetching order items for edit:', err);
        setOrderCartItems([]);
      }
      setMenuSearch('');
      setSelectedMenuCategory('all');
    }

    setModalOpen(true);
  }

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);

    try {
      if (isOrderPage) {
        if (!form.order_number || String(form.order_number).trim() === '') {
          form.order_number = generateOrderNumber();
        }
      }

      for (const f of config.fields) {
        if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
          setFormError(`"${f.label}" is required.`);
          setSaving(false);
          return;
        }
      }

      const restaurantIdField = getRestaurantIdField();
      if (restaurant && restaurantIdField && config.name !== 'restaurants') {
        if (!form[restaurantIdField] || form[restaurantIdField] === '') {
          form[restaurantIdField] = restaurant.id;
        }
      }

      if (isTablePage && !editing && !form.qr_token) {
        form.qr_token = generateQRToken();
      }

      const payload: Row = {};
      for (const f of config.fields) {
        if (form[f.key] !== undefined && form[f.key] !== null && form[f.key] !== '') {
          if (f.type === 'number') {
            payload[f.key] = Number(form[f.key]);
          } else {
            payload[f.key] = form[f.key];
          }
        } else if (form[f.key] !== undefined) {
          if (f.type === 'number') {
            payload[f.key] = f.default !== undefined ? Number(f.default) : 0;
          } else {
            payload[f.key] = null;
          }
        }
      }

      // Preserve restaurant_id explicitly
      if (restaurant && restaurantIdField && config.name !== 'restaurants') {
        payload[restaurantIdField] = restaurant.id;
      }

      if (!editing) {
        delete payload.id;
      } else {
        payload.updated_at = new Date().toISOString();
      }

      let result;
      let savedOrderId: string | number | null = null;

      if (editing) {
        result = await supabase
          .from(config.name)
          .update(payload)
          .eq('id', editing.id)
          .select();
        savedOrderId = editing.id as (string | number);
      } else {
        result = await supabase
          .from(config.name)
          .insert(payload)
          .select();
        if (result.data && result.data[0]) {
          savedOrderId = (result.data[0] as any).id;
        }
      }

      if (result.error && payload.payment_method_note !== undefined) {
        // Fallback: If payment_method_note column does not exist in remote DB, sync into notes column and retry
        payload.notes = payload.payment_method_note || payload.notes;
        delete payload.payment_method_note;
        if (editing) {
          result = await supabase
            .from(config.name)
            .update(payload)
            .eq('id', editing.id)
            .select();
          savedOrderId = editing.id as (string | number);
        } else {
          result = await supabase
            .from(config.name)
            .insert(payload)
            .select();
          if (result.data && result.data[0]) {
            savedOrderId = (result.data[0] as any).id;
          }
        }
      }

      if (result.error) {
        setFormError(result.error.message);
        setSaving(false);
        return;
      }

      // Sync child order items for order
      if (isOrderPage && savedOrderId) {
        try {
          if (editing) {
            await supabase.from('order_items').delete().eq('order_id', savedOrderId);
          }

          if (orderCartItems.length > 0) {
            const itemsToInsert = orderCartItems.map((item) => ({
              order_id: savedOrderId,
              menu_item_id: item.menu_item_id || null,
              item_name: item.item_name,
              quantity: Number(item.quantity || 1),
              unit_price: Number(item.unit_price || 0),
              total_price: Number((item.quantity * item.unit_price) || 0),
              food_type: item.food_type || 'veg',
              notes: item.notes || null,
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
            if (itemsErr) {
              console.warn('Error inserting order items:', itemsErr);
            }
          }
        } catch (itemsErr) {
          console.warn('Sync order items error:', itemsErr);
        }

        // Auto mark dining table occupied if dine-in
        if (payload.table_id && (payload.order_status === 'pending' || payload.order_status === 'preparing')) {
          await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', payload.table_id);
        }
      }

      if (isOrderPage && editing && payload.order_status && payload.order_status !== 'pending') {
        stopOrderRinging();
        window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: editing.id } }));
      }

      showSuccess(`${config.singular} ${editing ? 'updated' : 'created'} successfully`);
      setModalOpen(false);
      await fetchData(true);
    } catch (err) {
      console.error('Unexpected error during save:', err);
      setFormError('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    setDeleting(true);
    setError(null);

    try {
      console.log('🗑️ Deleting:', { table: config.name, id: row.id });

      // Clean up dependent child references first before deleting parent row
      if (config.name === 'orders') {
        // Delete associated order_items first
        const { error: itemsErr } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', row.id);
        if (itemsErr) {
          console.warn('Could not delete child order_items:', itemsErr);
        }
      } else if (config.name === 'dining_tables') {
        // Detach orders referencing this table
        await supabase
          .from('orders')
          .update({ table_id: null })
          .eq('table_id', row.id);
      } else if (config.name === 'categories') {
        // Delete child menu items cleanly
        const { data: catItems } = await supabase
          .from('menu_items')
          .select('id')
          .eq('category_id', row.id);

        if (catItems && catItems.length > 0) {
          const itemIds = catItems.map((i) => i.id);
          await supabase.from('item_variants').delete().in('menu_item_id', itemIds);
          await supabase.from('order_items').update({ menu_item_id: null }).in('menu_item_id', itemIds);
          await supabase.from('menu_items').delete().eq('category_id', row.id);
        }
      } else if (config.name === 'menu_items') {
        // Delete item_variants and detach order_items
        await supabase
          .from('item_variants')
          .delete()
          .eq('menu_item_id', row.id);
        await supabase
          .from('order_items')
          .update({ menu_item_id: null })
          .eq('menu_item_id', row.id);
      }
      
      const { error } = await supabase
        .from(config.name)
        .delete()
        .eq('id', row.id);

      if (error) {
        console.error('❌ Delete error:', { error, errorDetails: error.details });
        setError(`Delete failed: ${error.message}${error.details ? ' - ' + error.details : ''}`);
        return;
      }
      
      console.log('✅ Deleted successfully');
      
      // Remove from UI immediately
      setRows((prevRows) => prevRows.filter((r) => r.id !== row.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      
      setConfirmDelete(null);
      showSuccess(`${config.singular} deleted successfully`);
      
      // Fetch fresh data
      await fetchData(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Unexpected delete error:', err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setDeleting(false);
    }
  }

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  function openQRModal(row: Row) {
    setSelectedTableForQR(row);
    setShowQRModal(true);
  }

  function getTableStatusInfo(status: string): {
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    label: string;
  } {
    const statusMap: Record<string, any> = {
      available: {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        label: 'Available'
      },
      occupied: {
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        label: 'Occupied'
      },
      reserved: {
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
        icon: <Clock className="w-5 h-5 text-amber-500" />,
        label: 'Reserved'
      },
      cleaning: {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <AlertTriangle className="w-5 h-5 text-blue-500" />,
        label: 'Cleaning'
      }
    };
    return statusMap[status] || statusMap.available;
  }

  function getOrderStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      preparing: 'bg-blue-100 text-blue-700 border-blue-200',
      ready: 'bg-violet-100 text-violet-700 border-violet-200',
      served: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  }

  async function handleAcceptOrAdvanceOrder(row: Row) {
    const orderId = String(row.id);
    const currentStatus = String(row.order_status || 'pending');
    const paymentStatus = String(row.payment_status || 'unpaid');

    let nextStatus = 'preparing';
    if (currentStatus === 'pending') {
      nextStatus = 'preparing';
      // Stop continuous ringing when staff accepts order!
      stopOrderRinging();
      window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: orderId } }));
    } else if (currentStatus === 'preparing') {
      nextStatus = 'ready';
    } else if (currentStatus === 'ready') {
      nextStatus = 'served';
    } else if (currentStatus === 'served') {
      // If served and not paid yet, open quick 1-tap settlement modal
      if (paymentStatus !== 'paid') {
        triggerHaptic('medium');
        setSettlingOrder(row);
        return;
      }
      nextStatus = 'completed';
    } else {
      return;
    }

    const nowIso = new Date().toISOString();
    setRows((prevRows) =>
      prevRows.map((r) => (String(r.id) === orderId ? { ...r, order_status: nextStatus, updated_at: nowIso } : r))
    );
    triggerHaptic('success');

    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus, updated_at: nowIso })
      .eq('id', row.id);

    if (error) {
      console.error('Error updating order status:', error);
      fetchData(true);
    }
  }

  // Quick 1-Tap Settle & Complete Handler
  async function handleSettleAndComplete(row: Row, payMethod: string, payStatus: string = 'paid', note?: string) {
    const orderId = String(row.id);
    const nowIso = new Date().toISOString();

    setRows((prevRows) =>
      prevRows.map((r) =>
        String(r.id) === orderId
          ? {
              ...r,
              order_status: 'completed',
              payment_status: payStatus,
              payment_method: payMethod,
              payment_method_note: note ?? r.payment_method_note,
              notes: note ?? r.notes,
              updated_at: nowIso,
            }
          : r
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

    let { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', row.id);

    if (error && note !== undefined) {
      delete updatePayload.payment_method_note;
      const retry = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', row.id);
      error = retry.error;
    }

    if (error) {
      console.error('Error settling and completing order:', error);
      fetchData(true);
    }
  }

  async function handleUpdateOrderStatus(row: Row, newStatus: string) {
    const orderId = String(row.id);
    if (newStatus !== 'pending') {
      stopOrderRinging();
      window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: orderId } }));
    }
    const nowIso = new Date().toISOString();
    setRows((prevRows) =>
      prevRows.map((r) => (String(r.id) === orderId ? { ...r, order_status: newStatus, updated_at: nowIso } : r))
    );
    triggerHaptic('selection');
    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus, updated_at: nowIso })
      .eq('id', row.id);
    if (error) {
      console.error('Error updating order status:', error);
      fetchData(true);
    }
  }

  async function handleUpdatePaymentStatus(row: Row, newPaymentStatus: string) {
    const orderId = String(row.id);
    const nowIso = new Date().toISOString();
    setRows((prevRows) =>
      prevRows.map((r) => (String(r.id) === orderId ? { ...r, payment_status: newPaymentStatus, updated_at: nowIso } : r))
    );
    triggerHaptic('selection');
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: newPaymentStatus, updated_at: nowIso })
      .eq('id', row.id);
    if (error) {
      console.error('Error updating payment status:', error);
      fetchData(true);
    }
  }

  async function handleUpdatePaymentMethod(row: Row, newMethod: string, newNote?: string) {
    const orderId = String(row.id);
    let noteToSave = newNote;
    if (newMethod === 'other' && noteToSave === undefined) {
      const promptVal = window.prompt('Enter payment method note/reference (e.g. Voucher, Cheque #, Split):', String(row.payment_method_note || row.notes || ''));
      if (promptVal !== null) {
        noteToSave = promptVal.trim();
      }
    }

    const nowIso = new Date().toISOString();
    setRows((prevRows) =>
      prevRows.map((r) =>
        String(r.id) === orderId
          ? {
              ...r,
              payment_method: newMethod,
              ...(noteToSave !== undefined ? { payment_method_note: noteToSave, notes: noteToSave } : {}),
              updated_at: nowIso,
            }
          : r
      )
    );
    triggerHaptic('selection');

    const updatePayload: Record<string, any> = {
      payment_method: newMethod,
      updated_at: nowIso,
    };
    if (noteToSave !== undefined) {
      updatePayload.payment_method_note = noteToSave || null;
      updatePayload.notes = noteToSave || null;
    }

    let { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', row.id);

    if (error && noteToSave !== undefined) {
      delete updatePayload.payment_method_note;
      const retry = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', row.id);
      error = retry.error;
    }

    if (error) {
      console.error('Error updating payment method:', error);
      fetchData(true);
    }
  }

  function getPaymentStatusColor(status: string): string {
    const map: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
      partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
      refunded: 'bg-slate-100 text-slate-700 border-slate-300',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      failed: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  }

  // QR Modal Component
  function QRModal({ 
    table: tableData, 
    onClose 
  }: { 
    table: Row; 
    onClose: () => void;
  }) {
    const tableNumber = String(tableData.table_number || 'N/A');
    const tableName = String(tableData.table_name || '');
    const qrToken = String(tableData.qr_token || '');
    const hasQR = qrToken && qrToken !== '';

    const qrValue = hasQR ? getTableQRUrl(qrToken) : '';

    if (!hasQR) {
      return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-md p-6 animate-bottom-sheet sm:animate-none pb-safe sm:pb-6">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Generate QR Code</h3>
              <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Generate a unique QR code for Table {tableNumber} {tableName && `(${tableName})`} to allow customers to order directly from their phone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition native-press"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  triggerHaptic('success');
                  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
                  await supabase
                    .from('dining_tables')
                    .update({ qr_token: token })
                    .eq('id', tableData.id);
                  onClose();
                  fetchData();
                }}
                className="px-4 py-2.5 text-sm font-bold btn-theme-primary text-white rounded-xl transition flex items-center gap-2 native-press shadow-theme"
              >
                <QrCode className="w-4 h-4" />
                Generate QR Code
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-backdrop overflow-y-auto">
        <QRCard
          tableNumber={tableNumber}
          tableName={tableName}
          restaurantName={restaurant?.name || 'Smart Restaurant'}
          logoUrl={restaurant?.logo_url}
          qrValue={qrValue}
          onClose={onClose}
        />
      </div>
    );
  }

  // Render order cards
  // Render order cards
  function renderOrderCards() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((row) => {
          const orderNumber = String(row.order_number || 'N/A');
          const customerName = String(row.customer_name || 'Walk-in');
          const tableNumber = String(row.table_number || 'N/A');
          const total = Number(row.grand_total || 0);
          const status = String(row.order_status || 'pending');
          const paymentStatus = String(row.payment_status || 'unpaid');
          const paymentMethod = String(row.payment_method || 'cash');
          const orderType = String(row.order_type || 'dine_in');
          const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();

          return (
            <div
              key={String(row.id)}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-theme-light text-theme-primary">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        #{orderNumber}
                      </h4>
                      <p className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}, {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${getOrderStatusColor(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3 text-slate-400" />
                      Guest
                    </span>
                    <span className="font-semibold text-slate-800 text-[11.5px]">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <Table2 className="w-3 h-3 text-slate-400" />
                      Table
                    </span>
                    <span className="font-bold text-slate-800 text-[11.5px]">{tableNumber}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      Grand Total
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {currencySymbol} {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP-BY-STEP PROGRESS & SINGLE ACTION BUTTON (COMPACT & SLEEK) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* 4-Step Compact Pipeline Stepper */}
                <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-center">
                  <div className={`py-1 px-0.5 rounded-md transition-all ${
                    status === 'pending'
                      ? 'bg-amber-100 text-amber-900 font-black ring-1 ring-amber-400 shadow-2xs'
                      : status !== 'pending' && status !== 'cancelled'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    1. Pending
                  </div>
                  <div className={`py-1 px-0.5 rounded-md transition-all ${
                    status === 'preparing'
                      ? 'bg-blue-100 text-blue-900 font-black ring-1 ring-blue-400 shadow-2xs'
                      : ['ready', 'served', 'completed'].includes(status)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    2. Kitchen
                  </div>
                  <div className={`py-1 px-0.5 rounded-md transition-all ${
                    status === 'ready' || status === 'served'
                      ? 'bg-purple-100 text-purple-900 font-black ring-1 ring-purple-400 shadow-2xs'
                      : status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    3. {status === 'served' ? 'Served' : 'Ready'}
                  </div>
                  <div className={`py-1 px-0.5 rounded-md transition-all ${
                    status === 'completed'
                      ? 'bg-emerald-100 text-emerald-900 font-black ring-1 ring-emerald-400 shadow-2xs'
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    4. Settled
                  </div>
                </div>

                {/* SINGLE STEP-BY-STEP SMART ACTION BUTTON */}
                {status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrAdvanceOrder(row)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all native-press"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Accept Order ➔ Start Prep</span>
                  </button>
                ) : status === 'preparing' ? (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrAdvanceOrder(row)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all native-press"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Food Prepared ➔ Mark Ready</span>
                  </button>
                ) : status === 'ready' ? (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrAdvanceOrder(row)}
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/20 transition-all native-press"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Food Ready ➔ Mark Served</span>
                  </button>
                ) : status === 'served' ? (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrAdvanceOrder(row)}
                    className={`w-full text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all native-press ${
                      paymentStatus === 'paid'
                        ? 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20'
                    }`}
                  >
                    {paymentStatus === 'paid' ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Complete Order (Paid ✅)</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Collect Payment & Complete ➔</span>
                      </>
                    )}
                  </button>
                ) : status === 'completed' ? (
                  <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Order Completed
                    </span>
                    <span className="text-[9.5px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full capitalize">
                      {paymentStatus === 'paid' ? `Paid (${paymentMethod})` : paymentStatus}
                    </span>
                  </div>
                ) : (
                  <div className="w-full bg-red-50 border border-red-200 text-red-700 font-semibold py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Order Cancelled
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setViewingOrder(row)}
                  className="flex-1 py-1 px-2 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1 native-press border border-blue-100"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                <button
                  onClick={() => setPrintOrderId(row.id as string)}
                  className="flex-1 py-1 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition flex items-center justify-center gap-1 native-press border border-emerald-100"
                >
                  <Printer className="w-3 h-3" />
                  Bill
                </button>
                <button
                  onClick={() => openEdit(row)}
                  className="flex-1 py-1 px-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition flex items-center justify-center gap-1 native-press border border-slate-200"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(row)}
                  className="py-1 px-2 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center native-press border border-red-100"
                  title="Delete Order"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render card view for tables
  function renderTableCards() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {filtered.map((row) => {
          const status = String(row.status || 'available');
          const statusInfo = getTableStatusInfo(status);
          const tableNumber = row.table_number != null && row.table_number !== '' ? String(row.table_number) : 'N/A';
          const tableName = row.table_name != null && row.table_name !== '' ? String(row.table_name) : '';
          const capacity = Number(row.capacity ?? 0);
          const isActive = row.is_active !== false;
          const hasQR = row.qr_token != null && row.qr_token !== '';

          return (
            <div
              key={String(row.id)}
              className={`relative bg-white rounded-2xl border-2 p-3 sm:p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between ${
                isActive ? statusInfo.bgColor : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2 pt-0.5 gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white shadow-2xs' : 'bg-slate-200'}`}>
                      <Table2 className={`w-4 h-4 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                        {tableNumber}
                      </h4>
                      {tableName && (
                        <p className="text-[10px] text-slate-500 truncate">{tableName}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive ? statusInfo.color : 'text-slate-400'
                  } bg-white border ${isActive ? 'border-slate-200' : 'border-slate-200'}`}>
                    {statusInfo.icon}
                    <span className="truncate">{isActive ? statusInfo.label : 'Inactive'}</span>
                  </span>
                </div>

                <div className="space-y-1 my-2">
                  <div className="flex items-center justify-between text-[11px] sm:text-xs">
                    <span className="text-slate-500">Seats</span>
                    <span className="font-bold text-slate-800 flex items-center gap-0.5">
                      <Users className="w-3 h-3 text-slate-400" />
                      {capacity}
                    </span>
                  </div>
                  
                  {hasQR && (
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className="text-slate-500">QR</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200/60">
                {isActive && hasQR && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      openQRModal(row);
                    }}
                    className="flex-1 px-2 py-1.5 text-[10px] sm:text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg transition flex items-center justify-center gap-0.5 border border-purple-200/60 native-press"
                    title="View QR Code"
                  >
                    <QrCode className="w-3 h-3 shrink-0" />
                    <span>QR</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    openEdit(row);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] sm:text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200 native-press"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('alert');
                    setConfirmDelete(row);
                  }}
                  className="p-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition border border-slate-200 native-press"
                  title="Delete Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render table view
  function renderTableView() {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              {listFields.map((f) => (
                <th
                  key={f.key}
                  className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap"
                >
                  <button
                    onClick={() => toggleSort(f.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    {f.label}
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={listFields.length + 1} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={listFields.length + 1} className="px-4 py-12 text-center text-slate-400">
                  No {config.label.toLowerCase()} found.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((row) => (
                <tr key={String(row.id)} className="hover:bg-slate-50/70 transition">
                  {listFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-700 align-middle">
                      <CellContent field={f} value={row[f.key]} fkOptions={fkOptions[f.key]} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {isTablePage && Boolean(row.qr_token) && (
                        <button
                          onClick={() => openQRModal(row)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-purple-100 hover:text-purple-600 transition"
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      {isOrderPage && (
                        <>
                          <button
                            onClick={() => setViewingOrder(row)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition"
                            title="View Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintOrderId(row.id as string)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition"
                            title="Print Order"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(row)}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  // View Order Modal
  function ViewOrderModal({ order, onClose }: { order: Row; onClose: () => void }) {
    const [orderDetails, setOrderDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchOrderDetails() {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              order_number,
              customer_name,
              customer_mobile,
              table_number,
              order_type,
              order_status,
              payment_status,
              payment_method,
              total_amount,
              tax_amount,
              discount_amount,
              grand_total,
              notes,
              created_at,
              restaurant:restaurant_id (
                name,
                address,
                city
              ),
              order_items (
                item_name,
                quantity,
                unit_price,
                total_price,
                food_type,
                notes
              )
            `)
            .eq('id', order.id)
            .single();

          if (error) throw error;
          setOrderDetails(data);
        } catch (err) {
          console.error('Error fetching order details:', err);
        } finally {
          setLoading(false);
        }
      }

      fetchOrderDetails();
    }, [order.id]);

    if (loading) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-2xl p-8">
            <Loader2 className="w-8 h-8 animate-spin text-theme-primary mx-auto" />
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
        <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-bottom-sheet sm:animate-none pb-safe sm:pb-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Order #{orderDetails?.order_number || 'N/A'}
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  openEdit(order);
                }}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition native-press"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('alert');
                  onClose();
                  setConfirmDelete(order);
                }}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition native-press"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  setPrintOrderId(order.id as string);
                }}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition native-press shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <p className="text-xs text-slate-500">Order Number</p>
                  <p className="font-semibold text-slate-800">#{orderDetails?.order_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-semibold text-slate-800">
                    {orderDetails?.created_at ? new Date(orderDetails.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-800">{orderDetails?.customer_name || 'Walk-in'}</p>
                </div>
                {orderDetails?.customer_mobile && (
                  <div>
                    <p className="text-xs text-slate-500">Mobile</p>
                    <p className="font-semibold text-slate-800">{orderDetails.customer_mobile}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Table</p>
                  <p className="font-semibold text-slate-800">{orderDetails?.table_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="font-semibold text-slate-800 capitalize">{orderDetails?.order_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Order Status</p>
                  <select
                    value={orderDetails?.order_status || 'pending'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      setOrderDetails((prev: any) => ({ ...prev, order_status: newStatus }));
                      if (newStatus !== 'pending') {
                        stopOrderRinging();
                        window.dispatchEvent(new CustomEvent('order_accepted', { detail: { id: order.id } }));
                      }
                      await supabase.from('orders').update({ order_status: newStatus, updated_at: new Date().toISOString() }).eq('id', order.id);
                      fetchData(true);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                  <select
                    value={orderDetails?.payment_status || 'unpaid'}
                    onChange={async (e) => {
                      const newPaymentStatus = e.target.value;
                      setOrderDetails((prev: any) => ({ ...prev, payment_status: newPaymentStatus }));
                      await supabase.from('orders').update({ payment_status: newPaymentStatus, updated_at: new Date().toISOString() }).eq('id', order.id);
                      fetchData(true);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary w-full"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="refunded">Refunded</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                  <select
                    value={orderDetails?.payment_method || 'cash'}
                    onChange={async (e) => {
                      const newMethod = e.target.value;
                      setOrderDetails((prev: any) => ({ ...prev, payment_method: newMethod }));
                      await supabase.from('orders').update({ payment_method: newMethod, updated_at: new Date().toISOString() }).eq('id', order.id);
                      fetchData(true);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary w-full capitalize"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {orderDetails?.payment_method === 'other' && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-slate-500 mb-1">Payment Method Note / Reference</p>
                    <input
                      type="text"
                      value={orderDetails?.payment_method_note ?? orderDetails?.notes ?? ''}
                      placeholder="e.g. Sodexo / Voucher #123 / Split payment"
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderDetails((prev: any) => ({ ...prev, payment_method_note: val, notes: val }));
                      }}
                      onBlur={async (e) => {
                        const val = e.target.value.trim() || null;
                        const updatePayload: Record<string, any> = {
                          payment_method_note: val,
                          notes: val,
                          updated_at: new Date().toISOString(),
                        };
                        let { error } = await supabase
                          .from('orders')
                          .update(updatePayload)
                          .eq('id', order.id);

                        if (error) {
                          delete updatePayload.payment_method_note;
                          await supabase
                            .from('orders')
                            .update(updatePayload)
                            .eq('id', order.id);
                        }
                        fetchData(true);
                      }}
                      className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary w-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Order Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-600">Item</th>
                        <th className="px-4 py-2 text-center text-slate-600">Qty</th>
                        <th className="px-4 py-2 text-right text-slate-600">Unit Price</th>
                        <th className="px-4 py-2 text-right text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetails?.order_items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-slate-700">
                            {item.item_name}
                            {item.food_type && (
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                item.food_type === 'veg' ? 'bg-green-100 text-green-700' :
                                item.food_type === 'non_veg' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {item.food_type}
                              </span>
                            )}
                            {item.notes && (
                              <p className="text-xs text-slate-400">{item.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-700">{currencySymbol} {item.unit_price?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">{currencySymbol} {item.total_price?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-600">Subtotal</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">{currencySymbol} {orderDetails?.total_amount?.toFixed(2) || '0.00'}</td>
                      </tr>
                      {orderDetails?.tax_amount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Tax</td>
                          <td className="px-4 py-2 text-right text-slate-700">{currencySymbol} {orderDetails.tax_amount?.toFixed(2)}</td>
                        </tr>
                      )}
                      {orderDetails?.discount_amount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Discount</td>
                          <td className="px-4 py-2 text-right text-red-600">-{currencySymbol} {orderDetails.discount_amount?.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t">
                        <td colSpan={3} className="px-4 py-2 text-right font-bold text-slate-800">Grand Total</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800 text-lg">{currencySymbol} {orderDetails?.grand_total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {orderDetails?.notes && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-sm text-slate-700">{orderDetails.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-700">No Restaurant Found</h3>
        <p className="text-sm text-slate-500 mt-1">
          Your account is not associated with any restaurant. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Interactive Live Order Pipeline Stages Bar (When viewing Orders) */}
      {isOrderPage && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-theme-primary animate-ping" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Order Pipeline Stages
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Tap stage to filter
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
            {[
              { id: 'all', label: 'All Orders', count: orderPipelineCounts.all, desc: 'Total', activeBg: 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400' },
              { id: 'pending', label: '1. Pending', count: orderPipelineCounts.pending, desc: 'Needs Accept', activeBg: 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400' },
              { id: 'preparing', label: '2. Kitchen', count: orderPipelineCounts.preparing, desc: 'In Prep', activeBg: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400' },
              { id: 'ready', label: '3. Ready', count: orderPipelineCounts.ready, desc: 'Ready / Served', activeBg: 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400' },
              { id: 'completed', label: '4. Done', count: orderPipelineCounts.completed, desc: 'Settled', activeBg: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400' },
            ].map((st) => {
              const isCurrent = orderStatusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setOrderStatusFilter((prev) => (prev === st.id ? 'all' : (st.id as any)));
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl text-left transition-all duration-200 native-press border relative overflow-hidden cursor-pointer ${
                    isCurrent
                      ? `${st.activeBg} shadow-sm scale-[1.01]`
                      : 'bg-slate-50 border-slate-200/90 hover:bg-slate-100/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] sm:text-[10.5px] font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-600'}`}>
                      {st.label}
                    </span>
                    {st.id === 'pending' && st.count > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <p className="text-base sm:text-lg font-black leading-none">
                      {st.count}
                    </p>
                    <p className={`text-[9px] font-semibold ${isCurrent ? 'opacity-90' : 'text-slate-400'}`}>
                      {st.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}…`}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
            />
          </div>
          {(isTablePage || isOrderPage) && (
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Table
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isTablePage && (
            <>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowRestaurantQRModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-theme-light border border-theme-border text-theme-primary hover:brightness-95 text-sm font-bold shadow-xs transition native-press"
                title="View & Print fixed 1 barcode for direct restaurant menu"
              >
                <QrCode className="w-4 h-4 text-theme-primary" />
                <span>Restaurant Main QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowBulkQRPrint(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold shadow-xs transition native-press"
                title="Print QR codes for all tables"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Table QRs</span>
              </button>
            </>
          )}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 btn-theme-primary font-bold text-sm rounded-lg px-4 py-2 shadow-theme transition native-press"
          >
            <Plus className="w-4 h-4" />
            Add {config.singular}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        isOrderPage && viewMode === 'cards' ? (
          <OrderCardsSkeleton count={6} />
        ) : isTablePage && viewMode === 'cards' ? (
          <DiningTableCardsSkeleton count={8} />
        ) : (
          <CrudTableSkeleton rows={8} />
        )
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Table2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No {config.label.toLowerCase()} found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Get started by adding your first {config.singular.toLowerCase()}.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 btn-theme-primary font-bold text-sm rounded-lg px-4 py-2 shadow-theme transition"
          >
            <Plus className="w-4 h-4" />
            Add {config.singular}
          </button>
        </div>
      ) : (
        <>
          {((isTablePage && viewMode === 'cards') || (isOrderPage && viewMode === 'cards')) 
            ? (isOrderPage ? renderOrderCards() : renderTableCards()) 
            : renderTableView()}
          
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
              <span>
                {totalCount} total · page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className={`bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full ${isOrderPage ? 'max-w-4xl' : 'max-w-2xl'} max-h-[94vh] sm:max-h-[92vh] flex flex-col animate-bottom-sheet sm:animate-none pb-safe sm:pb-0`}>
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                  {isOrderPage ? <ShoppingBag className="w-5 h-5" /> : <Table2 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {editing ? `Edit ${config.singular}` : `Create New ${config.singular}`}
                  </h2>
                  {isOrderPage && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-theme-primary bg-theme-light px-2 py-0.5 rounded">
                        #{String(form.order_number || 'ORD-AUTO')}
                      </span>
                      {!editing && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            const newNum = generateOrderNumber();
                            updateField('order_number', newNum);
                          }}
                          className="text-[11px] font-semibold text-slate-500 hover:text-theme-primary flex items-center gap-1 transition"
                          title="Generate new random order number"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Roll New #</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => { triggerHaptic('light'); setModalOpen(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* DEDICATED POS ORDER BUILDER WITH MENU SELECTOR & AUTO TOTALS */}
              {isOrderPage ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Menu Items Catalog & Selector */}
                  <div className="lg:col-span-7 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-theme-primary" />
                        Select Menu Items
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setCustomItemModalOpen(true);
                        }}
                        className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Custom Item</span>
                      </button>
                    </div>

                    {/* Menu Search Bar & Category Filter Tabs */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={menuSearch}
                          onChange={(e) => setMenuSearch(e.target.value)}
                          placeholder="Search menu items or drinks..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                        />
                        {menuSearch && (
                          <button
                            type="button"
                            onClick={() => setMenuSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Pills */}
                      {availableCategories.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setSelectedMenuCategory('all')}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition native-press ${
                              selectedMenuCategory === 'all'
                                ? 'bg-theme-primary text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            All ({availableMenuItems.length})
                          </button>
                          {availableCategories.map((cat) => {
                            const count = availableMenuItems.filter((m) => m.category_id === cat.id).length;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedMenuCategory(cat.id)}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition native-press ${
                                  selectedMenuCategory === cat.id
                                    ? 'bg-theme-primary text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {cat.name} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Menu Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] sm:max-h-[360px] overflow-y-auto pr-1">
                      {availableMenuItems
                        .filter((m) => {
                          if (selectedMenuCategory !== 'all' && m.category_id !== selectedMenuCategory) return false;
                          if (menuSearch.trim()) {
                            const q = menuSearch.toLowerCase();
                            return m.name.toLowerCase().includes(q) || (m.category_name && m.category_name.toLowerCase().includes(q));
                          }
                          return true;
                        })
                        .map((item) => {
                          const inCart = orderCartItems.find((i) => i.menu_item_id === item.id);
                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                                inCart
                                  ? 'bg-theme-light/40 border-theme-primary/40 shadow-2xs'
                                  : 'bg-white hover:bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      item.food_type === 'veg'
                                        ? 'bg-emerald-500'
                                        : item.food_type === 'non_veg'
                                        ? 'bg-red-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-bold text-theme-primary">
                                    {currencySymbol} {item.price.toFixed(2)}
                                  </span>
                                  {item.category_name && (
                                    <span className="text-[10px] text-slate-400 truncate">
                                      • {item.category_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddMenuItemToOrder(item)}
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition shrink-0 native-press ${
                                  inCart
                                    ? 'bg-theme-primary text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{inCart ? `Add (${inCart.quantity})` : 'Add'}</span>
                              </button>
                            </div>
                          );
                        })}

                      {availableMenuItems.length === 0 && (
                        <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">No Menu Items Found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Add items from the Menu Items tab or use "Custom Item" above.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Order Configuration, Cart & Totals */}
                  <div className="lg:col-span-5 bg-slate-50/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 space-y-4">
                    {/* Order Controls (Order Type & Dining Table) */}
                    <div className="space-y-2.5 pb-3 border-b border-slate-200/80">
                      {/* Order Type Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Order Type
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'dine_in', label: 'Dine In' },
                            { id: 'takeaway', label: 'Takeaway' },
                            { id: 'delivery', label: 'Delivery' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                updateField('order_type', t.id);
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold transition native-press border ${
                                form.order_type === t.id
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dining Table Picker */}
                      {form.order_type === 'dine_in' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Dining Table
                          </label>
                          <select
                            value={String(form.table_id || '')}
                            onChange={(e) => {
                              const tblId = e.target.value;
                              const matched = (fkOptions['table_id'] || []).find((t) => t.value === tblId);
                              updateField('table_id', tblId || null);
                              updateField('table_number', matched ? matched.label : '');
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                          >
                            <option value="">— Select Table (Optional) —</option>
                            {(fkOptions['table_id'] || []).map((t) => (
                              <option key={t.value} value={t.value}>
                                Table {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Customer Name & Mobile */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={String(form.customer_name || '')}
                            onChange={(e) => updateField('customer_name', e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-theme-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            Mobile
                          </label>
                          <input
                            type="tel"
                            value={String(form.customer_mobile || '')}
                            onChange={(e) => updateField('customer_mobile', e.target.value)}
                            placeholder="e.g. +91 98765..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-theme-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected Order Items Cart List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Order Cart ({orderCartItems.reduce((acc, it) => acc + it.quantity, 0)} items)
                        </span>
                        {orderCartItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('alert');
                              setOrderCartItems([]);
                            }}
                            className="text-[10px] text-red-600 hover:underline font-bold"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {orderCartItems.map((item, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      item.food_type === 'veg'
                                        ? 'bg-emerald-500'
                                        : item.food_type === 'non_veg'
                                        ? 'bg-red-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  <p className="text-xs font-bold text-slate-900 truncate">{item.item_name}</p>
                                </div>
                                <p className="text-[10px] font-semibold text-slate-400">
                                  {currencySymbol} {item.unit_price.toFixed(2)} each
                                </p>
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, -1)}
                                  className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shadow-xs"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, 1)}
                                  className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shadow-xs"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="text-xs font-black text-slate-900 w-16 text-right">
                                {currencySymbol} {item.total_price.toFixed(2)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(idx)}
                                className="p-1 text-slate-300 hover:text-red-600 rounded-lg transition"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Item special notes */}
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                              placeholder="Notes (e.g. extra spicy, no ice)..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white"
                            />
                          </div>
                        ))}

                        {orderCartItems.length === 0 && (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-white/60">
                            <p className="text-xs text-slate-500 font-medium">Cart is empty.</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Click on menu items to add them.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary & Auto Calculations */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold">{currencySymbol} {Number(form.total_amount || 0).toFixed(2)}</span>
                      </div>
                      
                      {/* Tax & Discount Inputs */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Tax / GST:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.tax_amount === undefined || form.tax_amount === null ? '' : (form.tax_amount as number)}
                            onChange={(e) => {
                              updateField('_autoTax', false);
                              updateField('tax_amount', e.target.value === '' ? 0 : Number(e.target.value));
                            }}
                            className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-right font-semibold text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Discount:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.discount_amount === undefined || form.discount_amount === null ? '' : (form.discount_amount as number)}
                            onChange={(e) => updateField('discount_amount', e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-right font-semibold text-xs text-red-600"
                          />
                        </div>
                      </div>

                      {/* Grand Total */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                        <span className="text-slate-900">Grand Total</span>
                        <span className="text-theme-primary font-black text-base">
                          {currencySymbol} {Number(form.grand_total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status & Payment Settings */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Order Status
                        </label>
                        <select
                          value={String(form.order_status || 'pending')}
                          onChange={(e) => updateField('order_status', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="served">Served</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Payment Status
                        </label>
                        <select
                          value={String(form.payment_status || 'unpaid')}
                          onChange={(e) => updateField('payment_status', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                          <option value="partially_paid">Partially Paid</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Payment Method
                        </label>
                        <select
                          value={String(form.payment_method || 'cash')}
                          onChange={(e) => updateField('payment_method', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none capitalize"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card / POS</option>
                          <option value="upi">UPI / QR</option>
                          <option value="online">Online</option>
                          <option value="other">Other / Custom</option>
                        </select>
                      </div>

                      {form.payment_method === 'other' && (
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={String(form.payment_method_note || '')}
                            onChange={(e) => updateField('payment_method_note', e.target.value)}
                            placeholder="Payment reference (e.g. Voucher, Cheque #)..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* GENERIC FORM FOR ALL OTHER TABLES (Dining Tables, Categories, etc.) */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formFields.map((f) => {
                      const restaurantIdField = getRestaurantIdField();
                      if (f.key === restaurantIdField && config.name !== 'restaurants') {
                        return null;
                      }
                      if (f.key === 'qr_token' && isTablePage) {
                        return null;
                      }
                      if (f.key === 'payment_method_note' && form.payment_method !== 'other') {
                        return null;
                      }
                      return (
                        <FieldInput
                          key={f.key}
                          field={f}
                          value={form[f.key]}
                          onChange={(v) => updateField(f.key, v)}
                          fkOptions={fkOptions[f.key]}
                          fullWidth={f.type === 'textarea'}
                        />
                      );
                    })}
                  </div>
                  {isTablePage && !editing && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs text-blue-700 flex items-center gap-2 font-medium">
                        <QrCode className="w-4 h-4" />
                        A unique QR code will be automatically generated for this table.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); setModalOpen(false); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition native-press"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-3">
                {isOrderPage && (
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block">Total</span>
                    <span className="text-sm font-black text-slate-900">
                      {currencySymbol} {Number(form.grand_total || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('success');
                    handleSave();
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-2 btn-theme-primary disabled:opacity-60 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition shadow-theme native-press"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : editing ? 'Save Changes' : isOrderPage ? 'Create Order' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TO ADD CUSTOM AD-HOC ITEM TO ORDER */}
      {customItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-theme-primary" />
                Add Custom Item to Order
              </h3>
              <button
                type="button"
                onClick={() => setCustomItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customItem.name}
                  onChange={(e) => setCustomItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Special Chef Salad"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customItem.price}
                    onChange={(e) => setCustomItem((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Food Type
                  </label>
                  <select
                    value={customItem.food_type}
                    onChange={(e) => setCustomItem((p) => ({ ...p, food_type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  >
                    <option value="veg">Veg</option>
                    <option value="non_veg">Non-Veg</option>
                    <option value="egg">Egg</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomItemModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customItem.name.trim()}
                className="px-4 py-2 text-xs font-bold text-white btn-theme-primary disabled:opacity-50 rounded-xl shadow-xs"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-bottom-sheet sm:animate-none pb-safe sm:pb-6">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Delete {config.singular}?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              This action cannot be undone. The record will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { triggerHaptic('light'); setConfirmDelete(null); }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 native-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerHaptic('alert');
                  handleDelete(confirmDelete);
                }}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 native-press shadow-sm"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQRModal && selectedTableForQR && (
        <QRModal
          table={selectedTableForQR}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTableForQR(null);
          }}
        />
      )}

      {showBulkQRPrint && isTablePage && (
        <BulkQRPrintModal
          tables={rows as any}
          restaurantName={restaurant?.name || 'Smart Restaurant'}
          logoUrl={restaurant?.logo_url}
          getTableQRUrl={getTableQRUrl}
          onClose={() => setShowBulkQRPrint(false)}
        />
      )}

      {showRestaurantQRModal && restaurant && (
        <RestaurantQRModal
          restaurant={restaurant}
          onClose={() => setShowRestaurantQRModal(false)}
        />
      )}

      {viewingOrder && (
        <ViewOrderModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}

      {/* QUICK 1-TAP SETTLE & COMPLETE MODAL */}
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
                    Step 4: Collect Payment & Settle
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order #{String(settlingOrder.order_number || '')} • Table {String(settlingOrder.table_number || 'Walk-in')}
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

            <p className="text-xs font-bold text-slate-700 mb-3">Choose Payment Method to Complete Order:</p>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <button
                type="button"
                onClick={() => handleSettleAndComplete(settlingOrder, 'cash', 'paid')}
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
                onClick={() => handleSettleAndComplete(settlingOrder, 'upi', 'paid')}
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
                onClick={() => handleSettleAndComplete(settlingOrder, 'card', 'paid')}
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
                  const note = window.prompt('Enter payment note / reference (e.g. Voucher, Cheque #):');
                  if (note !== null) {
                    handleSettleAndComplete(settlingOrder, 'other', 'paid', note.trim());
                  }
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm transition native-press"
              >
                <Wallet className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Other / Note</p>
                  <span className="text-[10px] text-amber-700 font-medium">Custom Method</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSettleAndComplete(settlingOrder, String(settlingOrder.payment_method || 'cash'), 'unpaid')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
            >
              Keep Unpaid & Mark Complete
            </button>
          </div>
        </div>
      )}

      {printOrderId && (
        <OrderPrint
          orderId={printOrderId}
          onClose={() => setPrintOrderId(null)}
        />
      )}
    </div>
  );
}

// Helper components
function CellContent({
  field,
  value,
  fkOptions,
}: {
  field: FieldConfig;
  value: unknown;
  fkOptions?: { value: string; label: string }[];
}) {
  if (value == null || value === '') return <span className="text-slate-300">—</span>;

  if (field.type === 'boolean') {
    return value ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> No
      </span>
    );
  }

  if (field.key === 'status' && value) {
    const statusMap: Record<string, { color: string; bgColor: string }> = {
      available: { color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
      occupied: { color: 'text-red-700', bgColor: 'bg-red-50' },
      reserved: { color: 'text-amber-700', bgColor: 'bg-amber-50' },
      cleaning: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
    };
    const style = statusMap[String(value)] || statusMap.available;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.color} ${style.bgColor} border rounded-full px-2 py-0.5`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.color.replace('text', 'bg')}`} />
        {String(value)}
      </span>
    );
  }

  if (field.type === 'select' && field.fk && fkOptions) {
    const match = fkOptions.find((o) => o.value === String(value));
    return <span className="text-slate-700">{match?.label ?? String(value)}</span>;
  }

  if (field.type === 'image' && typeof value === 'string') {
    return (
      <img
        src={value}
        alt=""
        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded border border-slate-200"
          style={{ backgroundColor: String(value) }}
        />
        <span className="text-slate-600 text-xs font-mono">{String(value)}</span>
      </div>
    );
  }

  if (field.type === 'datetime' || field.key === 'created_at' || field.key === 'updated_at') {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return <span className="text-slate-500 text-xs whitespace-nowrap">{d.toLocaleString()}</span>;
    }
  }

  const str = String(value);
  return <span className={str.length > 60 ? 'block max-w-xs truncate text-slate-600' : 'text-slate-700'}>{str}</span>;
}

function FieldInput({
  field,
  value,
  onChange,
  fkOptions,
  fullWidth,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
  fkOptions?: { value: string; label: string }[];
  fullWidth?: boolean;
}) {
  const base =
    'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary transition';
  const wrap = fullWidth ? 'sm:col-span-2' : '';

  let input: React.ReactNode;
  switch (field.type) {
    case 'textarea':
      input = (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={base}
        />
      );
      break;
    case 'boolean':
      input = (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? 'bg-theme-primary' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
      break;
    case 'select':
      input = (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">— Select —</option>
          {field.fk
            ? (fkOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : field.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
        </select>
      );
      break;
    case 'number':
      input = (
        <input
          type="number"
          value={value === undefined || value === null ? '' : (value as number)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          step={field.step}
          min={field.min}
          max={field.max}
          className={base}
        />
      );
      break;
    case 'time':
      input = (
        <input
          type="time"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
      break;
    case 'date':
      input = (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
      break;
    case 'color':
      input = (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border border-slate-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={base}
          />
        </div>
      );
      break;
    case 'image':
      input = (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">URL or Upload:</span>
            <label className="text-xs text-theme-primary font-bold cursor-pointer hover:underline">
              📁 Upload File
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        onChange(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            {value ? (
              <img
                src={String(value)}
                alt=""
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            ) : null}
            <input
              type="url"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://… or upload file above"
              className={base}
            />
          </div>
        </div>
      );
      break;
    default:
      input = (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
  }

  return (
    <div className={wrap}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {input}
    </div>
  );
}