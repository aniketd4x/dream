// src/types/staff.ts

export type StaffRole =
  // Restaurant Roles
  | 'RESTAURANT_MANAGER'
  | 'RESTAURANT_SUPERVISOR'
  | 'CAPTAIN'
  | 'WAITER'
  | 'KITCHEN_STAFF'
  | 'CASHIER'
  // Hotel / Hospitality Roles
  | 'HOTEL_MANAGER'
  | 'HOTEL_SUPERVISOR'
  | 'RECEPTIONIST'
  | 'ROOM_SERVICE'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE';

export type AccessScope = 'restaurant' | 'hotel' | 'both';

export type StaffDepartment =
  | 'Management'
  | 'Service'
  | 'Kitchen'
  | 'Front Office'
  | 'Housekeeping'
  | 'Maintenance'
  | 'Accounts'
  | 'General';

export interface StaffMember {
  id: string;
  restaurant_id: string;
  full_name: string;
  mobile: string;
  password_hash?: string;
  role: StaffRole;
  department: string;
  access_scope: AccessScope;
  profile_photo?: string | null;
  status: 'active' | 'inactive';
  permissions: string[];
  assigned_tables?: string[]; // table_id[]
  assigned_rooms?: string[]; // room_id[]
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffAssignment {
  id: string;
  staff_id: string;
  table_id?: string;
  room_id?: string;
  restaurant_id: string;
}

export interface StaffRoleMeta {
  role: StaffRole;
  label: string;
  category: 'restaurant' | 'hotel' | 'both';
  department: StaffDepartment;
  description: string;
  defaultPermissions: string[];
  color: string;
  badgeBg: string;
}

export const STAFF_ROLES: Record<StaffRole, StaffRoleMeta> = {
  RESTAURANT_MANAGER: {
    role: 'RESTAURANT_MANAGER',
    label: 'Restaurant Manager',
    category: 'restaurant',
    department: 'Management',
    description: 'Full restaurant management, live dashboard, menu, staff, billing, reports & settings.',
    defaultPermissions: [
      'orders:view', 'orders:manage', 'orders:accept', 'orders:cancel',
      'tables:view', 'tables:manage', 'tables:assign',
      'menu:view', 'menu:manage',
      'staff:view', 'staff:manage',
      'payments:view', 'payments:manage',
      'reports:view',
      'settings:manage'
    ],
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  RESTAURANT_SUPERVISOR: {
    role: 'RESTAURANT_SUPERVISOR',
    label: 'Restaurant Supervisor',
    category: 'restaurant',
    department: 'Service',
    description: 'Floor supervision, active orders, waiter allocation, live customer requests & reports.',
    defaultPermissions: [
      'orders:view', 'orders:manage', 'orders:accept',
      'tables:view', 'tables:assign',
      'staff:view',
      'reports:view'
    ],
    color: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
  },
  CAPTAIN: {
    role: 'CAPTAIN',
    label: 'Captain / Head Waiter',
    category: 'restaurant',
    department: 'Service',
    description: 'Dining room management, QR orders, assign tables to waiters, accept & manage orders.',
    defaultPermissions: [
      'orders:view', 'orders:accept', 'orders:manage',
      'tables:view', 'tables:assign'
    ],
    color: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
  },
  WAITER: {
    role: 'WAITER',
    label: 'Waiter / Server',
    category: 'restaurant',
    department: 'Service',
    description: 'Assigned tables, accept QR orders, send to kitchen, mark served, customer assistance.',
    defaultPermissions: [
      'orders:view', 'orders:accept', 'orders:serve',
      'tables:view'
    ],
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  },
  KITCHEN_STAFF: {
    role: 'KITCHEN_STAFF',
    label: 'Kitchen Staff / Chef',
    category: 'restaurant',
    department: 'Kitchen',
    description: 'Live Kitchen Display (KDS), preparation status, food order tickets, mark dishes ready.',
    defaultPermissions: [
      'orders:view', 'orders:kitchen'
    ],
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  CASHIER: {
    role: 'CASHIER',
    label: 'Cashier / Billing',
    category: 'restaurant',
    department: 'Accounts',
    description: 'Order billing, invoice receipts, settle cash/card/UPI payments, sales reconciliation.',
    defaultPermissions: [
      'orders:view', 'payments:view', 'payments:collect', 'reports:view'
    ],
    color: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800',
  },
  HOTEL_MANAGER: {
    role: 'HOTEL_MANAGER',
    label: 'Hotel Manager',
    category: 'hotel',
    department: 'Management',
    description: 'Hotel operations, room inventory, housekeeping status, room service orders & settings.',
    defaultPermissions: [
      'rooms:view', 'rooms:manage',
      'room_service:view', 'room_service:manage',
      'housekeeping:view', 'housekeeping:manage',
      'staff:view', 'staff:manage',
      'payments:view', 'reports:view', 'settings:manage'
    ],
    color: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800',
  },
  HOTEL_SUPERVISOR: {
    role: 'HOTEL_SUPERVISOR',
    label: 'Hotel Supervisor',
    category: 'hotel',
    department: 'Front Office',
    description: 'Room readiness, room service dispatch, housekeeping allocation, guest assistance.',
    defaultPermissions: [
      'rooms:view', 'rooms:manage',
      'room_service:view', 'room_service:manage',
      'housekeeping:view'
    ],
    color: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800',
  },
  RECEPTIONIST: {
    role: 'RECEPTIONIST',
    label: 'Front Desk / Receptionist',
    category: 'hotel',
    department: 'Front Office',
    description: 'Guest check-in/out, room occupancy status, guest details, room billing & requests.',
    defaultPermissions: [
      'rooms:view', 'rooms:manage',
      'room_service:view', 'room_service:manage',
      'payments:view', 'payments:collect'
    ],
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  ROOM_SERVICE: {
    role: 'ROOM_SERVICE',
    label: 'Room Service Staff',
    category: 'hotel',
    department: 'Service',
    description: 'Guest in-room requests, accept, preparing, out for delivery, mark delivered.',
    defaultPermissions: [
      'rooms:view', 'room_service:view', 'room_service:deliver'
    ],
    color: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  HOUSEKEEPING: {
    role: 'HOUSEKEEPING',
    label: 'Housekeeping Staff',
    category: 'hotel',
    department: 'Housekeeping',
    description: 'Assigned rooms, room status (Clean/Dirty/Cleaning), linens, amenities delivery.',
    defaultPermissions: [
      'rooms:view', 'housekeeping:view', 'housekeeping:manage'
    ],
    color: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  },
  MAINTENANCE: {
    role: 'MAINTENANCE',
    label: 'Maintenance Staff',
    category: 'hotel',
    department: 'Maintenance',
    description: 'Room & property repairs, AC/electrical/plumbing maintenance requests, service notes.',
    defaultPermissions: [
      'rooms:view', 'maintenance:view', 'maintenance:manage'
    ],
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
  },
};

export const ALL_PERMISSIONS = [
  { key: 'orders:view', label: 'View Orders', category: 'Restaurant Orders' },
  { key: 'orders:accept', label: 'Accept & Reject Orders', category: 'Restaurant Orders' },
  { key: 'orders:kitchen', label: 'Kitchen KDS Prep Controls', category: 'Restaurant Orders' },
  { key: 'orders:serve', label: 'Mark Orders as Served', category: 'Restaurant Orders' },
  { key: 'orders:manage', label: 'Edit & Cancel Orders', category: 'Restaurant Orders' },

  { key: 'tables:view', label: 'View Dining Tables', category: 'Dining Tables' },
  { key: 'tables:assign', label: 'Assign Waiters to Tables', category: 'Dining Tables' },
  { key: 'tables:manage', label: 'Create & Edit Tables & QR', category: 'Dining Tables' },

  { key: 'menu:view', label: 'View Menu Items', category: 'Menu & Dishes' },
  { key: 'menu:manage', label: 'Create & Edit Menu Items', category: 'Menu & Dishes' },

  { key: 'rooms:view', label: 'View Hotel Rooms', category: 'Hotel & Rooms' },
  { key: 'rooms:manage', label: 'Manage Room Availability & Rates', category: 'Hotel & Rooms' },
  { key: 'room_service:view', label: 'View Room Service Orders', category: 'Hotel & Rooms' },
  { key: 'room_service:deliver', label: 'Deliver Room Service Orders', category: 'Hotel & Rooms' },
  { key: 'room_service:manage', label: 'Full Room Service Dispatch', category: 'Hotel & Rooms' },
  { key: 'housekeeping:view', label: 'View Housekeeping Queue', category: 'Hotel & Rooms' },
  { key: 'housekeeping:manage', label: 'Update Room Cleaning Status', category: 'Hotel & Rooms' },
  { key: 'maintenance:view', label: 'View Maintenance Requests', category: 'Hotel & Rooms' },
  { key: 'maintenance:manage', label: 'Update Repair Tickets & Notes', category: 'Hotel & Rooms' },

  { key: 'payments:view', label: 'View Payments & Bills', category: 'Finance & Billing' },
  { key: 'payments:collect', label: 'Settle Bills & Collect Payments', category: 'Finance & Billing' },
  { key: 'reports:view', label: 'View Reports & Analytics', category: 'Finance & Billing' },

  { key: 'staff:view', label: 'View Staff Members', category: 'Administration' },
  { key: 'staff:manage', label: 'Manage Staff Accounts & Roles', category: 'Administration' },
  { key: 'settings:manage', label: 'Edit Restaurant/Hotel Settings', category: 'Administration' },
];
