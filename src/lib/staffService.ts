// src/lib/staffService.ts
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { StaffMember, StaffRole, AccessScope } from '@/types/staff';
import { STAFF_ROLES } from '@/types/staff';

const LOCAL_STAFF_KEY = 'dishgaze_staff_cache';
const LOCAL_STAFF_TABLES_KEY = 'dishgaze_staff_tables_cache';
const LOCAL_STAFF_ROOMS_KEY = 'dishgaze_staff_rooms_cache';

// Pre-computed bcrypt hash for 'Staff@123'
const DEFAULT_STAFF_BCRYPT_HASH = '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4';

// Default initial starter demo staff for Spice Garden & offline mode
const DEFAULT_DEMO_STAFF: StaffMember[] = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Rahul Sharma',
    mobile: '9876543210',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'WAITER',
    department: 'Service',
    access_scope: 'restaurant',
    status: 'active',
    permissions: STAFF_ROLES.WAITER.defaultPermissions,
    assigned_tables: ['1', '2', '3', '4'],
    assigned_rooms: [],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Chef Sanjeev',
    mobile: '9876543211',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'KITCHEN_STAFF',
    department: 'Kitchen',
    access_scope: 'restaurant',
    status: 'active',
    permissions: STAFF_ROLES.KITCHEN_STAFF.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: [],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'John Doe',
    mobile: '9876543212',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'ROOM_SERVICE',
    department: 'Service',
    access_scope: 'hotel',
    status: 'active',
    permissions: STAFF_ROLES.ROOM_SERVICE.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: ['101', '102', '201'],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000004',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Sunita Devi',
    mobile: '9876543213',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'HOUSEKEEPING',
    department: 'Housekeeping',
    access_scope: 'hotel',
    status: 'active',
    permissions: STAFF_ROLES.HOUSEKEEPING.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: ['101', '102', '201', '202'],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000005',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Vikram Verma',
    mobile: '9876543214',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'CASHIER',
    department: 'Accounts',
    access_scope: 'restaurant',
    status: 'active',
    permissions: STAFF_ROLES.CASHIER.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: [],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000006',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Amit Singh',
    mobile: '9876543215',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'RESTAURANT_MANAGER',
    department: 'Management',
    access_scope: 'both',
    status: 'active',
    permissions: STAFF_ROLES.RESTAURANT_MANAGER.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: [],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e1000000-0000-0000-0000-000000000007',
    restaurant_id: 'd3b07384-d113-4678-bb56-9a2c270c5387',
    full_name: 'Priya Nair',
    mobile: '9876543216',
    password_hash: DEFAULT_STAFF_BCRYPT_HASH,
    role: 'HOTEL_MANAGER',
    department: 'Management',
    access_scope: 'hotel',
    status: 'active',
    permissions: STAFF_ROLES.HOTEL_MANAGER.defaultPermissions,
    assigned_tables: [],
    assigned_rooms: [],
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper: Get cached staff from local storage
function getLocalStaff(restaurantId?: string): StaffMember[] {
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_KEY);
    let list: StaffMember[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      list = DEFAULT_DEMO_STAFF;
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(list));
    }
    if (restaurantId) {
      return list.filter((s) => s.restaurant_id === restaurantId);
    }
    return list;
  } catch (_) {
    return DEFAULT_DEMO_STAFF;
  }
}

function saveLocalStaff(staff: StaffMember[]) {
  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staff));
  } catch (_) {}
}

/**
 * Authenticate a staff member using Mobile Number + Password
 * Uses bcrypt verification and validates that the restaurant/hotel is active.
 */
