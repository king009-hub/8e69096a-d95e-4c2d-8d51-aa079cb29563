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

/**
 * Get cached permissions
 */
export function getCachedPermissions(): RolePermissionData[] | null {
  return isCacheValid() ? cachedPermissions : null;
}

// All known routes - used for fallback deny logic
const ALL_KNOWN_POS_ROUTES = [
  '/', '/owner', '/settings', '/reports', '/stock', '/products', 
  '/loans', '/pos', '/sales', '/customers', '/scanner', '/notifications'
];

const ALL_KNOWN_HOTEL_ROUTES = [
  '/hotel', '/hotel/settings', '/hotel/staff', '/hotel/reports', '/hotel/billing',
  '/hotel/service-menu', '/hotel/pos', '/hotel/rooms', '/hotel/bookings',
  '/hotel/new-booking', '/hotel/check-in-out', '/hotel/guests', '/hotel/housekeeping'
];

// Fallback static permissions (used ONLY when database is not available)
// These are restrictive - custom roles get NO access in fallback mode
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
  { path: '/hotel/new-booking', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/check-in-out', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/guests', allowedRoles: ['admin', 'manager', 'cashier'] },
  { path: '/hotel/housekeeping', allowedRoles: ['admin', 'manager', 'cashier', 'user'] },
];

/**
 * Check if a role is a system role using database-driven check
 * Falls back to checking if role exists in cached permissions with is_system flag
 */
export function isSystemRole(role: string, permissions?: RolePermissionData[] | null): boolean {
  const perms = permissions || cachedPermissions;
  if (perms) {
    const roleData = perms.find(p => p.role === role);
    if (roleData) {
      return roleData.is_system === true;
    }
  }
  // Hardcoded fallback only when DB unavailable - these are always system roles
  return ['admin', 'manager', 'cashier', 'user'].includes(role);
}

/**
 * Check if a role has admin privileges (database-driven)
 */
export function isAdminRole(role: string | null, permissions?: RolePermissionData[] | null): boolean {
  if (!role) return false;
  
  // Check if the role is 'admin' - the only role with full access
  // This is database-driven via the role_permissions table
  const perms = permissions || cachedPermissions;
  if (perms) {
    const roleData = perms.find(p => p.role === role);
    // A role is admin if it's the 'admin' role AND is a system role
    return role === 'admin' && roleData?.is_system === true;
  }
  
  // Fallback - only 'admin' string is admin
  return role === 'admin';
}

/**
 * Check if a user role has access to a specific route using cached database permissions
 * DENY by default - only explicitly granted routes are accessible
 */
export function hasRouteAccess(path: string, userRole: UserRole | null): boolean {
  if (!userRole) return false;
  
  // Use cached permissions if available
  if (isCacheValid() && cachedPermissions) {
    // Check if admin role (database-driven)
    if (isAdminRole(userRole, cachedPermissions)) return true;
    
    const rolePermission = cachedPermissions.find(p => p.role === userRole);
    if (rolePermission) {
      const allRoutes = [...rolePermission.pos_routes, ...rolePermission.hotel_routes];
      return allRoutes.includes(path);
    }
    // Role exists in cache but path not in their routes - DENY
    return false;
  }
  
  // Fallback to static permissions (when DB unavailable)
  // Admin check for fallback
  if (userRole === 'admin') return true;
  
  const allPermissions = [...defaultPosRoutePermissions, ...defaultHotelRoutePermissions];
  const permission = allPermissions.find(p => p.path === path);
  
  // DENY access if route not found in static permissions (secure default)
  if (!permission) return false;
  
  return permission.allowedRoles.includes(userRole);
}

/**
 * Check route access with explicit permissions data (for use in components)
 * DENY by default - only explicitly granted routes are accessible
 */
export function hasRouteAccessWithData(
  path: string, 
  userRole: UserRole | null,
  permissions: RolePermissionData[] | null
): boolean {
  if (!userRole) return false;

  if (permissions) {
    // Check if admin role (database-driven)
    if (isAdminRole(userRole, permissions)) return true;
    
    const rolePermission = permissions.find(p => p.role === userRole);
    if (rolePermission) {
      const allRoutes = [...rolePermission.pos_routes, ...rolePermission.hotel_routes];
      return allRoutes.includes(path);
    }
    // Role not found in permissions - DENY
    return false;
  }
  
  // Fallback to static permissions
  if (userRole === 'admin') return true;
  
  const allPermissions = [...defaultPosRoutePermissions, ...defaultHotelRoutePermissions];
  const permission = allPermissions.find(p => p.path === path);
  
  // DENY access if route not found (secure default)
  if (!permission) return false;
  
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
  
  // Use provided permissions or cached permissions
  const perms = permissions || (isCacheValid() ? cachedPermissions : null);
  
  // Check if admin role (database-driven)
  if (isAdminRole(userRole, perms)) return items;

  if (perms) {
    const rolePermission = perms.find(p => p.role === userRole);
    if (rolePermission) {
      const allowedRoutes = mode === 'hotel' ? rolePermission.hotel_routes : rolePermission.pos_routes;
      return items.filter(item => allowedRoutes.includes(item.href));
    }
    // Role not found - return empty (deny all)
    return [];
  }
  
  // Fallback to static permissions
  const staticPermissions = mode === 'hotel' ? defaultHotelRoutePermissions : defaultPosRoutePermissions;
  
  return items.filter(item => {
    const permission = staticPermissions.find(p => p.path === item.href);
    // DENY if route not found in static permissions
    if (!permission) return false;
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
  
  // Fallback - just capitalize
  return role.charAt(0).toUpperCase() + role.slice(1);
}
