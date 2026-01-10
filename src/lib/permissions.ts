// Role-based access control configuration
export type UserRole = 'admin' | 'manager' | 'cashier' | 'user';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
}

// Define which roles can access which routes
export const posRoutePermissions: RoutePermission[] = [
  // Admin-only routes
  { path: '/owner', allowedRoles: ['admin'] },
  { path: '/settings', allowedRoles: ['admin', 'manager'] },
  
  // Manager and above
  { path: '/reports', allowedRoles: ['admin', 'manager'] },
  { path: '/stock', allowedRoles: ['admin', 'manager'] },
  { path: '/products', allowedRoles: ['admin', 'manager'] },
  { path: '/loans', allowedRoles: ['admin', 'manager'] },
  
  // All authenticated users (cashier and above)
  { path: '/', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
  { path: '/pos', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/sales', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/customers', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/scanner', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/notifications', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
];

export const hotelRoutePermissions: RoutePermission[] = [
  // Admin-only routes
  { path: '/hotel/settings', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/staff', allowedRoles: ['admin', 'manager'] },
  
  // Manager and above
  { path: '/hotel/reports', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/billing', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/service-menu', allowedRoles: ['admin', 'manager'] },
  
  // All hotel staff
  { path: '/hotel', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
  { path: '/hotel/pos', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/rooms', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/bookings', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/check-in-out', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/guests', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/housekeeping', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
];

/**
 * Check if a user role has access to a specific route
 */
export function hasRouteAccess(path: string, userRole: UserRole | null): boolean {
  if (!userRole) return false;
  
  // Combine all permissions
  const allPermissions = [...posRoutePermissions, ...hotelRoutePermissions];
  
  // Find the permission for this path
  const permission = allPermissions.find(p => p.path === path);
  
  // If no specific permission is defined, allow access (fallback)
  if (!permission) return true;
  
  return permission.allowedRoles.includes(userRole);
}

/**
 * Filter navigation items based on user role
 */
export function filterNavigationByRole<T extends { href: string }>(
  items: T[],
  userRole: UserRole | null,
  mode: 'pos' | 'hotel'
): T[] {
  if (!userRole) return [];
  
  const permissions = mode === 'hotel' ? hotelRoutePermissions : posRoutePermissions;
  
  return items.filter(item => {
    const permission = permissions.find(p => p.path === item.href);
    
    // If no specific permission, allow access
    if (!permission) return true;
    
    return permission.allowedRoles.includes(userRole);
  });
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    cashier: 'Cashier',
    user: 'User',
  };
  return names[role] || role;
}
