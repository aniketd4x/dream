// src/lib/staffService.ts
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { StaffMember, StaffRole, AccessScope } from '@/types/staff';
import { STAFF_ROLES } from '@/types/staff';



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

  try {
    const { data: staffRows, error: fetchErr } = await supabase
      .from('staff')
      .select('*')
      .ilike('mobile', `%${cleanMobile}`)
      .limit(5);

    if (fetchErr) {
      console.error('Supabase staff query error:', fetchErr.message);
      return { success: false, error: 'Database connection error. Please try again.' };
    }

    if (staffRows && staffRows.length > 0) {
      for (const staffRow of staffRows) {
        if (staffRow.status !== 'active') {
          return { success: false, error: 'Your staff account is currently deactivated. Please contact your manager.' };
        }

        // Verify bcrypt hash
        let isMatch = false;
        try {
          isMatch = await bcrypt.compare(password, staffRow.password_hash);
        } catch (_) {}

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
            restaurant: restData ? {
              ...restData,
              currency: restData.currency || 'INR',
              currency_symbol: restData.currency_symbol || '₹',
            } : {
              id: staffRow.restaurant_id,
              name: 'Restaurant / Hotel',
              currency: 'INR',
              currency_symbol: '₹',
            },
          };
        }
      }
      return { success: false, error: 'Invalid password. Please check and try again.' };
    }
  } catch (err: any) {
    console.error('Staff authentication error:', err);
    return { success: false, error: err?.message || 'Authentication error' };
  }

  return { success: false, error: 'No active staff account found with this mobile number.' };
}

/**
 * Fetch all staff members for a restaurant (Direct Supabase)
 */
export async function fetchStaffMembers(restaurantId: string): Promise<StaffMember[]> {
  try {
    const { data: staffRows, error } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff from Supabase:', error.message);
      return [];
    }

    if (staffRows && staffRows.length > 0) {
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

      return staffRows.map((s) => ({
        ...s,
        assigned_tables: tableMap[s.id] || [],
        assigned_rooms: roomMap[s.id] || [],
      }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching staff members:', err);
    return [];
  }
}

/**
 * Create a new staff member with bcrypt-hashed password (Direct Supabase)
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

  try {
    // Check mobile uniqueness within this restaurant in Supabase
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('restaurant_id', data.restaurant_id)
      .ilike('mobile', `%${cleanMobile}`)
      .limit(1);

    if (existingStaff && existingStaff.length > 0) {
      return { success: false, error: 'A staff member with this mobile number already exists in this restaurant.' };
    }

    // Hash password securely with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const newStaffId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: inserted, error } = await supabase
      .from('staff')
      .insert({
        id: newStaffId,
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
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert table assignments
    if (data.assigned_tables && data.assigned_tables.length > 0) {
      const tableRows = data.assigned_tables.map((tId) => ({
        staff_id: newStaffId,
        table_id: tId,
        restaurant_id: data.restaurant_id,
      }));
      await supabase.from('staff_table_assignments').insert(tableRows);
    }

    // Insert room assignments
    if (data.assigned_rooms && data.assigned_rooms.length > 0) {
      const roomRows = data.assigned_rooms.map((rId) => ({
        staff_id: newStaffId,
        room_id: rId,
        restaurant_id: data.restaurant_id,
      }));
      await supabase.from('staff_room_assignments').insert(roomRows);
    }

    const createdStaff: StaffMember = {
      ...(inserted as StaffMember),
      assigned_tables: data.assigned_tables || [],
      assigned_rooms: data.assigned_rooms || [],
    };

    return { success: true, staff: createdStaff };
  } catch (err: any) {
    console.error('Supabase staff insert error:', err);
    return { success: false, error: err?.message || 'Failed to create staff member' };
  }
}

/**
 * Update staff details, role, status or assignments (Direct Supabase)
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

    const { error: updateErr } = await supabase.from('staff').update(supabaseUpdates).eq('id', id);
    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

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

    return { success: true };
  } catch (err: any) {
    console.error('Supabase staff update error:', err);
    return { success: false, error: err?.message || 'Failed to update staff' };
  }
}

/**
 * Reset staff password securely using bcrypt (Direct Supabase)
 */
export async function resetStaffPassword(id: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters.' };
  }

  try {
    const newHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('staff')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase staff password update error:', err);
    return { success: false, error: err?.message || 'Failed to reset password' };
  }
}

/**
 * Delete a staff member (Direct Supabase)
 */
export async function deleteStaffMember(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete table assignments and room assignments first
    await supabase.from('staff_table_assignments').delete().eq('staff_id', id);
    await supabase.from('staff_room_assignments').delete().eq('staff_id', id);

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase staff delete error:', err);
    return { success: false, error: err?.message || 'Failed to delete staff' };
  }
}
