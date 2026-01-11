// Role-based access control configuration
export type UserRole = string; // Allow any string for custom roles

export interface RoutePermission {
  path: string;
  allowedRoles: string[];
}

export interface RolePermissionData {
  role: string;
  pos_routes: string[];
  hotel_routes: string[];
  is_system?: boolean;
  color?: string;
  icon?: string;
}

// Cache for database permissions
let cachedPermissions: RolePermissionData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Set cached permissions from database (call this from components that fetch permissions)
 */
export function setCachedPermissions(permissions: RolePermissionData[]) {
  cachedPermissions = permissions;
  cacheTimestamp = Date.now();
}

/**
 * Clear the permissions cache (call when permissions are updated)
 */
export function clearPermissionsCache() {
  cachedPermissions = null;
  cacheTimestamp = 0;
}

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
  return cachedPermissions !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

// Fallback static permissions (used when database is not available)
export const defaultPosRoutePermissions: RoutePermission[] = [
  { path: '/owner', allowedRoles: ['admin'] },
  { path: '/settings', allowedRoles: ['admin', 'manager'] },
  { path: '/reports', allowedRoles: ['admin', 'manager'] },
  { path: '/stock', allowedRoles: ['admin', 'manager'] },
  { path: '/products', allowedRoles: ['admin', 'manager'] },
  { path: '/loans', allowedRoles: ['admin', 'manager'] },
  { path: '/', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
  { path: '/pos', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/sales', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/customers', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/scanner', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/notifications', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
];

export const defaultHotelRoutePermissions: RoutePermission[] = [
  { path: '/hotel/settings', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/staff', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/reports', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/billing', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel/service-menu', allowedRoles: ['admin', 'manager'] },
  { path: '/hotel', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
  { path: '/hotel/pos', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/rooms', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/bookings', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/check-in-out', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/guests', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/housekeeping', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
];

/**
 * Check if a user role has access to a specific route using cached database permissions
 */
export function hasRouteAccess(path: string, userRole: UserRole | null): boolean {
  if (!userRole) return false;
  
  // Admin always has full access
  if (userRole === 'admin') return true;

  // Use cached permissions if available
  if (isCacheValid() && cachedPermissions) {
    const rolePermission = cachedPermissions.find(p => p.role === userRole);
    if (rolePermission) {
      const allRoutes = [...rolePermission.pos_routes, ...rolePermission.hotel_routes];
      return allRoutes.includes(path);
    }
  }
  
  // Fallback to static permissions
  const allPermissions = [...defaultPosRoutePermissions, ...defaultHotelRoutePermissions];
  const permission = allPermissions.find(p => p.path === path);
  
  if (!permission) return true;
  
  return permission.allowedRoles.includes(userRole);
}

/**
 * Check route access with explicit permissions data (for use in components)
 */
export function hasRouteAccessWithData(
  path: string, 
  userRole: UserRole | null,
  permissions: RolePermissionData[] | null
): boolean {
  if (!userRole) return false;
  
  // Admin always has full access
  if (userRole === 'admin') return true;

  if (permissions) {
    const rolePermission = permissions.find(p => p.role === userRole);
    if (rolePermission) {
      const allRoutes = [...rolePermission.pos_routes, ...rolePermission.hotel_routes];
      return allRoutes.includes(path);
    }
  }
  
  // Fallback to static permissions
  const allPermissions = [...defaultPosRoutePermissions, ...defaultHotelRoutePermissions];
  const permission = allPermissions.find(p => p.path === path);
  
  if (!permission) return true;
  
  return permission.allowedRoles.includes(userRole);
}

/**
 * Filter navigation items based on user role and database permissions
 */
export function filterNavigationByRole<T extends { href: string }>(
  items: T[],
  userRole: UserRole | null,
  mode: 'pos' | 'hotel',
  permissions?: RolePermissionData[] | null
): T[] {
  if (!userRole) return [];
  
  // Admin always sees everything
  if (userRole === 'admin') return items;

  // Use provided permissions or cached permissions
  const perms = permissions || (isCacheValid() ? cachedPermissions : null);
  
  if (perms) {
    const rolePermission = perms.find(p => p.role === userRole);
    if (rolePermission) {
      const allowedRoutes = mode === 'hotel' ? rolePermission.hotel_routes : rolePermission.pos_routes;
      return items.filter(item => allowedRoutes.includes(item.href));
    }
  }
  
  // Fallback to static permissions
  const staticPermissions = mode === 'hotel' ? defaultHotelRoutePermissions : defaultPosRoutePermissions;
  
  return items.filter(item => {
    const permission = staticPermissions.find(p => p.path === item.href);
    if (!permission) return true;
    return permission.allowedRoles.includes(userRole);
  });
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole, permissions?: RolePermissionData[] | null): string {
  // Check if we have cached permissions with descriptions
  const perms = permissions || cachedPermissions;
  if (perms) {
    const roleData = perms.find(p => p.role === role);
    if (roleData) {
      // Capitalize first letter of role name
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
  
  // Fallback for system roles
  const names: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    cashier: 'Cashier',
    user: 'User',
  };
  return names[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Check if a role is a system role
 */
export function isSystemRole(role: string): boolean {
  return ['admin', 'manager', 'cashier', 'user'].includes(role);
}
