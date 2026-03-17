import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  walletAddress: string | null;
  role: string;
  balance: number;
  totalWinnings: number;
  totalBets: number;
  correctPredictions: number;
  lastDailyBonus: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  adminLogin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, displayName: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  adminLogin: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, attempt to restore session from cookie
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${'__PORT_5000__'.startsWith('__') ? '' : '__PORT_5000__'}/api/auth/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        // No valid session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe?: boolean) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe });
    const data = await res.json();
    setUser(data);
  }, []);

  const adminLogin = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    const res = await apiRequest("POST", "/api/auth/admin-login", { email, password, rememberMe });
    const data = await res.json();
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string, rememberMe?: boolean) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, displayName, rememberMe });
    const data = await res.json();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch {
      // Not logged in
    }
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, adminLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
