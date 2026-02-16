import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { authVerify, setTokenGetter } from "@/api/client";
import { clearAuthSession, getAuthSession, setAuthSession } from "@/auth/tokenStore";

type AuthState = {
  token: string | null;
  userId: string | null;
  isAuthed: boolean;
  loading: boolean;
  signIn: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getAuthSession()
      .then((session) => {
        if (!mounted) return;
        setToken(session.token);
        setUserId(session.userId);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      userId,
      isAuthed: Boolean(token),
      loading,
      signIn: async (email: string, code: string) => {
        const session = await authVerify(email, code);
        await setAuthSession(session.token, session.user_id);
        setToken(session.token);
        setUserId(session.user_id);
      },
      signOut: async () => {
        await clearAuthSession();
        setToken(null);
        setUserId(null);
      },
    }),
    [loading, token, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
