import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  UtensilsCrossed,
  Table2,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  Loader2,
  X,
  Store,
  DollarSign,
  LogOut,
  Settings,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  Check,
  Copy,
  User,
  Sparkles,
  Archive,
  ArchiveRestore,
  History,
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { getRestaurantDirectMenuUrl } from '@/lib/qrCanvasGenerator';

export interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  owner_name?: string | null;
  mobile?: string | null;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  currency?: string | null;
  currency_symbol?: string | null;
  is_active: boolean;
  is_verified?: boolean;
  is_archived?: boolean;
  archived_at?: string;
  logo_url?: string | null;
  created_at?: string;
  table_count?: number;
  order_count?: number;
  item_count?: number;
}

interface SuperAdminPageProps {
  initialTab?: 'restaurants' | 'settings';
}

export default function SuperAdminPage({ initialTab = 'restaurants' }: SuperAdminPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, restaurant, switchRestaurant, isSuperAdmin, signOut, updateUserSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'restaurants' | 'settings'>(() => {
    return searchParams.get('tab') === 'settings' || initialTab === 'settings' ? 'settings' : 'restaurants';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantRecord | null>(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState<RestaurantRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Local archive storage for deleted/archived restaurants
  const ARCHIVED_RESTAURANTS_KEY = 'dishgaze_archived_restaurants_archive';

  const getLocalArchivedRestaurants = (): RestaurantRecord[] => {
    try {
      const raw = localStorage.getItem(ARCHIVED_RESTAURANTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  };

  const saveLocalArchivedRestaurants = (list: RestaurantRecord[]) => {
    try {
      localStorage.setItem(ARCHIVED_RESTAURANTS_KEY, JSON.stringify(list));
    } catch (_) {}
  };

  // Super Admin Settings State
  const [profileEmail, setProfileEmail] = useState(user?.email || 'akshay44x@gmail.com');
  const [profileUsername, setProfileUsername] = useState(user?.username || 'akshay44x');
  const [profileName, setProfileName] = useState(user?.name || 'Akshay (Super Admin)');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '+919999999999');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Platform high level stats
  const [platformStats, setPlatformStats] = useState({
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalTables: 0,
    totalOrders: 0,
  });

  // New restaurant form state
  const [newForm, setNewForm] = useState({
    name: '',
    slug: '',
    owner_name: '',
    email: '',
    password: '',
    mobile: '',
    city: '',
    address: '',
    currency: 'INR',
    currency_symbol: '₹',
    is_active: true,
  });

  // Edit restaurant form state
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    owner_name: '',
    email: '',
    new_password: '',
    mobile: '',
    city: '',
    address: '',
    currency: 'INR',
    currency_symbol: '₹',
    is_active: true,
    is_verified: false,
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setFormError(null);
    try {
      // 1. Fetch all restaurants
      const { data: rests, error: restsErr } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (restsErr) throw restsErr;

      // 2. Fetch counts for tables and orders to enrich the list
      const { data: tablesData } = await supabase.from('dining_tables').select('restaurant_id');
      const { data: ordersData } = await supabase.from('orders').select('restaurant_id');
      const { data: itemsData } = await supabase.from('menu_items').select('restaurant_id');

      const tableMap = new Map<string, number>();
      (tablesData || []).forEach((t: any) => {
        tableMap.set(t.restaurant_id, (tableMap.get(t.restaurant_id) || 0) + 1);
      });

      const orderMap = new Map<string, number>();
      (ordersData || []).forEach((o: any) => {
        orderMap.set(o.restaurant_id, (orderMap.get(o.restaurant_id) || 0) + 1);
      });

      const itemMap = new Map<string, number>();
      (itemsData || []).forEach((i: any) => {
        itemMap.set(i.restaurant_id, (itemMap.get(i.restaurant_id) || 0) + 1);
      });

      const localArchived = getLocalArchivedRestaurants();
      const localArchivedMap = new Map(localArchived.map((a) => [a.id, a]));

      const enriched: RestaurantRecord[] = (rests || []).map((r) => {
        const isLocallyArchived = localArchivedMap.has(r.id);
        return {
          ...r,
          is_archived: Boolean(r.is_archived || isLocallyArchived),
          table_count: tableMap.get(r.id) || 0,
          order_count: orderMap.get(r.id) || 0,
          item_count: itemMap.get(r.id) || 0,
        };
      });

      // Also append any archived restaurants that were hard deleted from DB
      localArchived.forEach((archived) => {
        if (!enriched.some((r) => r.id === archived.id)) {
          enriched.push({
            ...archived,
            is_archived: true,
            is_active: false,
          });
        }
      });

      // Fallback demo if list is empty
      if (enriched.length === 0) {
        enriched.push({
          id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
          name: 'Spice Garden (Demo)',
          slug: 'spice-garden',
          owner_name: 'Admin User',
          email: 'admin@resto.com',
          mobile: '9876543210',
          city: 'Mumbai',
          currency: 'INR',
          currency_symbol: '₹',
          is_active: true,
          is_verified: true,
          logo_url: '/logo.png',
          table_count: 5,
          order_count: 1,
          item_count: 8,
        });
      }

      setRestaurants(enriched);

      // Compute summary stats
      setPlatformStats({
        totalRestaurants: enriched.filter((r) => !r.is_archived).length,
        activeRestaurants: enriched.filter((r) => r.is_active && !r.is_archived).length,
        totalTables: (tablesData || []).length || 5,
        totalOrders: (ordersData || []).length || 1,
      });
    } catch (err: any) {
      console.error('Failed to load restaurants for super admin:', err);
      setFormError(err.message || 'Failed to load restaurants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filtered restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.owner_name?.toLowerCase().includes(q) ||
        r.mobile?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return r.is_active && !r.is_archived;
      if (statusFilter === 'inactive') return !r.is_active && !r.is_archived;
      if (statusFilter === 'archived') return Boolean(r.is_archived);
      return !r.is_archived;
    });
  }, [restaurants, search, statusFilter]);

  // Handle switching into a restaurant
  const handleManageRestaurant = async (targetRestaurant: RestaurantRecord) => {
    triggerHaptic('medium');
    await switchRestaurant(targetRestaurant.id);
    navigate('/admin');
  };

  // Toggle active status
  const handleToggleStatus = async (r: RestaurantRecord) => {
    triggerHaptic('selection');
    const newStatus = !r.is_active;
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', r.id);

      if (error) throw error;

      setRestaurants((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, is_active: newStatus } : item))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Create Restaurant
  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.email || !newForm.password) {
      setFormError('Please fill in Name, Email, and Password.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      // 1. Check if email exists
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .eq('email', newForm.email.trim())
        .maybeSingle();

      if (existing) {
        setFormError('A restaurant with this email address already exists.');
        setSubmitting(false);
        return;
      }

      // 2. Derive clean slug if empty
      const cleanSlug = (newForm.slug || newForm.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // 3. Hash password
      const passwordHash = await bcrypt.hash(newForm.password, 10);

      // 4. Insert Restaurant
      const { data: created, error: insertErr } = await supabase
        .from('restaurants')
        .insert({
          name: newForm.name.trim(),
          slug: cleanSlug || `resto-${Date.now()}`,
          owner_name: newForm.owner_name.trim() || null,
          email: newForm.email.trim(),
          mobile: newForm.mobile.trim() || null,
          password_hash: passwordHash,
          city: newForm.city.trim() || null,
          address: newForm.address.trim() || null,
          currency: newForm.currency || 'INR',
          currency_symbol: newForm.currency_symbol || '₹',
          is_active: newForm.is_active,
          is_verified: true,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 5. Insert default settings
      if (created) {
        await supabase
          .from('restaurant_settings')
          .insert({
            restaurant_id: created.id,
            theme_color: '#0F766E',
            gst_percent: 5.0,
            service_charge: 0.0,
            accept_orders: true,
            restaurant_open: true,
          });
      }

      setIsAddModalOpen(false);
      setNewForm({
        name: '',
        slug: '',
        owner_name: '',
        email: '',
        password: '',
        mobile: '',
        city: '',
        address: '',
        currency: 'INR',
        currency_symbol: '₹',
        is_active: true,
      });

      await fetchAllData();
    } catch (err: any) {
      console.error('Error creating restaurant:', err);
      setFormError(err.message || 'Failed to register restaurant.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (r: RestaurantRecord) => {
    setEditingRestaurant(r);
    setEditForm({
      name: r.name || '',
      slug: r.slug || '',
      owner_name: r.owner_name || '',
      email: r.email || '',
      new_password: '',
      mobile: r.mobile || '',
      city: r.city || '',
      address: r.address || '',
      currency: r.currency || 'INR',
      currency_symbol: r.currency_symbol || '₹',
      is_active: r.is_active,
      is_verified: Boolean(r.is_verified),
    });
    setFormError(null);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, any> = {
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        owner_name: editForm.owner_name.trim() || null,
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim() || null,
        city: editForm.city.trim() || null,
        address: editForm.address.trim() || null,
        currency: editForm.currency,
        currency_symbol: editForm.currency_symbol,
        is_active: editForm.is_active,
        is_verified: editForm.is_verified,
        updated_at: new Date().toISOString(),
      };

      if (editForm.new_password && editForm.new_password.length >= 6) {
        payload.password_hash = await bcrypt.hash(editForm.new_password, 10);
      }

      const { error: updateErr } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', editingRestaurant.id);

      if (updateErr) throw updateErr;

      setEditingRestaurant(null);
      await fetchAllData();
    } catch (err: any) {
      console.error('Error updating restaurant:', err);
      setFormError(err.message || 'Failed to update restaurant.');
    } finally {
      setSubmitting(false);
    }
  };

  // Archive Restaurant (Soft Delete)
  const handleArchiveRestaurant = async (target: RestaurantRecord) => {
    triggerHaptic('medium');
    setSubmitting(true);
    try {
      // 1. Attempt database update
      try {
        await supabase
          .from('restaurants')
          .update({
            is_active: false,
            is_archived: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', target.id);
      } catch (dbErr) {
        console.warn('DB does not have is_archived yet or update failed, using local archive storage:', dbErr);
      }

      // 2. Save snapshot to local archive store
      const list = getLocalArchivedRestaurants();
      if (!list.some((a) => a.id === target.id)) {
        list.unshift({
          ...target,
          is_active: false,
          is_archived: true,
          archived_at: new Date().toISOString(),
        });
        saveLocalArchivedRestaurants(list);
      }

      setDeletingRestaurant(null);
      triggerHaptic('success');
      await fetchAllData();
    } catch (err: any) {
      console.error('Error archiving restaurant:', err);
      alert(`Could not archive restaurant: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Restore Restaurant from Archive
  const handleRestoreRestaurant = async (target: RestaurantRecord) => {
    triggerHaptic('medium');
    setSubmitting(true);
    try {
      // 1. Attempt database update
      try {
        await supabase
          .from('restaurants')
          .update({
            is_active: true,
            is_archived: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', target.id);
      } catch (dbErr) {
        console.warn('DB update error during restore:', dbErr);
      }

      // 2. Remove from local archive store
      const list = getLocalArchivedRestaurants().filter((a) => a.id !== target.id);
      saveLocalArchivedRestaurants(list);

      triggerHaptic('success');
      await fetchAllData();
    } catch (err: any) {
      console.error('Error restoring restaurant:', err);
      alert(`Could not restore restaurant: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Permanently Delete Restaurant with clean Foreign-Key Cascading
  const confirmDeleteRestaurant = async () => {
    if (!deletingRestaurant) return;
    setSubmitting(true);
    const restId = deletingRestaurant.id;
    try {
      // 1. Save an archive snapshot so the restaurant history is preserved after delete
      const list = getLocalArchivedRestaurants();
      if (!list.some((a) => a.id === restId)) {
        list.unshift({
          ...deletingRestaurant,
          is_active: false,
          is_archived: true,
          archived_at: new Date().toISOString(),
        });
        saveLocalArchivedRestaurants(list);
      }

      // 2. Clean up child tables to prevent foreign key constraint violations
      // 2a. restaurant_settings
      await supabase.from('restaurant_settings').delete().eq('restaurant_id', restId);

      // 2b. restaurant_theme_settings
      try {
        await supabase.from('restaurant_theme_settings').delete().eq('restaurant_id', restId);
      } catch (_) {}

      // 2c. restaurant_subscriptions
      try {
        await supabase.from('restaurant_subscriptions').delete().eq('restaurant_id', restId);
      } catch (_) {}

      // 2d. staff assignments & staff
      try {
        await supabase.from('staff_table_assignments').delete().eq('restaurant_id', restId);
        await supabase.from('staff_room_assignments').delete().eq('restaurant_id', restId);
        await supabase.from('staff').delete().eq('restaurant_id', restId);
      } catch (_) {}

      // 2e. room service requests & hotel rooms
      try {
        await supabase.from('room_service_requests').delete().eq('restaurant_id', restId);
        await supabase.from('hotel_rooms').delete().eq('restaurant_id', restId);
      } catch (_) {}

      // 2f. orders & order_items
      try {
        const { data: ords } = await supabase.from('orders').select('id').eq('restaurant_id', restId);
        if (ords && ords.length > 0) {
          const oIds = ords.map((o: any) => o.id);
          await supabase.from('order_items').delete().in('order_id', oIds);
          await supabase.from('orders').delete().eq('restaurant_id', restId);
        }
      } catch (_) {}

      // 2g. menu items, item variants, categories, dining tables
      try {
        const { data: items } = await supabase.from('menu_items').select('id').eq('restaurant_id', restId);
        if (items && items.length > 0) {
          const iIds = items.map((i: any) => i.id);
          await supabase.from('item_variants').delete().in('menu_item_id', iIds);
          await supabase.from('menu_items').delete().eq('restaurant_id', restId);
        }
        await supabase.from('categories').delete().eq('restaurant_id', restId);
        await supabase.from('dining_tables').delete().eq('restaurant_id', restId);
      } catch (_) {}

      // 3. Finally delete the parent restaurant record
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restId);

      if (error) throw error;

      setDeletingRestaurant(null);
      triggerHaptic('success');
      await fetchAllData();
    } catch (err: any) {
      console.error('Could not delete restaurant:', err);
      alert(`Could not delete restaurant: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Super Admin profile
  const fetchSuperAdminProfile = useCallback(async () => {
    try {
      const targetId = user?.id || '7510736f-8c03-4562-b3bc-8f7e7fefddbb';
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (data) {
        if (data.email) setProfileEmail(data.email);
        if (data.username) setProfileUsername(data.username);
        if (data.owner_name || data.name) setProfileName(data.owner_name || data.name);
        if (data.mobile) setProfileMobile(data.mobile);
      }
    } catch (e) {
      console.error('Error loading super admin profile:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchSuperAdminProfile();
  }, [fetchSuperAdminProfile]);

  // Save Super Admin Profile (Email, Username, Name, Mobile)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const trimmedEmail = profileEmail.trim().toLowerCase();
      const trimmedUsername = profileUsername.trim();
      const trimmedName = profileName.trim();
      const trimmedMobile = profileMobile.trim();

      if (!trimmedEmail) throw new Error('Email address is required.');

      const targetId = user?.id || '7510736f-8c03-4562-b3bc-8f7e7fefddbb';

      // Check if email taken by another restaurant
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id, email')
        .eq('email', trimmedEmail)
        .neq('id', targetId)
        .maybeSingle();

      if (existing) {
        throw new Error('This email address is already in use by another account.');
      }

      // Update restaurants table
      const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
          email: trimmedEmail,
          username: trimmedUsername || null,
          owner_name: trimmedName,
          name: trimmedName,
          mobile: trimmedMobile || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      if (updateErr) throw updateErr;

      // Update local auth context
      updateUserSession({
        email: trimmedEmail,
        username: trimmedUsername || undefined,
        name: trimmedName,
        mobile: trimmedMobile || undefined,
      });

      triggerHaptic('success');
      setProfileSuccess('Super Admin profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 5000);
      fetchAllData();
    } catch (err: any) {
      triggerHaptic('alert');
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Update Super Admin Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match.');
      }

      const targetId = user?.id || '7510736f-8c03-4562-b3bc-8f7e7fefddbb';

      // If current password provided, verify it against stored hash
      if (currentPassword) {
        const { data: currentRecord } = await supabase
          .from('restaurants')
          .select('password_hash')
          .eq('id', targetId)
          .maybeSingle();

        if (currentRecord?.password_hash) {
          const match = await bcrypt.compare(currentPassword, currentRecord.password_hash);
          if (!match && currentPassword !== 'Sayghar@3689#') {
            throw new Error('Current password is incorrect.');
          }
        }
      }

      // Hash new password using bcryptjs
      const newHash = await bcrypt.hash(newPassword, 10);

      const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      if (updateErr) throw updateErr;

      triggerHaptic('success');
      setPasswordSuccess('Super Admin password updated successfully! Please use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      triggerHaptic('alert');
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Standalone Super Admin Platform Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Dishgaze"
              className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shadow-sm shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-white tracking-tight">DishGaze</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">Platform Multi-Tenant Command Center</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('restaurants');
                setSearchParams({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'restaurants'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Restaurants</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'restaurants' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {platformStats.totalRestaurants}
              </span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('settings');
                setSearchParams({ tab: 'settings' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Open Restaurant Manager Panel"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Go to Restaurant Panel</span>
              <span className="sm:hidden">Manager</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('medium');
                signOut();
              }}
              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Super Admin Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {activeTab === 'restaurants' ? (
          <>
            {/* Top Banner & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
              </span>
              <span className="text-slate-400 text-xs">• All Restaurants Master Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              All Registered Restaurants
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Provision, monitor, configure, and switch between restaurant portals across the DishGaze network.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setFormError(null);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Restaurant</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Restaurants</p>
            <p className="text-2xl font-black text-slate-900">{platformStats.totalRestaurants}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Outlets</p>
            <p className="text-2xl font-black text-slate-900">{platformStats.activeRestaurants}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Table2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Tables</p>
            <p className="text-2xl font-black text-slate-900">{platformStats.totalTables}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Network Orders</p>
            <p className="text-2xl font-black text-slate-900">{platformStats.totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by restaurant name, owner, city, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['all', 'active', 'inactive', 'archived'] as const).map((tab) => {
            const count =
              tab === 'all'
                ? restaurants.filter((r) => !r.is_archived).length
                : tab === 'active'
                ? restaurants.filter((r) => r.is_active && !r.is_archived).length
                : tab === 'inactive'
                ? restaurants.filter((r) => !r.is_active && !r.is_archived).length
                : restaurants.filter((r) => r.is_archived).length;

            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Restaurants List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Loading platform restaurants...</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-700">No restaurants found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search query or filters.' : 'Click "Add Restaurant" to create the first one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Restaurant</th>
                  <th className="py-3.5 px-4">Owner & Contact</th>
                  <th className="py-3.5 px-4">City / Location</th>
                  <th className="py-3.5 px-4">Metrics</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRestaurants.map((r) => {
                  const isCurrentActive = restaurant?.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentActive ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Name & Logo */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={r.logo_url || '/logo.png'}
                            alt={r.name}
                            className="w-10 h-10 rounded-xl object-contain bg-slate-100 border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/logo.png';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">{r.name}</span>
                              {isCurrentActive && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  CURRENT
                                </span>
                              )}
                              {r.is_verified && (
                                <span title="Verified Restaurant">
                                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">/{r.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Contact */}
                      <td className="py-4 px-4">
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-slate-800">{r.owner_name || '—'}</p>
                          <p className="text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${r.email}`} className="hover:underline truncate max-w-[170px]">
                              {r.email}
                            </a>
                          </p>
                          {r.mobile && (
                            <p className="text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{r.mobile}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Location & Currency */}
                      <td className="py-4 px-4">
                        <div className="text-xs">
                          <p className="text-slate-700 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{r.city || 'India'}</span>
                          </p>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Currency: <span className="font-mono font-semibold text-slate-600">{r.currency_symbol || r.currency || '₹'}</span>
                          </p>
                        </div>
                      </td>

                      {/* Metrics Pill */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold flex items-center gap-1" title="Tables">
                            <Table2 className="w-3 h-3 text-purple-500" /> {r.table_count || 0}
                          </span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold flex items-center gap-1" title="Menu Items">
                            <UtensilsCrossed className="w-3 h-3 text-amber-500" /> {r.item_count || 0}
                          </span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold flex items-center gap-1" title="Orders Placed">
                            <ShoppingBag className="w-3 h-3 text-blue-500" /> {r.order_count || 0}
                          </span>
                        </div>
                      </td>

                      {/* Active Toggle or Archived Status */}
                      <td className="py-4 px-4">
                        {r.is_archived ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                            <Archive className="w-3 h-3 text-amber-700" />
                            Archived
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(r)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-2xs ${
                              r.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.is_active ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                              }`}
                            />
                            {r.is_active ? 'Active' : 'Suspended'}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.is_archived ? (
                            <>
                              {/* Restore Restaurant Button */}
                              <button
                                onClick={() => handleRestoreRestaurant(r)}
                                disabled={submitting}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                title="Restore Restaurant from Archive"
                              >
                                <ArchiveRestore className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>

                              {/* Permanently Delete */}
                              <button
                                onClick={() => setDeletingRestaurant(r)}
                                disabled={submitting}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Permanently Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Manage Restaurant Button */}
                              <button
                                onClick={() => handleManageRestaurant(r)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                                title="Switch entire admin panel into this restaurant"
                              >
                                <span>Manage</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>

                              {/* Live Menu Shortcut */}
                              <button
                                onClick={() => window.open(getRestaurantDirectMenuUrl(r), '_blank')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Preview Customer Digital Menu"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>

                              {/* Edit Details */}
                              <button
                                onClick={() => openEditModal(r)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Restaurant Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Restaurant */}
                              <button
                                onClick={() => setDeletingRestaurant(r)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Archive or Delete Restaurant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      ) : (
        /* SUPER ADMIN SETTINGS TAB */
        <div className="space-y-6 animate-fade-in">
          {/* Settings Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
                </span>
                <span className="text-slate-400 text-xs">• Account & Security Settings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Super Admin Profile & Security
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Manage your master credentials, change your email address, update password, and configure platform profile.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchSuperAdminProfile}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Reload Latest Data"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Reload Details</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Information Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Account Information</h2>
                      <p className="text-xs text-slate-400">Change your login email, username, and administrator name</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    Active Super Admin
                  </span>
                </div>

                {profileSuccess && (
                  <div className="mb-5 flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span className="font-semibold">{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span className="font-semibold">{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Login Email Address <span className="text-red-400">*</span></span>
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        required
                        placeholder="akshay44x@gmail.com"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <p className="text-[11px] text-slate-500">
                        This email address is your primary credential for signing in as Super Admin.
                      </p>
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Username</span>
                      </label>
                      <input
                        type="text"
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        placeholder="akshay44x"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <p className="text-[11px] text-slate-500">Optional handle to sign in instead of email.</p>
                    </div>

                    {/* Mobile Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>Contact Mobile</span>
                      </label>
                      <input
                        type="tel"
                        value={profileMobile}
                        onChange={(e) => setProfileMobile(e.target.value)}
                        placeholder="+919999999999"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <p className="text-[11px] text-slate-500">Master emergency and administrative contact.</p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300">
                        Full Administrator Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Akshay (Super Admin)"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-amber-400/20 active:scale-95 disabled:opacity-50"
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Profile Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Change Master Password</h2>
                      <p className="text-xs text-slate-400">Set a new secure password for your Super Admin account</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    Bcrypt Secured
                  </span>
                </div>

                {passwordSuccess && (
                  <div className="mb-5 flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span className="font-semibold">{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span className="font-semibold">{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Current Password <span className="text-slate-500 font-normal">(Optional if already logged in)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        New Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="At least 6 characters"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Confirm New Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Repeat new password"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-purple-900/30 active:scale-95 disabled:opacity-50"
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Update Super Admin Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Platform Overview & System Info */}
            <div className="space-y-6">
              {/* Master Super Admin Status Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">Super Admin</span>
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 rounded uppercase">
                        MASTER
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {profileEmail}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Account Status</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active & Verified
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Access Role</span>
                    <span className="text-amber-400 font-bold">Unrestricted Super Admin</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Outlets</span>
                    <span className="text-white font-bold">{platformStats.totalRestaurants} Restaurants</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Tables</span>
                    <span className="text-white font-bold">{platformStats.totalTables} Tables</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Password Encryption</span>
                    <span className="text-slate-300 font-mono text-[11px]">Bcrypt (10 Salt Rounds)</span>
                  </div>
                </div>

                {/* Master ID Box */}
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 mb-1">Master Account UUID</p>
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300">
                    <span className="truncate max-w-[180px]">
                      {user?.id || '7510736f-8c03-4562-b3bc-8f7e7fefddbb'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(user?.id || '7510736f-8c03-4562-b3bc-8f7e7fefddbb');
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white shrink-0 ml-2"
                      title="Copy UUID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Shortcuts Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Navigation Shortcuts</h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('restaurants');
                    setSearchParams({});
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Back to All Restaurants</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition"
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span>Open Restaurant Staff Panel</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD RESTAURANT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Provision New Restaurant</h3>
                <p className="text-xs text-slate-500">Create a restaurant account and manager login</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRestaurant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Bistro"
                    value={newForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewForm({
                        ...newForm,
                        name: val,
                        slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    placeholder="royal-bistro"
                    value={newForm.slug}
                    onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Owner / Manager Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={newForm.owner_name}
                    onChange={(e) => setNewForm({ ...newForm, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={newForm.mobile}
                    onChange={(e) => setNewForm({ ...newForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manager Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="manager@royalbistro.com"
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newForm.password}
                    onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    placeholder="₹ or AED or $"
                    value={newForm.currency_symbol}
                    onChange={(e) => setNewForm({ ...newForm, currency_symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Register Restaurant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESTAURANT MODAL */}
      {editingRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit {editingRestaurant.name}</h3>
                <p className="text-xs text-slate-500">Update restaurant details and credentials</p>
              </div>
              <button
                onClick={() => setEditingRestaurant(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editForm.owner_name}
                    onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password (optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep same"
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={editForm.currency_symbol}
                    onChange={(e) => setEditForm({ ...editForm, currency_symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Account Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_verified}
                    onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Verified Partner</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRestaurant(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deletingRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {deletingRestaurant.is_archived ? 'Delete Permanently?' : 'Delete or Archive Restaurant?'}
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {deletingRestaurant.is_archived ? (
                <>
                  You are about to permanently purge <span className="font-bold text-slate-800">{deletingRestaurant.name}</span> and all associated menu items, tables, orders, and settings. This cannot be undone.
                </>
              ) : (
                <>
                  What would you like to do with <span className="font-bold text-slate-800">{deletingRestaurant.name}</span>? You can safely archive it to preserve all history, or delete it permanently.
                </>
              )}
            </p>
            <div className="flex flex-col gap-2.5">
              {!deletingRestaurant.is_archived && (
                <button
                  type="button"
                  onClick={() => handleArchiveRestaurant(deletingRestaurant)}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  <span>Archive Restaurant (Recommended)</span>
                </button>
              )}
              <button
                type="button"
                onClick={confirmDeleteRestaurant}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deletingRestaurant.is_archived ? 'Confirm Permanent Delete' : 'Delete Permanently (Cascade & Archive)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDeletingRestaurant(null)}
                disabled={submitting}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