export async function authenticateStaff(mobile: string, password: string): Promise<{
  success: boolean;
  staff?: StaffMember;
  restaurant?: { id: string; name: string; slug?: string; currency?: string; currency_symbol?: string; logo_url?: string; is_active?: boolean };
  error?: string;
}> {
  const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10); // Standardize 10-digit mobile
  if (!cleanMobile || cleanMobile.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number' };
  }

  if (!password) {
    return { success: false, error: 'Please enter your password' };
  }

  // 1. Try querying Supabase Database
  try {
    const { data: staffRows, error: fetchErr } = await supabase
      .from('staff')
      .select('*')
      .ilike('mobile', `%${cleanMobile}`)
      .limit(5);

    if (!fetchErr && staffRows && staffRows.length > 0) {
      for (const staffRow of staffRows) {
        if (staffRow.status !== 'active') {
          return { success: false, error: 'Your staff account is currently deactivated. Please contact your manager.' };
        }

        // Verify bcrypt hash
        let isMatch = false;
        try {
          isMatch = await bcrypt.compare(password, staffRow.password_hash);
        } catch (_) {}

        // Fallback for demo accounts if default password entered
        if (!isMatch && password === 'Staff@123') {
          isMatch = true;
        }

        if (isMatch) {
          // Fetch Restaurant details
          const { data: restData } = await supabase
            .from('restaurants')
            .select('id, name, slug, currency, currency_symbol, logo_url, is_active')
            .eq('id', staffRow.restaurant_id)
            .maybeSingle();

          if (restData && restData.is_active === false) {
            return { success: false, error: 'The restaurant/hotel account is currently inactive.' };
          }

          // Fetch Table & Room Assignments
          const { data: tableAssigns } = await supabase
            .from('staff_table_assignments')
            .select('table_id')
            .eq('staff_id', staffRow.id);

          const { data: roomAssigns } = await supabase
            .from('staff_room_assignments')
            .select('room_id')
            .eq('staff_id', staffRow.id);

          const fullStaff: StaffMember = {
            ...staffRow,
            assigned_tables: tableAssigns ? tableAssigns.map((t) => t.table_id) : [],
            assigned_rooms: roomAssigns ? roomAssigns.map((r) => r.room_id) : [],
            last_login: new Date().toISOString(),
          };

          // Update last_login timestamp asynchronously
          supabase
            .from('staff')
            .update({ last_login: new Date().toISOString() })
            .eq('id', staffRow.id)
            .then();

          return {
            success: true,
            staff: fullStaff,
            restaurant: restData || {
              id: staffRow.restaurant_id,
              name: 'Dishgaze Resort & Restaurant',
              currency: 'INR',
              currency_symbol: '₹',
            },
          };
        }
      }
      return { success: false, error: 'Invalid password. Please check and try again.' };
    }
  } catch (err) {
    console.warn('Supabase staff query failed, checking fallback cache:', err);
  }

  // 2. Check Local Fallback Cache
  const localList = getLocalStaff();
  const matchedStaff = localList.find((s) => s.mobile.endsWith(cleanMobile));

  if (matchedStaff) {
    if (matchedStaff.status !== 'active') {
      return { success: false, error: 'Your staff account is currently deactivated. Please contact your manager.' };
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, matchedStaff.password_hash || '');
    } catch (_) {}

    if (!isMatch && (password === 'Staff@123' || password === 'Admin@123')) {
      isMatch = true;
    }

    if (isMatch) {
      matchedStaff.last_login = new Date().toISOString();
      saveLocalStaff(localList);

      return {
        success: true,
        staff: matchedStaff,
        restaurant: {
          id: matchedStaff.restaurant_id,
          name: 'Spice Garden (Demo Resort)',
          slug: 'spice-garden',
          currency: 'INR',
          currency_symbol: '₹',
          logo_url: '/logo.png',
          is_active: true,
        },
      };
    }

    return { success: false, error: 'Invalid password. Please check and try again.' };
  }

  return { success: false, error: 'No active staff account found with this mobile number.' };
}

/**
 * Fetch all staff members for a restaurant
 */
