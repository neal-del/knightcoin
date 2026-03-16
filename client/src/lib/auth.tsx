import { createContext, useContext, useState, useCallback } from "react";
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
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  login: async () => {},
  adminLogin: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/admin-login", { email, password });
    const data = await res.json();
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, displayName });
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
    <AuthContext.Provider value={{ user, isAdmin, login, adminLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
