import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  Flame,
  Clock,
  Star,
  Zap,
  CheckCircle,
  Crop,
  Upload,
  ArrowUpDown,
  QrCode,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import ImageAdjustModal from './ImageAdjustModal';
import { MenuItemSkeleton } from './Skeleton';
import { RestaurantQRModal } from './RestaurantQRModal';

interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  food_type: string;
  preparation_time: number;
  is_available: boolean;
  is_featured: boolean;
  is_recommended: boolean;
  has_variant: boolean;
  has_addon: boolean;
  display_order: number;
  sku: string | null;
  category_name?: string;
  created_at?: string;
}

export default function MenuItemPage() {
  const { restaurant } = useAuth();
  const currencySymbol = restaurant?.currency_symbol || restaurant?.currency || 'AED';

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterFoodType, setFilterFoodType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [imageAdjustModalOpen, setImageAdjustModalOpen] = useState(false);
  const [showStoreQRModal, setShowStoreQRModal] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    category_id: '',
    food_type: 'veg',
    preparation_time: 15,
    is_available: true,
    is_featured: false,
    is_recommended: false,
    has_variant: false,
    has_addon: false,
    display_order: 0,
    sku: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Fetch Data silently to avoid unmounting modals/inputs
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!restaurant) return;

      if (!isSilent && items.length === 0) {
        setLoading(true);
      }
      setError(null);

      try {
        // 1. Fetch categories
        const { data: categoriesData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurant.id)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (catError) throw catError;
        setCategories(categoriesData || []);

        // 2. Fetch menu items with display_order ASC, created_at ASC stable secondary sorting
        const { data: itemsData, error: itemError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (itemError) throw itemError;

        // Enrich items with category names
        const enrichedItems: MenuItem[] = (itemsData || []).map((item) => {
          const category = categoriesData?.find((c) => c.id === item.category_id);
          return {
            ...item,
            display_order: Number(item.display_order ?? 0),
            price: Number(item.price ?? 0),
            category_name: category?.name || 'Uncategorized',
          };
        });

        // Stable sort locally as well
        enrichedItems.sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return (a.created_at || '').localeCompare(b.created_at || '');
        });

        setItems(enrichedItems);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
      } finally {
        setLoading(false);
      }
    },
    [restaurant, items.length]
  );

  useEffect(() => {
    fetchData();

    const handleAppRefresh = () => {
      // Refresh silently without resetting loader
      fetchData(true);
    };

    window.addEventListener('app_refresh', handleAppRefresh);
    return () => {
      window.removeEventListener('app_refresh', handleAppRefresh);
    };
  }, [fetchData]);

  // Handle Hardware Back Button Event on Android to dismiss open modals first
  useEffect(() => {
    const handleHardwareBack = () => {
      if (imageAdjustModalOpen) {
        setImageAdjustModalOpen(false);
      } else if (modalOpen) {
        setModalOpen(false);
      }
    };

    window.addEventListener('app_hardware_back', handleHardwareBack);
    return () => {
      window.removeEventListener('app_hardware_back', handleHardwareBack);
    };
  }, [imageAdjustModalOpen, modalOpen]);

  // Toggle Item In-Stock / Out-of-Stock
  const toggleAvailability = async (item: MenuItem) => {
    const updatedStatus = !item.is_available;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: updatedStatus } : i))
    );

    try {
      const { error: updateErr } = await supabase
        .from('menu_items')
        .update({ is_available: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (updateErr) {
        console.error('Error toggling availability:', updateErr);
        fetchData(true);
      } else {
        showSuccess(
          `"${item.name}" marked as ${updatedStatus ? 'Available (In Stock)' : 'Out of Stock'}`
        );
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
  };

  // Filtered & Sorted items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
        (item.category_name && item.category_name.toLowerCase().includes(search.toLowerCase()));
      const matchesFoodType = filterFoodType === 'all' || item.food_type === filterFoodType;
      const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
      return matchesSearch && matchesFoodType && matchesCategory;
    });
  }, [items, search, filterFoodType, filterCategory]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: 0,
      image_url: '',
      category_id: categories[0]?.id || '',
      food_type: 'veg',
      preparation_time: 15,
      is_available: true,
      is_featured: false,
      is_recommended: false,
      has_variant: false,
      has_addon: false,
      display_order: items.length + 1,
      sku: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: Number(item.price ?? 0),
      image_url: item.image_url || '',
      category_id: item.category_id,
      food_type: item.food_type || 'veg',
      preparation_time: item.preparation_time || 15,
      is_available: item.is_available !== false,
      is_featured: item.is_featured || false,
      is_recommended: item.is_recommended || false,
      has_variant: item.has_variant || false,
      has_addon: item.has_addon || false,
      display_order: Number(item.display_order ?? 0),
      sku: item.sku || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Item name is required');
      return;
    }
    if (!form.category_id) {
      setFormError('Category is required');
      return;
    }
    if (form.price < 0) {
      setFormError('Price must be a positive number');
      return;
    }
    if (!restaurant) return;

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        image_url: form.image_url.trim() || null,
        category_id: form.category_id,
        food_type: form.food_type,
        preparation_time: Number(form.preparation_time) || 15,
        is_available: form.is_available,
        is_featured: form.is_featured,
        is_recommended: form.is_recommended,
        has_variant: form.has_variant,
        has_addon: form.has_addon,
        display_order: Math.max(0, parseInt(String(form.display_order), 10) || 0),
        sku: form.sku.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editing.id);

        if (updateError) throw updateError;
        showSuccess(`Item "${form.name}" updated successfully`);
      } else {
        const { error: insertError } = await supabase.from('menu_items').insert({
          ...payload,
          restaurant_id: restaurant.id,
        });

        if (insertError) throw insertError;
        showSuccess(`Item "${form.name}" created successfully`);
      }

      setModalOpen(false);
      await fetchData(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    setDeleting(true);
    setError(null);

    try {
      // 1. Delete child item_variants and detach order_items before deleting menu item
      await supabase.from('item_variants').delete().eq('menu_item_id', item.id);
      await supabase.from('order_items').update({ menu_item_id: null }).eq('menu_item_id', item.id);

      const { error: delError } = await supabase.from('menu_items').delete().eq('id', item.id);

      if (delError) throw delError;

      setConfirmDelete(null);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showSuccess(`Item "${item.name}" deleted successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const getFoodTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      veg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      non_veg: 'bg-rose-50 text-rose-700 border-rose-300',
      vegan: 'bg-amber-50 text-amber-700 border-amber-300',
      egg: 'bg-amber-50 text-amber-800 border-amber-300',
    };
    return colors[type] || 'bg-slate-50 text-slate-700 border-slate-300';
  };

  const getFoodTypeDotColor = (type: string) => {
    const dots: Record<string, string> = {
      veg: 'bg-emerald-500',
      non_veg: 'bg-rose-500',
      vegan: 'bg-amber-500',
      egg: 'bg-amber-600',
    };
    return dots[type] || 'bg-slate-400';
  };

  const getFoodTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      veg: 'Veg',
      non_veg: 'Non-Veg',
      vegan: 'Vegan',
      egg: 'Egg',
    };
    return labels[type] || type;
  };

  if (loading && items.length === 0) {
    return <MenuItemSkeleton count={8} />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl p-3.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl p-3.5 shadow-2xs">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Header, Search and Actions */}
      <div className="space-y-3 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name, category, or description…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowStoreQRModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-theme-light border border-theme-border text-theme-primary hover:brightness-95 text-xs sm:text-sm font-bold shadow-xs transition native-press"
              title="View & Print Fixed Restaurant Menu QR Code"
            >
              <QrCode className="w-4 h-4 text-theme-primary" />
              <span>Store QR</span>
            </button>
            <button
              onClick={openCreate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 btn-theme-primary font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-theme transition native-press"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Food Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">Type:</span>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setFilterFoodType('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 native-press ${
                filterFoodType === 'all'
                  ? 'btn-theme-primary shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            {['veg', 'non_veg', 'vegan', 'egg'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterFoodType(type);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 native-press border ${
                  filterFoodType === type
                    ? 'btn-theme-primary border-transparent shadow-xs'
                    : `${getFoodTypeColor(type)}`
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${getFoodTypeDotColor(type)}`} />
                {getFoodTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">Category:</span>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterCategory('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 native-press ${
                  filterCategory === 'all'
                    ? 'btn-theme-primary shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setFilterCategory(cat.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 border native-press ${
                    filterCategory === cat.id
                      ? 'btn-theme-primary border-transparent shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items Count & Sorting info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-800">{filtered.length}</strong> items
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <ArrowUpDown className="w-3 h-3" />
          Sorted by Display Order (#1 first)
        </span>
      </div>

      {/* Menu Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-theme-light flex items-center justify-center text-theme-primary mx-auto mb-3">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No menu items found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || filterFoodType !== 'all' || filterCategory !== 'all'
              ? 'No dishes match your active filter criteria. Try clearing search or filters.'
              : 'Start organizing your restaurant menu by adding your first delicious dish.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 btn-theme-primary font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-theme transition"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col group relative"
            >
              {/* Image Section (Clean 16:10 Aspect Ratio, balanced for mobile & desktop) */}
              <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden shrink-0">
                {item.image_url && !imageErrors[item.id] ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center relative p-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-theme-light flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">No photo</span>
                  </div>
                )}

                {/* Top Badges Overlay */}
                <div className="absolute inset-x-0 top-0 p-2 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/60 via-black/20 to-transparent">
                  {/* Food Type Pill */}
                  <div className="pointer-events-auto flex items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full text-white backdrop-blur-md shadow-xs ${
                        item.food_type === 'veg'
                          ? 'bg-emerald-600/90'
                          : item.food_type === 'non_veg'
                          ? 'bg-rose-600/90'
                          : item.food_type === 'vegan'
                          ? 'bg-amber-600/90'
                          : 'bg-amber-700/90'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{getFoodTypeLabel(item.food_type)}</span>
                    </span>

                    {/* Display Order Pill */}
                    <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/20">
                      #{item.display_order}
                    </span>
                  </div>

                  {/* Hot / Featured */}
                  {item.is_featured && (
                    <span className="bg-theme-gradient text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 fill-white text-white" />
                      <span>Popular</span>
                    </span>
                  )}
                </div>

                {/* Bottom Right Floating Price */}
                <div className="absolute bottom-2 right-2 bg-slate-950/90 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-xs font-black border border-white/20 shadow-md tracking-tight">
                  <span className="text-theme-primary font-bold mr-0.5">{currencySymbol}</span>
                  {item.price.toFixed(2)}
                </div>

                {/* Out of Stock Overlay */}
                {!item.is_available && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center z-10 p-2 text-center">
                    <span className="text-white text-[11px] font-bold bg-rose-600/90 px-3 py-1 rounded-full shadow-lg border border-rose-400/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold tracking-wide text-theme-primary uppercase bg-theme-light px-2 py-0.5 rounded-md border border-theme-light truncate max-w-[70%]">
                      {item.category_name || 'General'}
                    </span>
                    {item.preparation_time ? (
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {item.preparation_time}m
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-theme-primary transition-colors line-clamp-1 mt-1">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Highlights */}
                  {(item.is_recommended || item.has_variant || item.has_addon) && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {item.is_recommended && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-md text-[9px] font-bold">
                          <Star className="w-2.5 h-2.5 fill-purple-500 text-purple-500" />
                          <span>Chef Pick</span>
                        </span>
                      )}
                      {(item.has_variant || item.has_addon) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md text-[9px] font-bold">
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          <span>Customizable</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      toggleAvailability(item);
                    }}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all native-press ${
                      item.is_available
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                    }`}
                    title={item.is_available ? 'Mark Out of Stock' : 'Mark In Stock'}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.is_available ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerHaptic('light');
                        openEdit(item, e);
                      }}
                      className="p-1.5 text-slate-500 hover:text-theme-primary hover:bg-theme-light rounded-lg transition-colors native-press"
                      title="Edit Item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('alert');
                        setConfirmDelete(item);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors native-press"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop"
          onClick={() => {
            triggerHaptic('light');
            setModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-bottom-sheet sm:animate-none pb-safe sm:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editing ? `Edit "${editing.name}"` : 'Add New Menu Item'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="e.g., Butter Chicken Deluxe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary bg-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Food Type
                  </label>
                  <select
                    value={form.food_type}
                    onChange={(e) => setForm({ ...form, food_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary bg-white"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non_veg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="egg">Contains Egg</option>
                  </select>
                </div>

                {/* Display Order Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Display Order (Sorting)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        display_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary font-mono"
                    placeholder="1, 2, 3..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Lower numbers appear first on the menu.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.preparation_time}
                    onChange={(e) =>
                      setForm({ ...form, preparation_time: parseInt(e.target.value, 10) || 15 })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    SKU / Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="e.g., BURG-01"
                  />
                </div>
              </div>

              {/* Photo Upload & Adjustment Box */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Menu Item Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => setImageAdjustModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:underline"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    {form.image_url ? 'Crop & Adjust Photo' : 'Upload & Adjust Photo'}
                  </button>
                </div>

                {form.image_url ? (
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <img
                      src={form.image_url}
                      alt="Menu item preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImageAdjustModalOpen(true)}
                        className="px-3 py-1.5 bg-white/90 backdrop-blur-md text-slate-800 rounded-lg text-xs font-bold shadow-md hover:bg-white flex items-center gap-1"
                      >
                        <Crop className="w-3.5 h-3.5 text-theme-primary" />
                        Adjust Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setImageAdjustModalOpen(true)}
                    className="aspect-[16/10] w-full bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-theme-primary transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary mb-1 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Upload & Crop Food Photo</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pan, zoom, and fit perfectly to menu card
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  placeholder="Describe ingredients, taste, spices..."
                />
              </div>

              {/* Switches / Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-theme-primary focus:ring-theme-light"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Available for Ordering (In Stock)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-theme-primary focus:ring-theme-light"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Popular / Featured Special
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_recommended}
                    onChange={(e) => setForm({ ...form, is_recommended: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-theme-primary focus:ring-theme-light"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Chef's Recommendation
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 transition native-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  handleSave();
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 btn-theme-primary disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl px-5 py-2.5 transition shadow-theme native-press"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving Item…' : editing ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Image Crop & Adjust Modal */}
      <ImageAdjustModal
        isOpen={imageAdjustModalOpen}
        initialImageUrl={form.image_url}
        restaurantId={restaurant?.id}
        aspectRatio={1.6}
        onSave={(newImageUrl) => {
          setForm((prev) => ({ ...prev, image_url: newImageUrl }));
        }}
        onRemove={() => {
          setForm((prev) => ({ ...prev, image_url: '' }));
        }}
        onClose={() => setImageAdjustModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop"
          onClick={() => {
            triggerHaptic('light');
            setConfirmDelete(null);
          }}
        >
          <div
            className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-bottom-sheet sm:animate-none pb-safe sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Delete "{confirmDelete.name}"?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              This action cannot be undone. The menu item will be permanently removed from your
              active menu.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setConfirmDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 native-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('alert');
                  handleDelete(confirmDelete);
                }}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 native-press shadow-sm"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED 1 BARCODE / RESTAURANT MENU QR CODE MODAL */}
      {showStoreQRModal && restaurant && (
        <RestaurantQRModal
          restaurant={restaurant}
          onClose={() => setShowStoreQRModal(false)}
        />
      )}
    </div>
  );
}