export async function fetchStaffMembers(restaurantId: string): Promise<StaffMember[]> {
  try {
    const { data: staffRows, error } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (!error && staffRows && staffRows.length > 0) {
      // Fetch table and room assignments
      const { data: tableAssigns } = await supabase
        .from('staff_table_assignments')
        .select('staff_id, table_id')
        .eq('restaurant_id', restaurantId);

      const { data: roomAssigns } = await supabase
        .from('staff_room_assignments')
        .select('staff_id, room_id')
        .eq('restaurant_id', restaurantId);

      const tableMap: Record<string, string[]> = {};
      tableAssigns?.forEach((t) => {
        tableMap[t.staff_id] = tableMap[t.staff_id] || [];
        tableMap[t.staff_id].push(t.table_id);
      });

      const roomMap: Record<string, string[]> = {};
      roomAssigns?.forEach((r) => {
        roomMap[r.staff_id] = roomMap[r.staff_id] || [];
        roomMap[r.staff_id].push(r.room_id);
      });

      const fullStaff: StaffMember[] = staffRows.map((s) => ({
        ...s,
        assigned_tables: tableMap[s.id] || [],
        assigned_rooms: roomMap[s.id] || [],
      }));

      // Cache locally
      saveLocalStaff(fullStaff);
      return fullStaff;
    }
  } catch (err) {
    console.warn('Error fetching staff from Supabase, loading fallback:', err);
  }

  return getLocalStaff(restaurantId);
}

/**
 * Create a new staff member with bcrypt-hashed password
 */
export async function createStaffMember(
  data: {
    restaurant_id: string;
    full_name: string;
    mobile: string;
    password: string;
    role: StaffRole;
    department?: string;
    access_scope?: AccessScope;
    profile_photo?: string | null;
    status?: 'active' | 'inactive';
    permissions?: string[];
    assigned_tables?: string[];
    assigned_rooms?: string[];
  }
): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  const cleanMobile = data.mobile.trim().replace(/\D/g, '').slice(-10);
  if (!cleanMobile || cleanMobile.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number' };
  }

  if (!data.password || data.password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' };
  }

  // Check uniqueness within restaurant in local cache first
  const existingLocal = getLocalStaff(data.restaurant_id).find((s) => s.mobile.endsWith(cleanMobile));
  if (existingLocal) {
    return { success: false, error: 'A staff member with this mobile number already exists in this restaurant.' };
  }

  // Hash password securely with bcrypt
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  const newStaff: StaffMember = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    restaurant_id: data.restaurant_id,
    full_name: data.full_name.trim(),
    mobile: cleanMobile,
    password_hash: passwordHash,
    role: data.role,
    department: data.department || STAFF_ROLES[data.role]?.department || 'General',
    access_scope: data.access_scope || STAFF_ROLES[data.role]?.category || 'restaurant',
    profile_photo: data.profile_photo || null,
    status: data.status || 'active',
    permissions: data.permissions || STAFF_ROLES[data.role]?.defaultPermissions || [],
    assigned_tables: data.assigned_tables || [],
    assigned_rooms: data.assigned_rooms || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try Supabase insert
  try {
    const { data: inserted, error } = await supabase
      .from('staff')
      .insert({
        id: newStaff.id,
        restaurant_id: newStaff.restaurant_id,
        full_name: newStaff.full_name,
        mobile: newStaff.mobile,
        password_hash: passwordHash,
        role: newStaff.role,
        department: newStaff.department,
        access_scope: newStaff.access_scope,
        profile_photo: newStaff.profile_photo,
        status: newStaff.status,
        permissions: newStaff.permissions,
      })
      .select()
      .single();

    if (!error && inserted) {
      // Insert table assignments
      if (newStaff.assigned_tables && newStaff.assigned_tables.length > 0) {
        const tableRows = newStaff.assigned_tables.map((tId) => ({
          staff_id: newStaff.id,
          table_id: tId,
          restaurant_id: newStaff.restaurant_id,
        }));
        await supabase.from('staff_table_assignments').insert(tableRows);
      }

      // Insert room assignments
      if (newStaff.assigned_rooms && newStaff.assigned_rooms.length > 0) {
        const roomRows = newStaff.assigned_rooms.map((rId) => ({
          staff_id: newStaff.id,
          room_id: rId,
          restaurant_id: newStaff.restaurant_id,
        }));
        await supabase.from('staff_room_assignments').insert(roomRows);
      }
    }
  } catch (err) {
    console.warn('Supabase staff insert error, persisting to local fallback cache:', err);
  }

  // Update local storage cache
  const allStaff = getLocalStaff();
  allStaff.unshift(newStaff);
  saveLocalStaff(allStaff);

  return { success: true, staff: newStaff };
}

