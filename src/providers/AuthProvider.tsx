import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribeToSessionInvalidation } from "@/api/client";
import { authApi } from "@/api/services";
import { clearTokens, getTokens, saveTokens } from "@/utils/storage";
import { unregisterPushNotifications } from "@/features/notifications/notifications";
import type { User } from "@/types";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  loginWithGoogleToken: (token: string, tokenType?: "access" | "id") => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshMe = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const login = useCallback(async (payload: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await authApi.login(payload);
      const tokenSave = saveTokens({ access: response.access, refresh: response.refresh });
      setUser(response.user);
      try {
        await tokenSave;
      } catch (error) {
        setUser(null);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogleToken = useCallback(async (token: string, tokenType: "access" | "id" = "access") => {
    setLoading(true);
    try {
      const response = await authApi.googleLogin(token, tokenType);
      const tokenSave = saveTokens({ access: response.access, refresh: response.refresh });
      setUser(response.user);
      try {
        await tokenSave;
      } catch (error) {
        setUser(null);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await unregisterPushNotifications();
    } finally {
      const tokens = await getTokens();
      if (tokens?.refresh) await authApi.logout(tokens.refresh).catch(() => undefined);
      await clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => subscribeToSessionInvalidation(() => setUser(null)), []);

  useEffect(() => {
    let mounted = true;
    getTokens()
      .then((tokens) => (tokens?.access ? authApi.me() : null))
      .then((me) => {
        if (mounted && me) setUser(me);
      })
      .catch(async () => {
        await clearTokens();
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({ user, ready, loading, isAuthenticated: Boolean(user), login, loginWithGoogleToken, logout, refreshMe }),
    [loading, login, loginWithGoogleToken, logout, ready, refreshMe, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
