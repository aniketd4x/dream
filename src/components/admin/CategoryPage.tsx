import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { CategorySkeleton } from './Skeleton';

interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  display_order: number;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  item_count?: number;
}

export default function CategoryPage() {
  const { restaurant } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '',
    image_url: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async (isSilent = false) => {
    if (!restaurant) return;

    if (!isSilent && categories.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      // Fetch all menu items for this restaurant to count by category
      const { data: menuItems, error: itemError } = await supabase
        .from('menu_items')
        .select('category_id')
        .eq('restaurant_id', restaurant.id);

      if (itemError) console.warn('Could not fetch menu items:', itemError);

      // Count items by category
      const countMap = new Map<string, number>();
      if (menuItems) {
        menuItems.forEach((item) => {
          const catId = item.category_id;
          if (catId) {
            countMap.set(catId, (countMap.get(catId) || 0) + 1);
          }
        });
      }

      // Map item counts to categories
      const categoriesWithCounts = (categoriesData || []).map((cat) => ({
        ...cat,
        item_count: countMap.get(cat.id) || 0,
      }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [restaurant, categories.length]);

  useEffect(() => {
    fetchCategories();

    const handleAppRefresh = () => fetchCategories(true);
    window.addEventListener('app_refresh', handleAppRefresh);
    return () => {
      window.removeEventListener('app_refresh', handleAppRefresh);
    };
  }, [fetchCategories]);

  // Handle Hardware Back Button Event on Android to dismiss open modals first
  useEffect(() => {
    const handleHardwareBack = () => {
      if (confirmDelete) {
        setConfirmDelete(null);
      } else if (modalOpen) {
        setModalOpen(false);
      }
    };

    window.addEventListener('app_hardware_back', handleHardwareBack);
    return () => {
      window.removeEventListener('app_hardware_back', handleHardwareBack);
    };
  }, [confirmDelete, modalOpen]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      icon: '',
      image_url: '',
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active !== false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleCategoryActive = async (cat: Category) => {
    const updatedStatus = !cat.is_active;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: updatedStatus } : c))
    );

    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', cat.id);

      if (error) {
        console.error('Error toggling active status:', error);
        fetchCategories();
      } else {
        showSuccess(`Category marked as ${updatedStatus ? 'Active' : 'Inactive'}`);
      }
    } catch (err) {
      console.error('Toggle error:', err);
      fetchCategories();
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    if (!restaurant) return;

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editing.id);

        if (error) throw error;
        showSuccess(`Category "${form.name}" updated successfully`);
      } else {
        const { error } = await supabase.from('categories').insert({
          ...payload,
          restaurant_id: restaurant.id,
          display_order: categories.length,
        });

        if (error) throw error;
        showSuccess(`Category "${form.name}" created successfully`);
      }

      setModalOpen(false);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    setDeleting(true);
    setError(null);

    try {
      // 1. Find child menu items for this category
      const { data: childItems } = await supabase
        .from('menu_items')
        .select('id')
        .eq('category_id', cat.id);

      if (childItems && childItems.length > 0) {
        const itemIds = childItems.map((i) => i.id);

        // Delete item variants of these child items
        await supabase
          .from('item_variants')
          .delete()
          .in('menu_item_id', itemIds);

        // Detach order items referencing these menu items
        await supabase
          .from('order_items')
          .update({ menu_item_id: null })
          .in('menu_item_id', itemIds);

        // Delete the menu items
        await supabase
          .from('menu_items')
          .delete()
          .eq('category_id', cat.id);
      }

      // 2. Delete the category itself
      const { error: delError } = await supabase
        .from('categories')
        .delete()
        .eq('id', cat.id);

      if (delError) throw delError;

      setConfirmDelete(null);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showSuccess(`Category "${cat.name}" deleted successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <CategorySkeleton count={8} />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 transition-all">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 btn-theme-primary font-bold text-sm rounded-lg px-4 py-2 shadow-theme transition"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No categories found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Get started by creating your first category.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 btn-theme-primary font-bold text-sm rounded-lg px-4 py-2 shadow-theme transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className={`bg-white rounded-xl border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between ${
                cat.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/80 opacity-75'
              }`}
            >
              {/* Image / Header Section */}
              {cat.image_url ? (
                <div className="relative h-28 bg-slate-100 overflow-hidden">
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => toggleCategoryActive(cat)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm border transition ${
                        cat.is_active
                          ? 'bg-emerald-500/90 text-white border-emerald-400/40 hover:bg-emerald-600'
                          : 'bg-slate-700/80 text-white border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-28 bg-theme-light flex items-center justify-center relative">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
                    <UtensilsCrossed className="w-6 h-6 text-theme-primary" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleCategoryActive(cat)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs border transition ${
                        cat.is_active
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              )}

              {/* Content Section */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </h3>
                  </div>

                  {cat.description ? (
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic mb-2">No description</p>
                  )}

                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200/80 rounded-full mb-3">
                    <UtensilsCrossed className="w-3 h-3 text-blue-600" />
                    <span className="text-[11px] font-medium text-blue-700">
                      {cat.item_count || 0} {cat.item_count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-theme-primary hover:bg-theme-light rounded-lg transition flex items-center justify-center gap-1 border border-slate-200"
                    title="Edit Category"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(cat)}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-1 border border-slate-200"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col animate-bottom-sheet sm:animate-none pb-safe sm:pb-0">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editing ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => { triggerHaptic('light'); setModalOpen(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="e.g., Appetizers"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category Code / Short Tag
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    maxLength={10}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="e.g. MAIN, STARTER"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Category Image
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-theme-primary font-bold cursor-pointer hover:underline">
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
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
                                setForm((prev) => ({ ...prev, image_url: reader.result as string }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {form.image_url && (
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                    placeholder="Add a description for this category..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-theme-primary focus:ring-theme-light"
                    />
                    <span className="text-xs font-bold text-slate-700">Active (Visible in menu)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => { triggerHaptic('light'); setModalOpen(false); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition native-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  handleSave();
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 btn-theme-primary disabled:opacity-60 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition shadow-theme native-press"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-bottom-sheet sm:animate-none pb-safe sm:pb-6">
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
              This will permanently remove the category and all associated menu items. This action cannot be undone.
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
    </div>
  );
}