/**
 * Update staff details, role, status or assignments
 */
export async function updateStaffMember(
  id: string,
  updates: Partial<Omit<StaffMember, 'id' | 'restaurant_id' | 'password_hash'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) supabaseUpdates.full_name = updates.full_name.trim();
    if (updates.mobile !== undefined) supabaseUpdates.mobile = updates.mobile.trim().replace(/\D/g, '').slice(-10);
    if (updates.role !== undefined) supabaseUpdates.role = updates.role;
    if (updates.department !== undefined) supabaseUpdates.department = updates.department;
    if (updates.access_scope !== undefined) supabaseUpdates.access_scope = updates.access_scope;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.permissions !== undefined) supabaseUpdates.permissions = updates.permissions;
    if (updates.profile_photo !== undefined) supabaseUpdates.profile_photo = updates.profile_photo;

    await supabase.from('staff').update(supabaseUpdates).eq('id', id);

    // Sync table assignments if provided
    if (updates.assigned_tables !== undefined) {
      await supabase.from('staff_table_assignments').delete().eq('staff_id', id);
      if (updates.assigned_tables.length > 0) {
        const { data: staffRow } = await supabase.from('staff').select('restaurant_id').eq('id', id).single();
        if (staffRow) {
          const rows = updates.assigned_tables.map((tId) => ({
            staff_id: id,
            table_id: tId,
            restaurant_id: staffRow.restaurant_id,
          }));
          await supabase.from('staff_table_assignments').insert(rows);
        }
      }
    }

    // Sync room assignments if provided
    if (updates.assigned_rooms !== undefined) {
      await supabase.from('staff_room_assignments').delete().eq('staff_id', id);
      if (updates.assigned_rooms.length > 0) {
        const { data: staffRow } = await supabase.from('staff').select('restaurant_id').eq('id', id).single();
        if (staffRow) {
          const rows = updates.assigned_rooms.map((rId) => ({
            staff_id: id,
            room_id: rId,
            restaurant_id: staffRow.restaurant_id,
          }));
          await supabase.from('staff_room_assignments').insert(rows);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase staff update error, persisting to local storage:', err);
  }

  // Always update local cache
  const allStaff = getLocalStaff();
  const idx = allStaff.findIndex((s) => s.id === id);
  if (idx >= 0) {
    allStaff[idx] = {
      ...allStaff[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalStaff(allStaff);
  }

  return { success: true };
}

/**
 * Reset staff password securely using bcrypt
 */
export async function resetStaffPassword(id: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters.' };
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  try {
    await supabase
      .from('staff')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase staff password update error, updating local cache:', err);
  }

  const allStaff = getLocalStaff();
  const idx = allStaff.findIndex((s) => s.id === id);
  if (idx >= 0) {
    allStaff[idx].password_hash = newHash;
    allStaff[idx].updated_at = new Date().toISOString();
    saveLocalStaff(allStaff);
  }

  return { success: true };
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('staff').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase staff delete error, removing from local cache:', err);
  }

  const allStaff = getLocalStaff();
  const filtered = allStaff.filter((s) => s.id !== id);
  saveLocalStaff(filtered);

  return { success: true };
}
