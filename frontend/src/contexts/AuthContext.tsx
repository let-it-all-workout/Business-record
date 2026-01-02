import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession, LoginCredentials, UserRole, Permission, ROLE_PERMISSIONS, Business } from '../types';

// Get API base URL (same logic as api.ts)
// Normalize: remove trailing slash if present
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

// Debug logging removed for security

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  business: Business | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  canSeeFinancialData: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifySession(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifySession = async (token: string) => {
    try {
      // Don't log token information (security)
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Debug logging removed for security

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setUser(data.user);
          setBusiness(data.business || null);
          setSession({
            userId: data.user.id,
            username: data.user.username,
            role: data.user.role,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } else {
          // Response is not JSON (likely HTML error page)
          console.warn('Auth endpoint returned non-JSON response. Server may not be running.');
          localStorage.removeItem('auth_token');
          setUser(null);
          setSession(null);
        }
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const loginUrl = `${API_BASE_URL}/auth/login`;
      
      // Test backend connectivity first
      try {
        const healthUrl = `${API_BASE_URL}/health`;
        const healthCheck = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!healthCheck.ok) {
          throw new Error('Health check failed');
        }
      } catch (healthError) {
        const apiUrl = API_BASE_URL || 'backend server';
        throw new Error(`Cannot connect to API server at ${apiUrl}. Please check your VITE_API_URL environment variable and ensure the backend is running.`);
      }
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const apiUrl = API_BASE_URL || 'backend server';
        const errorMsg = `Cannot connect to API server at ${apiUrl}. Please check your VITE_API_URL environment variable and ensure the backend is running.`;
        throw new Error(errorMsg);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        const errorMsg = error.error || 'Login failed';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      
      // Set user state from login response (don't wait for /auth/me)
      setUser(data.user);
      setBusiness(data.business || null);
      setSession({
        userId: data.user.id,
        username: data.user.username,
        role: data.user.role,
        token: data.token,
        expiresAt: data.expiresAt,
      });
      
      // Try to verify session in background (non-blocking)
      // This will update user state if /auth/me succeeds, but won't block if it fails
      verifySession(data.token).catch(err => {
        console.warn('[AuthContext] Background session verification failed (non-critical):', err);
        // Don't clear user state - we already have it from login response
      });
    } catch (error) {
      // Don't log sensitive error details in production
      if (import.meta.env.DEV) {
        console.error('Login error:', error);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setSession(null);
      setBusiness(null);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  // Check if user can see financial data (purchase prices, profits, COGS)
  // Only admin, super_admin, and manager can see financial data
  // Staff and viewer cannot see purchase prices or profits
  const canSeeFinancialData = (): boolean => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager';
  };

  const value: AuthContextType = {
    user,
    session,
    business,
    login,
    logout,
    hasPermission,
    hasRole,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    loading,
    canSeeFinancialData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

