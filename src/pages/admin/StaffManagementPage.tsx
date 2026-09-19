// src/pages/admin/StaffManagementPage.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Utensils,
  Building2,
  BedDouble,
  Layers,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  fetchStaffMembers,
  createStaffMember,
  updateStaffMember,
  resetStaffPassword,
  deleteStaffMember,
} from '@/lib/staffService';
import type { StaffMember, StaffRole, AccessScope } from '@/types/staff';
import { STAFF_ROLES, ALL_PERMISSIONS } from '@/types/staff';
import { triggerHaptic } from '@/lib/haptics';

export default function StaffManagementPage() {
  const { restaurant } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'restaurant' | 'hotel' | 'both'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Available Dining Tables and Hotel Rooms for assignments
  const [availableTables, setAvailableTables] = useState<{ id: string; table_number: string; table_name?: string }[]>([]);
  const [availableRooms, setAvailableRooms] = useState<{ id: string; room_number: string; room_name?: string }[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [assigningStaff, setAssigningStaff] = useState<StaffMember | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<StaffRole>('WAITER');
  const [formDepartment, setFormDepartment] = useState('Service');
  const [formAccessScope, setFormAccessScope] = useState<AccessScope>('restaurant');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formSelectedPermissions, setFormSelectedPermissions] = useState<string[]>([]);
  const [formAssignedTables, setFormAssignedTables] = useState<string[]>([]);
  const [formAssignedRooms, setFormAssignedRooms] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New Password State for Reset Modal
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Assignment Modal State
  const [assignTables, setAssignTables] = useState<string[]>([]);
  const [assignRooms, setAssignRooms] = useState<string[]>([]);

  // Load staff and restaurant entities
  const loadData = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      // 1. Staff
      const staff = await fetchStaffMembers(restaurant.id);
      setStaffList(staff);

      // 2. Tables
      const { data: tablesData } = await supabase
        .from('dining_tables')
        .select('id, table_number, table_name')
        .eq('restaurant_id', restaurant.id)
        .order('table_number', { ascending: true });

      if (tablesData && tablesData.length > 0) {
        setAvailableTables(tablesData);
      } else {
        // Fallback demo tables
        setAvailableTables([
          { id: '1', table_number: '1', table_name: 'Window Booth' },
          { id: '2', table_number: '2', table_name: 'Garden Terrace' },
          { id: '3', table_number: '3', table_name: 'Family Table' },
          { id: '4', table_number: '4', table_name: 'Main Hall' },
          { id: '5', table_number: '5', table_name: 'Bar Counter' },
          { id: '6', table_number: '6', table_name: 'Private Dining' },
        ]);
      }

      // 3. Rooms
      const { data: roomsData } = await supabase
        .from('hotel_rooms')
        .select('id, room_number, room_name')
        .eq('restaurant_id', restaurant.id)
        .order('room_number', { ascending: true });

      if (roomsData && roomsData.length > 0) {
        setAvailableRooms(roomsData);
      } else {
        // Fallback demo rooms
        setAvailableRooms([
          { id: '101', room_number: '101', room_name: 'Deluxe Garden' },
          { id: '102', room_number: '102', room_name: 'Courtyard Premier' },
          { id: '201', room_number: '201', room_name: 'Mountain Suite' },
          { id: '202', room_number: '202', room_name: 'Family Suite' },
        ]);
      }
    } catch (err) {
      console.error('Error loading staff management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurant?.id]);

  // Handle role change to auto-set department and default permissions
  const handleRoleChange = (newRole: StaffRole) => {
    setFormRole(newRole);
    const meta = STAFF_ROLES[newRole];
    if (meta) {
      setFormDepartment(meta.department);
      setFormAccessScope(meta.category);
      setFormSelectedPermissions(meta.defaultPermissions);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    triggerHaptic('light');
    setEditingStaff(null);
    setFormName('');
    setFormMobile('');
    setFormPassword('');
    setFormRole('WAITER');
    setFormDepartment('Service');
    setFormAccessScope('restaurant');
    setFormStatus('active');
    setFormSelectedPermissions(STAFF_ROLES.WAITER.defaultPermissions);
    setFormAssignedTables([]);
    setFormAssignedRooms([]);
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffMember) => {
    triggerHaptic('light');
    setEditingStaff(staff);
    setFormName(staff.full_name);
    setFormMobile(staff.mobile);
    setFormPassword('');
    setFormRole(staff.role);
    setFormDepartment(staff.department);
    setFormAccessScope(staff.access_scope);
    setFormStatus(staff.status);
    setFormSelectedPermissions(staff.permissions || []);
    setFormAssignedTables(staff.assigned_tables || []);
    setFormAssignedRooms(staff.assigned_rooms || []);
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Assignments Modal
  const openAssignModal = (staff: StaffMember) => {
    triggerHaptic('light');
    setAssigningStaff(staff);
    setAssignTables(staff.assigned_tables || []);
    setAssignRooms(staff.assigned_rooms || []);
  };

  // Save Staff (Add or Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Please enter full name');
      return;
    }

    const cleanMobile = formMobile.trim().replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }

    setSaving(true);
    triggerHaptic('medium');

    try {
      if (editingStaff) {
        // Update existing
        const res = await updateStaffMember(editingStaff.id, {
          full_name: formName.trim(),
          mobile: cleanMobile,
          role: formRole,
          department: formDepartment,
          access_scope: formAccessScope,
          status: formStatus,
          permissions: formSelectedPermissions,
          assigned_tables: formAssignedTables,
          assigned_rooms: formAssignedRooms,
        });

        if (res.success) {
          triggerHaptic('success');
          setShowAddModal(false);
          await loadData();
        } else {
          setFormError(res.error || 'Failed to update staff member');
        }
      } else {
        // Create new
        if (!formPassword || formPassword.length < 4) {
          setFormError('Password must be at least 4 characters');
          setSaving(false);
          return;
        }

        const res = await createStaffMember({
          restaurant_id: restaurant.id,
          full_name: formName.trim(),
          mobile: cleanMobile,
          password: formPassword,
          role: formRole,
          department: formDepartment,
          access_scope: formAccessScope,
          status: formStatus,
          permissions: formSelectedPermissions,
          assigned_tables: formAssignedTables,
          assigned_rooms: formAssignedRooms,
        });

        if (res.success) {
          triggerHaptic('success');
          setShowAddModal(false);
          await loadData();
        } else {
          setFormError(res.error || 'Failed to create staff member');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status directly
  const handleToggleStatus = async (staff: StaffMember) => {
    triggerHaptic('light');
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    await updateStaffMember(staff.id, { status: newStatus });
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s))
    );
  };

  // Save Assignments
  const handleSaveAssignments = async () => {
    if (!assigningStaff) return;
    setSaving(true);
    triggerHaptic('medium');
    await updateStaffMember(assigningStaff.id, {
      assigned_tables: assignTables,
      assigned_rooms: assignRooms,
    });
    setSaving(false);
    setAssigningStaff(null);
    triggerHaptic('success');
    await loadData();
  };

  // Reset Password Submit
  const handleResetPassword = async () => {
    if (!resetPasswordStaff || !newPassword || newPassword.length < 4) return;
    setSaving(true);
    triggerHaptic('medium');
    const res = await resetStaffPassword(resetPasswordStaff.id, newPassword);
    setSaving(false);
    if (res.success) {
      setResetSuccess(true);
      triggerHaptic('success');
      setTimeout(() => {
        setResetPasswordStaff(null);
        setNewPassword('');
        setResetSuccess(false);
      }, 1500);
    }
  };

  // Delete Staff Submit
  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    triggerHaptic('alert');
    setSaving(true);
    await deleteStaffMember(deletingStaff.id);
    setSaving(false);
    setDeletingStaff(null);
    await loadData();
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      // Search
      const matchesSearch =
        staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.mobile.includes(searchQuery) ||
        staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.department.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Scope
      if (scopeFilter !== 'all') {
        if (scopeFilter === 'both' && staff.access_scope !== 'both') return false;
        if (scopeFilter === 'restaurant' && staff.access_scope === 'hotel') return false;
        if (scopeFilter === 'hotel' && staff.access_scope === 'restaurant') return false;
      }

      // Role
      if (roleFilter !== 'all' && staff.role !== roleFilter) return false;

      // Status
      if (statusFilter !== 'all' && staff.status !== statusFilter) return false;

      return true;
    });
  }, [staffList, searchQuery, scopeFilter, roleFilter, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'active').length;
    const restaurantCount = staffList.filter((s) => s.access_scope === 'restaurant' || s.access_scope === 'both').length;
    const hotelCount = staffList.filter((s) => s.access_scope === 'hotel' || s.access_scope === 'both').length;
    return { total, active, restaurantCount, hotelCount };
  }, [staffList]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Staff & Roles Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manage restaurant & hotel staff accounts, assignments, roles, and mobile login credentials.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs native-press"
            title="Refresh Staff List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition native-press"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Staff</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Restaurant Staff</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.restaurantCount}</span>
            <Utensils className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Hotel Staff</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.hotelCount}</span>
            <Building2 className="w-4 h-4 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, mobile, role, department..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {Object.values(STAFF_ROLES).map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition native-press ${
              scopeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Operations ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('restaurant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition native-press flex items-center gap-1.5 ${
              scopeFilter === 'restaurant'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Utensils className="w-3 h-3" />
            <span>Restaurant Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('hotel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition native-press flex items-center gap-1.5 ${
              scopeFilter === 'hotel'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Hotel Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition native-press flex items-center gap-1.5 ${
              scopeFilter === 'both'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Cross-Functional (Both)</span>
          </button>
        </div>
      </div>

      {/* Staff List Grid / Table */}
      {filteredStaff.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No staff members found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try changing your search term or filters to find what you are looking for.'
              : 'Add your first staff member to enable role-based mobile login and task assignments.'}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const roleMeta = STAFF_ROLES[staff.role] || STAFF_ROLES.WAITER;
            return (
              <div
                key={staff.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Role badge + Status Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleMeta.badgeBg} ${roleMeta.color}`}
                    >
                      {roleMeta.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition ${
                        staff.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                      }`}
                      title="Click to toggle Active/Inactive"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          staff.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{staff.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Staff Info */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                      {staff.full_name[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {staff.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-medium">{staff.mobile}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Dept: <span className="font-medium text-slate-600 dark:text-slate-300">{staff.department}</span>
                      </p>
                    </div>
                  </div>

                  {/* Assignments Pills */}
                  <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                    {/* Tables */}
                    <div className="flex items-start gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tables</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {staff.assigned_tables && staff.assigned_tables.length > 0 ? (
                            staff.assigned_tables.map((tId) => {
                              const tObj = availableTables.find((t) => t.id === tId || t.table_number === tId);
                              return (
                                <span
                                  key={tId}
                                  className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold"
                                >
                                  T-{tObj?.table_number || tId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">All tables (Manager view)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rooms */}
                    <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                      <BedDouble className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Rooms</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {staff.assigned_rooms && staff.assigned_rooms.length > 0 ? (
                            staff.assigned_rooms.map((rId) => {
                              const rObj = availableRooms.find((r) => r.id === rId || r.room_number === rId);
                              return (
                                <span
                                  key={rId}
                                  className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 rounded text-[10px] font-bold"
                                >
                                  RM-{rObj?.room_number || rId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">All rooms (Supervisor view)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {staff.last_login
                        ? `Login: ${new Date(staff.last_login).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                        : 'Never logged in'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openAssignModal(staff)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                      title="Assign Tables & Rooms"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordStaff(staff);
                        setNewPassword('');
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
                      title="Reset Staff Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Staff Member"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStaff(staff)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                      title="Delete Staff Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT STAFF MODAL
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Set up mobile credentials and operational privileges
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs sm:text-sm">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (Login ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Staff will use this 10-digit number to log in.</p>
              </div>

              {/* Password (Required for Add, Optional for Edit) */}
              {!editingStaff && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Login Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {formShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Passwords are securely hashed using bcrypt.</p>
                </div>
              )}

              {/* Role Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <optgroup label="🍽️ Restaurant Staff Roles">
                    <option value="RESTAURANT_MANAGER">Restaurant Manager</option>
                    <option value="RESTAURANT_SUPERVISOR">Restaurant Supervisor</option>
                    <option value="CAPTAIN">Captain / Head Waiter</option>
                    <option value="WAITER">Waiter / Server</option>
                    <option value="KITCHEN_STAFF">Kitchen Staff / Chef</option>
                    <option value="CASHIER">Cashier / Billing</option>
                  </optgroup>
                  <optgroup label="🛎️ Hotel / Room Roles">
                    <option value="HOTEL_MANAGER">Hotel Manager</option>
                    <option value="HOTEL_SUPERVISOR">Hotel Supervisor</option>
                    <option value="RECEPTIONIST">Front Desk / Receptionist</option>
                    <option value="ROOM_SERVICE">Room Service Staff</option>
                    <option value="HOUSEKEEPING">Housekeeping Staff</option>
                    <option value="MAINTENANCE">Maintenance Staff</option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                  {STAFF_ROLES[formRole]?.description}
                </p>
              </div>

              {/* Department & Operational Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Access Scope
                  </label>
                  <select
                    value={formAccessScope}
                    onChange={(e) => setFormAccessScope(e.target.value as AccessScope)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden text-xs"
                  >
                    <option value="restaurant">Restaurant Only</option>
                    <option value="hotel">Hotel Only</option>
                    <option value="both">Both (Restaurant + Hotel)</option>
                  </select>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Account Status</p>
                  <p className="text-[10px] text-slate-400">Allow or revoke mobile login access</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === 'active' ? 'inactive' : 'active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    formStatus === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {formStatus === 'active' ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ASSIGN TABLES & ROOMS MODAL
         ========================================================================= */}
      {assigningStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Tables & Rooms</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For {assigningStaff.full_name} ({assigningStaff.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dining Tables Selection */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  <span>Assign Dining Tables</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setAssignTables(
                      assignTables.length === availableTables.length
                        ? []
                        : availableTables.map((t) => t.id)
                    )
                  }
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  {assignTables.length === availableTables.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {availableTables.map((t) => {
                  const isChecked = assignTables.includes(t.id) || assignTables.includes(t.table_number);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setAssignTables((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== t.id && id !== t.table_number)
                            : [...prev, t.id]
                        );
                      }}
                      className={`p-2 rounded-lg text-xs font-bold border transition text-center ${
                        isChecked
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      T-{t.table_number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hotel Rooms Selection */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Assign Hotel Rooms</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setAssignRooms(
                      assignRooms.length === availableRooms.length
                        ? []
                        : availableRooms.map((r) => r.id)
                    )
                  }
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  {assignRooms.length === availableRooms.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {availableRooms.map((r) => {
                  const isChecked = assignRooms.includes(r.id) || assignRooms.includes(r.room_number);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setAssignRooms((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== r.id && id !== r.room_number)
                            : [...prev, r.id]
                        );
                      }}
                      className={`p-2 rounded-lg text-xs font-bold border transition text-center truncate ${
                        isChecked
                          ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Room {r.room_number}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAssignments}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: RESET PASSWORD MODAL
         ========================================================================= */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Staff Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{resetPasswordStaff.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-scale-in" />
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Password Reset Successfully!</p>
                <p className="text-xs text-slate-500">The staff member can now log in with the new password.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setResetPasswordStaff(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || !newPassword || newPassword.length < 4}
                    onClick={handleResetPassword}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {saving ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: DELETE CONFIRMATION MODAL
         ========================================================================= */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Staff Member?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{deletingStaff.full_name}</strong> ({deletingStaff.mobile})? All table and room assignments will also be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteStaff}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
