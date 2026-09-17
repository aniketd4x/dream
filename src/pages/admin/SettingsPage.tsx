import { useEffect, useState } from 'react';
import {
  Store,
  Phone,
  Clock,
  DollarSign,
  Star,
  MessageSquare,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  Percent,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Upload,
  Palette,
  Sparkles,
  Check,
  QrCode,
  Printer,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { THEME_TEMPLATES, applyThemeToDOM } from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';
import { SettingsSkeleton } from '@/components/admin/Skeleton';
import { RestaurantQRModal } from '@/components/admin/RestaurantQRModal';
import { getRestaurantDirectMenuUrl } from '@/lib/qrCanvasGenerator';
import { copyTextToClipboard, openWhatsAppShare } from '@/lib/fileExport';

export default function SettingsPage() {
  const { restaurant, refetchRestaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Feedback messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real-time theme change handler
  function handleThemeColorChange(color: string) {
    triggerHaptic('selection');
    setForm((prev) => ({ ...prev, theme_color: color }));
    applyThemeToDOM(color);
  }

  // File Upload Helper (Supabase Storage + DataURL fallback)
  async function handleFileUpload(file: File, field: 'logo_url' | 'cover_image_url') {
    if (!file) return;

    if (field === 'logo_url') setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      // 1. Try uploading to Supabase Storage bucket 'restaurant-assets'
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${restaurant?.id || 'resto'}-${field}-${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { data: storageData, error: storageErr } = await supabase
        .storage
        .from('restaurant-assets')
        .upload(filePath, file, { upsert: true });

      if (!storageErr && storageData?.path) {
        const { data: pubUrlData } = supabase.storage.from('restaurant-assets').getPublicUrl(storageData.path);
        if (pubUrlData?.publicUrl) {
          setForm((prev) => ({ ...prev, [field]: pubUrlData.publicUrl }));
          if (field === 'logo_url') setUploadingLogo(false);
          else setUploadingCover(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Storage bucket upload fallback to DataURL:', err);
    }

    // 2. Fallback: Read file as Data URL (base64)
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, [field]: reader.result as string }));
      }
      if (field === 'logo_url') setUploadingLogo(false);
      else setUploadingCover(false);
    };
    reader.readAsDataURL(file);
  }

  // Restaurant details state
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    owner_name: '',
    logo_url: '',
    cover_image_url: '',
    opening_time: '09:00',
    closing_time: '23:00',
    currency: 'AED',
    currency_symbol: 'AED',
    rating: 4.5,
    total_reviews: 0,
    address: '',
    city: '',
    state: '',
    country: 'India',
    
    // Restaurant Settings table fields
    theme_color: '#f97316',
    gst_percent: 0,
    service_charge: 0,
    accept_orders: true,
    restaurant_open: true,
    whatsapp_number: '',
    support_number: '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Fetch current restaurant data
  useEffect(() => {
    async function loadRestaurantSettings() {
      if (!restaurant) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch restaurant details
        const { data: restData, error: restErr } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurant.id)
          .maybeSingle();

        if (restErr && restErr.code !== 'PGRST116') throw restErr;

        // Fetch additional settings
        const { data: settingsData } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();

        const activeRest = restData ?? {
          name: restaurant.name || 'Spice Garden',
          mobile: '9876543210',
          owner_name: 'Admin User',
          logo_url: '/logo.png',
          cover_image_url: '',
          opening_time: '09:00',
          closing_time: '23:00',
          currency: restaurant.currency || 'INR',
          currency_symbol: restaurant.currency_symbol || '₹',
          rating: 4.9,
          total_reviews: 1420,
          address: '42 Gourmet Avenue, MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        };

        setForm({
          name: activeRest.name || '',
          mobile: activeRest.mobile || '',
          owner_name: activeRest.owner_name || '',
          logo_url: activeRest.logo_url || '',
          cover_image_url: activeRest.cover_image_url || '',
          opening_time: activeRest.opening_time || '09:00',
          closing_time: activeRest.closing_time || '23:00',
          currency: activeRest.currency || 'INR',
          currency_symbol: activeRest.currency_symbol || '₹',
          rating: Number(activeRest.rating ?? 4.9),
          total_reviews: Number(activeRest.total_reviews ?? 0),
          address: activeRest.address || '',
          city: activeRest.city || '',
          state: activeRest.state || '',
          country: activeRest.country || 'India',

          theme_color: settingsData?.theme_color || '#0F766E',
          gst_percent: Number(settingsData?.gst_percent ?? 5),
          service_charge: Number(settingsData?.service_charge ?? 0),
          accept_orders: settingsData?.accept_orders !== false,
          restaurant_open: settingsData?.restaurant_open !== false,
          whatsapp_number: settingsData?.whatsapp_number || '+919876543210',
          support_number: settingsData?.support_number || '+919876543210',
        });
      } catch (err) {
        console.error('Error loading settings:', err);
        setErrorMessage('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadRestaurantSettings();
  }, [restaurant]);

  // Handle Save Restaurant Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    if (!form.name.trim()) {
      setErrorMessage('Restaurant Name is required');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // 1. Update restaurants table
      const { error: restUpdateErr } = await supabase
        .from('restaurants')
        .update({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          owner_name: form.owner_name.trim(),
          logo_url: form.logo_url.trim() || null,
          cover_image_url: form.cover_image_url.trim() || null,
          opening_time: form.opening_time,
          closing_time: form.closing_time,
          currency: form.currency.trim() || 'AED',
          currency_symbol: form.currency_symbol.trim() || 'AED',
          rating: Number(form.rating),
          total_reviews: Number(form.total_reviews),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      if (restUpdateErr) throw restUpdateErr;

      // 2. Update or Upsert restaurant_settings table
      const { data: existingSettings } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (existingSettings) {
        await supabase
          .from('restaurant_settings')
          .update({
            theme_color: form.theme_color || '#f97316',
            gst_percent: Number(form.gst_percent),
            service_charge: Number(form.service_charge),
            accept_orders: form.accept_orders,
            restaurant_open: form.restaurant_open,
            whatsapp_number: form.whatsapp_number.trim(),
            support_number: form.support_number.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('restaurant_id', restaurant.id);
      } else {
        await supabase.from('restaurant_settings').insert({
          restaurant_id: restaurant.id,
          theme_color: form.theme_color || '#f97316',
          gst_percent: Number(form.gst_percent),
          service_charge: Number(form.service_charge),
          accept_orders: form.accept_orders,
          restaurant_open: form.restaurant_open,
          whatsapp_number: form.whatsapp_number.trim(),
          support_number: form.support_number.trim(),
        });
      }

      await refetchRestaurant();
      triggerHaptic('success');
      setSuccessMessage('✅ Restaurant settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error saving restaurant settings:', err);
      triggerHaptic('alert');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  // Handle Password Change
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    setPasswordSuccess(null);
    setPasswordError(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      // 1. Fetch existing password hash from DB
      const { data: restData, error: fetchErr } = await supabase
        .from('restaurants')
        .select('password_hash')
        .eq('id', restaurant.id)
        .single();

      if (fetchErr || !restData?.password_hash) {
        throw new Error('Could not verify account credentials.');
      }

      // 2. Verify current password
      const isMatch = await bcrypt.compare(currentPassword, restData.password_hash);
      if (!isMatch) {
        setPasswordError('Current password is incorrect.');
        setSavingPassword(false);
        return;
      }

      // 3. Hash new password & update
      const newHash = await bcrypt.hash(newPassword, 10);
      const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      if (updateErr) throw updateErr;

      setPasswordSuccess('✅ Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center shrink-0 shadow-theme">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{restaurant?.name || 'Restaurant Settings'}</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Manage your restaurant profile, operating hours, ratings, currency & security.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Global Notifications */}
        {successMessage && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-4 shadow-xs">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 1. Restaurant Basic Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-theme-primary" />
            Restaurant Basic Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Restaurant Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Gourmet Kitchen"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="e.g. +971 50 123 4567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Owner Name
              </label>
              <input
                type="text"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                placeholder="Owner Full Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>
          </div>
        </div>

        {/* 2. Logo & Cover Images */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ImageIcon className="w-5 h-5 text-theme-primary" />
            Logo & Cover Images
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo Image URL & File Upload */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Restaurant Logo
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-theme-primary font-bold cursor-pointer hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingLogo ? 'Uploading...' : '📁 Upload Logo File'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo_url');
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border-2 border-theme-light bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative">
                  {uploadingLogo ? (
                    <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                  ) : form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100';
                      }}
                    />
                  ) : (
                    <Store className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="url"
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="Image URL or upload file..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  />
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: '' })}
                      className="text-[11px] text-red-500 hover:underline font-medium"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Sample Logos */}
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">Sample Demo Logos:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Dishgaze Official', url: '/logo.png' },
                    { label: 'Bistro', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200' },
                    { label: 'Fine Dining', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200' },
                    { label: 'Cozy Cafe', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200' },
                    { label: 'Grill House', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: preset.url })}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-theme-primary rounded-lg text-[11px] text-slate-700 font-medium transition"
                    >
                      <img src={preset.url} alt="" className="w-4 h-4 rounded-md object-contain bg-slate-50" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Banner Image URL & File Upload */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Cover Banner Image
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-theme-primary font-bold cursor-pointer hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingCover ? 'Uploading...' : '📁 Upload Cover File'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'cover_image_url');
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-28 h-16 rounded-xl border-2 border-theme-light bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative">
                  {uploadingCover ? (
                    <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                  ) : form.cover_image_url ? (
                    <img
                      src={form.cover_image_url}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="url"
                    value={form.cover_image_url}
                    onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                    placeholder="Banner URL or upload file..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                  />
                  {form.cover_image_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, cover_image_url: '' })}
                      className="text-[11px] text-red-500 hover:underline font-medium"
                    >
                      Clear Cover
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Sample Cover Banners */}
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">Sample Demo Cover Banners:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Modern Dining', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000' },
                    { label: 'Restaurant Hall', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000' },
                    { label: 'Cafe Ambience', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000' },
                    { label: 'Steakhouse', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, cover_image_url: preset.url })}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-theme-primary rounded-lg text-[11px] text-slate-700 font-medium transition"
                    >
                      <img src={preset.url} alt="" className="w-5 h-3 rounded object-cover" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fixed Restaurant Menu QR Code (Storefront & Counter) */}
        {restaurant && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-theme-primary" />
                  Storefront & Direct Menu QR Code (Fixed 1 Barcode)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent single QR code / barcode for your entire restaurant. Customers scan once to view and order from the live digital menu without needing a table number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowQRModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl btn-theme-primary text-xs font-black text-white shadow-theme transition native-press shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View & Print Standee</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* QR Preview Card Box */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#F5F3EE] rounded-2xl border border-[#E7E2D8] text-center shadow-xs">
                <div className="relative p-1 mb-2.5">
                  {/* 4 Decorative Gold Corner Guide Brackets */}
                  <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3.5 w-3.5 rounded-tl-sm border-t-2 border-l-2 border-[#C59D5F]" />
                  <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-tr-sm border-t-2 border-r-2 border-[#C59D5F]" />
                  <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-bl-sm border-b-2 border-l-2 border-[#C59D5F]" />
                  <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-br-sm border-b-2 border-r-2 border-[#C59D5F]" />

                  <div className="bg-white p-3 rounded-2xl border border-[#E0D9CB] shadow-sm">
                    <QRCodeCanvas
                      value={getRestaurantDirectMenuUrl(restaurant)}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#0D3B36"
                      level="H"
                      includeMargin
                      imageSettings={{
                        src: restaurant.logo_url || '/logo.png',
                        height: Math.round(140 * 0.22),
                        width: Math.round(140 * 0.22),
                        excavate: true,
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs font-black text-slate-900 tracking-tight">
                  {form.name || restaurant.name}
                </p>
                <p className="text-[10px] font-bold text-[#0F766E] tracking-widest uppercase mt-0.5">
                  OFFICIAL DIGITAL MENU
                </p>
              </div>

              {/* URL & Quick Actions */}
              <div className="md:col-span-8 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Permanent Direct Menu Link
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all overflow-x-auto">
                      {getRestaurantDirectMenuUrl(restaurant)}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        triggerHaptic('success');
                        const url = getRestaurantDirectMenuUrl(restaurant);
                        const ok = await copyTextToClipboard(url);
                        if (ok) {
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition native-press shrink-0 flex items-center gap-1.5"
                      title="Copy Direct Link"
                    >
                      {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                      href={getRestaurantDirectMenuUrl(restaurant)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-theme-light text-theme-primary hover:brightness-95 text-xs font-bold transition native-press shrink-0 flex items-center gap-1.5"
                      title="Open Live Menu"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live Menu</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setShowQRModal(true);
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition native-press text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-theme-primary shadow-xs shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Print Standee & Posters</p>
                      <p className="text-[10px] text-slate-500 font-normal">4x6 Table Tent, A4 Sign, 80mm Roll</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      const url = getRestaurantDirectMenuUrl(restaurant);
                      const msg = `🍽️ *${form.name || restaurant.name}* - Official Digital Menu\n\n✨ Browse our full menu, dishes, and prices directly on your phone:\n🔗 ${url}\n\n_Scan or tap the link to view our menu & place orders!_`;
                      openWhatsAppShare(msg);
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 transition native-press text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Share on WhatsApp</p>
                      <p className="text-[10px] text-emerald-700 font-normal">Send menu directly to diners</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Brand Theme & Templates */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Palette className="w-5 h-5 text-theme-primary" />
                Brand Theme & QR Menu Templates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select from 5 beautifully crafted theme templates or customize your brand colors with live preview.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Active Color:</span>
              <div
                className="w-5 h-5 rounded-full border border-slate-200 shadow-xs"
                style={{ backgroundColor: form.theme_color || '#f97316' }}
              />
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                {form.theme_color || '#f97316'}
              </span>
            </div>
          </div>

          {/* 5 Theme Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {THEME_TEMPLATES.map((tmpl) => {
              const IconComp = tmpl.icon;
              const isSelected = (form.theme_color || '#f97316').toLowerCase() === tmpl.primaryColor.toLowerCase();

              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleThemeColorChange(tmpl.primaryColor)}
                  className={`cursor-pointer group relative rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'bg-slate-50/90 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  style={{
                    borderColor: isSelected ? tmpl.primaryColor : undefined,
                  }}
                >
                  {/* Top Color Banner */}
                  <div
                    className={`h-16 w-full p-2.5 flex items-start justify-between relative overflow-hidden bg-gradient-to-br ${tmpl.accentBg}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <IconComp className="w-4 h-4" />
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-slate-900 px-2 py-0.5 rounded-full shadow-xs">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        Active
                      </span>
                    )}

                    {/* Decorative glow circle */}
                    <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-sm pointer-events-none" />
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {tmpl.name}
                        </h4>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 leading-tight mb-2">
                        {tmpl.subtitle}
                      </p>

                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mb-2.5 ${tmpl.tagColor}`}>
                        {tmpl.tag}
                      </span>

                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                        {tmpl.description}
                      </p>
                    </div>

                    {/* Color Swatch row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-2xs border border-white"
                          style={{ backgroundColor: tmpl.primaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-2xs border border-white"
                          style={{ backgroundColor: tmpl.secondaryColor }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                        {tmpl.primaryColor}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Custom Color Picker & Live Interactive Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
            {/* Custom Color Fine-Tuning */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Custom Brand Color Picker
              </h4>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={form.theme_color || '#f97316'}
                    onChange={(e) => handleThemeColorChange(e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-white shadow-md cursor-pointer p-0.5 bg-white"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hex Color Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.theme_color || '#f97316'}
                      onChange={(e) => handleThemeColorChange(e.target.value)}
                      placeholder="#f97316"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Color Chips */}
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">Popular Quick Colors:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Orange', hex: '#f97316' },
                    { label: 'Emerald', hex: '#059669' },
                    { label: 'Ruby', hex: '#e11d48' },
                    { label: 'Indigo', hex: '#6366f1' },
                    { label: 'Saffron', hex: '#d97706' },
                    { label: 'Cyan', hex: '#0891b2' },
                    { label: 'Purple', hex: '#9333ea' },
                    { label: 'Dark Slate', hex: '#0f172a' },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleThemeColorChange(preset.hex)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs transition"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Live Customer Menu Preview
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Realtime Styling
                </span>
              </div>

              {/* Mock Customer Menu Header & Dish */}
              <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 p-3 space-y-3">
                {/* Simulated Restaurant Header */}
                <div
                  className="rounded-lg p-3 text-white flex items-center justify-between shadow-xs transition-colors duration-300"
                  style={{
                    backgroundColor: form.theme_color || '#f97316',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                      {(form.name || 'R')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{form.name || 'Your Restaurant Name'}</p>
                      <p className="text-[10px] text-white/80">Table #04 · Dine-in</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-medium">
                    ★ {form.rating || 4.5}
                  </span>
                </div>

                {/* Simulated Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <span
                    className="text-[10px] font-bold text-white px-2.5 py-1 rounded-full shadow-2xs transition-colors duration-300"
                    style={{ backgroundColor: form.theme_color || '#f97316' }}
                  >
                    All Items
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                    Starters
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                    Main Course
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                    Beverages
                  </span>
                </div>

                {/* Simulated Dish Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-100/50 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Chef's Signature Special</p>
                      <p className="text-[10px] text-slate-400 truncate">Fresh ingredients, premium taste</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {form.currency_symbol || 'AED'} 45.00
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition-colors duration-300 flex items-center gap-1"
                    style={{ backgroundColor: form.theme_color || '#f97316' }}
                  >
                    <span>+ Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Operating Hours & Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-theme-primary" />
            Operating Hours & Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Opening Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opening Time
              </label>
              <input
                type="time"
                value={form.opening_time}
                onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Closing Time
              </label>
              <input
                type="time"
                value={form.closing_time}
                onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Restaurant Open Toggle */}
            <div className="flex flex-col justify-center">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Restaurant Status
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, restaurant_open: !form.restaurant_open })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition ${
                  form.restaurant_open
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {form.restaurant_open ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                    <span>Restaurant Open</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-red-500" />
                    <span>Restaurant Closed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 5. Currency, Ratings & Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-theme-primary" />
            Currency, Ratings & Reviews
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Currency Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Currency Code
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="AED, USD, INR"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Currency Symbol */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                value={form.currency_symbol}
                onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                placeholder="AED, $, ₹"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Rating (0 - 5)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Total Reviews */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                Total Reviews
              </label>
              <input
                type="number"
                min="0"
                value={form.total_reviews}
                onChange={(e) => setForm({ ...form, total_reviews: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>
          </div>
        </div>

        {/* 6. Tax, Charges & Ordering Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="w-5 h-5 text-theme-primary" />
            Taxes, Charges & Ordering
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* GST % */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GST / VAT Tax (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.gst_percent}
                onChange={(e) => setForm({ ...form, gst_percent: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Service Charge % */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Service Charge (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.service_charge}
                onChange={(e) => setForm({ ...form, service_charge: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
              />
            </div>

            {/* Accept Orders Toggle */}
            <div className="flex flex-col justify-center">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Online Ordering
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, accept_orders: !form.accept_orders })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition ${
                  form.accept_orders
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {form.accept_orders ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                    <span>Accepting Orders</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-amber-500" />
                    <span>Orders Paused</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Main Settings Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 btn-theme-primary text-white font-bold text-sm rounded-xl px-6 py-3 shadow-theme transition-all scale-100 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'Saving Settings...' : 'Save Restaurant Settings'}</span>
          </button>
        </div>
      </form>

      {/* 7. Security & Change Password Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 mt-8">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-theme-primary" />
          Security & Password Change
        </h3>

        {passwordSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-4 shadow-xs">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-medium">{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span className="font-medium">{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-theme-light focus:border-theme-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition shadow-sm disabled:opacity-60"
            >
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FIXED 1 BARCODE / RESTAURANT MENU QR CODE MODAL */}
      {showQRModal && restaurant && (
        <RestaurantQRModal
          restaurant={{
            id: restaurant.id,
            name: form.name || restaurant.name,
            slug: restaurant.slug,
            logo_url: form.logo_url || restaurant.logo_url,
          }}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
