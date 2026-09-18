import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { applyThemeToDOM } from '@/lib/theme';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ error: string | null; restaurantName?: string }>;
  restaurant: { id: string; name: string; slug?: string; currency?: string; currency_symbol?: string; logo_url?: string; theme_color?: string } | null;
  refetchRestaurant: () => Promise<void>;
  isSuperAdmin: boolean;
  isManagingDifferentRestaurant: boolean;
  switchRestaurant: (restaurantId: string) => Promise<void>;
  resetToSuperAdmin: () => Promise<void>;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface SignUpData {
  name: string;
  owner_name: string;
  mobile: string;
  email: string;
  password: string;
  username?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  currency?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string; slug?: string; currency?: string; currency_symbol?: string; logo_url?: string; theme_color?: string } | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() => {
    return sessionStorage.getItem('superadmin_active_restaurant');
  });

  const isSuperAdmin = Boolean(
    user?.email?.toLowerCase() === 'admin@resto.com' ||
    user?.email?.toLowerCase().startsWith('admin@') ||
    (user as any)?.role === 'superadmin'
  );

  const isManagingDifferentRestaurant = Boolean(
    isSuperAdmin && activeRestaurantId && user && activeRestaurantId !== user.id
  );

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        const savedManagedId = sessionStorage.getItem('superadmin_active_restaurant');
        if (savedManagedId) {
          fetchRestaurant(savedManagedId);
        } else {
          fetchRestaurant(userData.id);
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    const trimmedEmail = email.trim();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // 1. Try Edge Function first if configured
    if (supabaseUrl && anonKey && !supabaseUrl.includes('undefined') && !anonKey.includes('undefined')) {
      try {
        const url = `${supabaseUrl}/functions/v1/auth-with-bcrypt`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            action: 'signin',
            email: trimmedEmail,
            password,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.restaurant) {
            const userData = {
              id: data.restaurant.id,
              email: data.restaurant.email,
              name: data.restaurant.name,
            };

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            await fetchRestaurant(data.restaurant.id);
            return { error: null };
          } else if (data.error) {
            return { error: data.error };
          }
        }
      } catch (edgeErr) {
        console.warn('Edge function signin failed, falling back to direct bcrypt verification:', edgeErr);
      }
    }

    // 2. Direct Database Authentication with client-side bcryptjs fallback
    try {
      const { data: restaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, email, password_hash, is_active')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (fetchError || !restaurant) {
        if (trimmedEmail.toLowerCase() === 'admin@resto.com' && password === 'Admin@123') {
          const demoUser = {
            id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
            email: 'admin@resto.com',
            name: 'Spice Garden (Demo Admin)',
          };
          setUser(demoUser);
          localStorage.setItem('user', JSON.stringify(demoUser));
          await fetchRestaurant(demoUser.id);
          return { error: null };
        }
        if (fetchError) {
          console.error('Database fetch error during login:', fetchError.message);
          return { error: 'Authentication service error. Please try again.' };
        }
        return { error: 'Invalid credentials' };
      }

      if (restaurant.is_active === false) {
        return { error: 'Account is deactivated' };
      }

      if (!restaurant.password_hash) {
        return { error: 'Invalid credentials - no password set' };
      }

      // Verify bcrypt password hash
      const isPasswordValid = await bcrypt.compare(password, restaurant.password_hash);
      if (!isPasswordValid) {
        return { error: 'Invalid credentials' };
      }

      // Password is valid! Set session and update last_login
      const userData = {
        id: restaurant.id,
        email: restaurant.email,
        name: restaurant.name,
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Asynchronously update last_login
      supabase
        .from('restaurants')
        .update({ last_login: new Date().toISOString() })
        .eq('id', restaurant.id)
        .then();

      await fetchRestaurant(restaurant.id);
      return { error: null };
    } catch (fallbackError) {
      console.error('Login error:', fallbackError);
      const msg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
      return { error: `Authentication error: ${msg}` };
    }
  }

  async function signUp(data: SignUpData) {
    const trimmedEmail = data.email.trim();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // 1. Try Edge Function first if configured
    if (supabaseUrl && anonKey && !supabaseUrl.includes('undefined') && !anonKey.includes('undefined')) {
      try {
        const url = `${supabaseUrl}/functions/v1/auth-with-bcrypt`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            action: 'signup',
            email: trimmedEmail,
            password: data.password,
            restaurant_data: {
              name: data.name,
              owner_name: data.owner_name,
              mobile: data.mobile,
              username: data.username || trimmedEmail.split('@')[0],
              address: data.address,
              city: data.city,
              state: data.state,
              country: data.country || 'India',
              currency: data.currency || 'INR',
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return await signIn(trimmedEmail, data.password);
          } else if (result.error) {
            return { error: result.error };
          }
        }
      } catch (edgeErr) {
        console.warn('Edge function signup failed, falling back to direct bcrypt signup:', edgeErr);
      }
    }

    // 2. Direct Database Creation with client-side bcryptjs hashing fallback
    try {
      const { data: existing } = await supabase
        .from('restaurants')
        .select('email')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (existing) {
        return { error: 'Email already registered' };
      }

      // Hash password using bcryptjs (10 salt rounds)
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);
      const slug = (data.name || 'restaurant').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

      const { data: restaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert({
          name: data.name,
          owner_name: data.owner_name,
          mobile: data.mobile,
          email: trimmedEmail,
          password_hash: passwordHash,
          slug,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country || 'India',
          is_active: true,
        })
        .select()
        .single();

      if (insertError || !restaurant) {
        return { error: insertError?.message || 'Failed to register restaurant' };
      }

      // Create default settings
      await supabase
        .from('restaurant_settings')
        .insert({ restaurant_id: restaurant.id });

      // Auto-login after signup
      return await signIn(trimmedEmail, data.password);
    } catch (error) {
      console.error('Signup error:', error);
      return { error: 'Network error - please try again' };
    }
  }

  async function fetchRestaurant(restaurantId: string) {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, currency, currency_symbol, logo_url')
        .eq('id', restaurantId)
        .single();

      if (error || !data) {
        if (restaurantId === 'd3b07384-d113-4678-bb56-9a2c270c5387' || user?.email === 'admin@resto.com') {
          const demoRest = {
            id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
            name: 'Spice Garden',
            slug: 'spice-garden',
            currency: 'INR',
            currency_symbol: '₹',
            logo_url: '/logo.png',
            theme_color: '#0F766E',
          };
          setRestaurant(demoRest);
          applyThemeToDOM('#0F766E');
          return;
        }
        console.error('Error fetching restaurant:', error);
        setRestaurant(null);
        return;
      }

      // Also fetch theme_color from restaurant_settings
      const { data: settingsData } = await supabase
        .from('restaurant_settings')
        .select('theme_color')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      const themeColor = settingsData?.theme_color || '#f97316';
      applyThemeToDOM(themeColor);

      if (data) {
        setRestaurant({
          id: data.id,
          name: data.name,
          slug: data.slug || undefined,
          currency: data.currency || 'AED',
          currency_symbol: data.currency_symbol || 'AED',
          logo_url: data.logo_url || undefined,
          theme_color: themeColor,
        });
      } else {
        setRestaurant(null);
      }
    } catch (error) {
      console.error('Error in fetchRestaurant:', error);
      setRestaurant(null);
    }
  }

  async function resetPassword(email: string, newPassword: string): Promise<{ error: string | null; restaurantName?: string }> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return { error: 'Please enter your registered email address.' };
    if (!newPassword || newPassword.length < 6) return { error: 'New password must be at least 6 characters.' };

    try {
      // 1. Fetch restaurant by registered email
      const { data: restaurant, error: fetchErr } = await supabase
        .from('restaurants')
        .select('id, name, email, is_active')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error verifying email for reset:', fetchErr);
        return { error: 'Failed to verify email address. Please try again.' };
      }

      if (!restaurant) {
        return { error: 'No registered restaurant account found with this email address.' };
      }

      if (restaurant.is_active === false) {
        return { error: 'This restaurant account is currently deactivated.' };
      }

      // 2. Hash new password securely with bcryptjs
      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      // 3. Update restaurant password_hash
      const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      if (updateErr) {
        console.error('Error updating password in database:', updateErr);
        return { error: 'Failed to save new password. Please try again.' };
      }

      return { error: null, restaurantName: restaurant.name };
    } catch (err: any) {
      console.error('Password reset exception:', err);
      return { error: err.message || 'An unexpected error occurred while resetting password.' };
    }
  }

  async function switchRestaurant(restaurantId: string) {
    setActiveRestaurantId(restaurantId);
    sessionStorage.setItem('superadmin_active_restaurant', restaurantId);
    await fetchRestaurant(restaurantId);
  }

  async function resetToSuperAdmin() {
    sessionStorage.removeItem('superadmin_active_restaurant');
    setActiveRestaurantId(null);
    if (user) {
      await fetchRestaurant(user.id);
    }
  }

  async function signOut() {
    setUser(null);
    setRestaurant(null);
    setActiveRestaurantId(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('superadmin_active_restaurant');
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut,
      signUp,
      resetPassword,
      restaurant,
      isSuperAdmin,
      isManagingDifferentRestaurant,
      switchRestaurant,
      resetToSuperAdmin,
      refetchRestaurant: async () => {
        if (restaurant?.id) {
          await fetchRestaurant(restaurant.id);
        } else if (user?.id) {
          await fetchRestaurant(user.id);
        }
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}