import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { authFirebase, authVerify, setTokenGetter, setUnauthorizedHandler } from "@/api/client";
import { AuthUser } from "@/api/types";
import { auth } from "@/auth/firebase";
import { SessionProvider, clearAuthSession, getAuthSession, setAuthSession } from "@/auth/tokenStore";

export type AuthStateKind = "signedOut" | "signedIn_unverified" | "signedIn_verified";

type AuthState = {
  token: string | null;
  appAccessToken: string | null;
  firebaseIdToken: string | null;
  firebaseUser: User | null;
  user: AuthUser | null;
  userId: string | null;
  authState: AuthStateKind;
  isAuthed: boolean;
  loading: boolean;
  signIn: (email: string, code: string) => Promise<void>;
  signInOtp: (email: string, code: string) => Promise<void>;
  signInWithFirebase: (idToken: string) => Promise<void>;
  loginGoogle: (idToken?: string | null, accessToken?: string | null) => Promise<void>;
  signupEmail: (email: string, password: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function isGoogleUser(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === "google.com");
}

function normalizedAuthUser(user: User): AuthUser {
  return {
    id: user.uid,
    email: user.email ?? "",
    name: user.displayName,
    picture: user.photoURL,
  };
}

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [appAccessToken, setAppAccessToken] = useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthStateKind>("signedOut");
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionProvider, setSessionProvider] = useState<SessionProvider | null>(null);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      const session = await getAuthSession();
      if (!mounted) return;
      const restoredUser =
        session.user ??
        (session.userId
          ? {
              id: session.userId,
              email: "",
              name: null,
              picture: null,
            }
          : null);

      const restoredProvider = session.provider ?? (session.token ? "legacy" : null);
      setAppAccessToken(session.token);
      setSessionProvider(restoredProvider);
      setUser(restoredUser);
      setUserId(restoredUser?.id ?? session.userId);

      if (session.token) {
        setAuthState("signedIn_verified");
      }

      if (!auth) {
        setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setFirebaseUser(currentUser);

        if (!currentUser) {
          setFirebaseIdToken(null);

          if (restoredProvider === "legacy") {
            setAuthState("signedIn_verified");
          } else if (restoredProvider === "firebase") {
            await clearAuthSession();
            setAppAccessToken(null);
            setUser(null);
            setUserId(null);
            setSessionProvider(null);
            setAuthState("signedOut");
          }

          setLoading(false);
          return;
        }

        try {
          const idToken = await currentUser.getIdToken(true);
          setFirebaseIdToken(idToken);

          const verified = isGoogleUser(currentUser) || currentUser.emailVerified;
          if (!verified) {
            setAuthState("signedIn_unverified");
            setLoading(false);
            return;
          }

          const backend = await authFirebase(idToken);
          await setAuthSession(backend.accessToken, backend.user, "firebase");
          setSessionProvider("firebase");
          setAppAccessToken(backend.accessToken);
          setUser(backend.user);
          setUserId(backend.user.id);
          setAuthState("signedIn_verified");
        } catch {
          setAuthState("signedOut");
        } finally {
          setLoading(false);
        }
      });

      return unsubscribe;
    };

    let unsubscribeRef: (() => void) | undefined;
    restore().then((unsubscribe) => {
      unsubscribeRef = unsubscribe;
    });

    return () => {
      mounted = false;
      if (unsubscribeRef) unsubscribeRef();
    };
  }, []);

  useEffect(() => {
    setTokenGetter(() => appAccessToken);
  }, [appAccessToken]);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearAuthSession();
      setAppAccessToken(null);
      setUser(null);
      setUserId(null);
      setSessionProvider(null);
      setAuthState("signedOut");
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token: appAccessToken,
      appAccessToken,
      firebaseIdToken,
      firebaseUser,
      user,
      userId,
      authState,
      isAuthed: authState === "signedIn_verified" && Boolean(appAccessToken),
      loading,
      signIn: async (email: string, code: string) => {
        if (auth?.currentUser) {
          await firebaseSignOut(auth);
        }
        const session = await authVerify(email, code);
        const signedInUser: AuthUser = {
          id: session.user_id,
          email: email.trim().toLowerCase(),
          name: null,
          picture: null,
        };
        await setAuthSession(session.token, signedInUser, "legacy");
        setSessionProvider("legacy");
        setAppAccessToken(session.token);
        setUser(signedInUser);
        setUserId(signedInUser.id);
        setAuthState("signedIn_verified");
      },
      signInOtp: async (email: string, code: string) => {
        if (auth?.currentUser) {
          await firebaseSignOut(auth);
        }
        const session = await authVerify(email, code);
        const signedInUser: AuthUser = {
          id: session.user_id,
          email: email.trim().toLowerCase(),
          name: null,
          picture: null,
        };
        await setAuthSession(session.token, signedInUser, "legacy");
        setSessionProvider("legacy");
        setAppAccessToken(session.token);
        setUser(signedInUser);
        setUserId(signedInUser.id);
        setAuthState("signedIn_verified");
      },
      signInWithFirebase: async (idToken: string) => {
        const response = await authFirebase(idToken);
        await setAuthSession(response.accessToken, response.user, "firebase");
        setSessionProvider("firebase");
        setAppAccessToken(response.accessToken);
        setUser(response.user);
        setUserId(response.user.id);
        setAuthState("signedIn_verified");
      },
      loginGoogle: async (idToken?: string | null, accessToken?: string | null) => {
        if (!auth) {
          throw new Error("Firebase config is missing.");
        }
        if (!idToken && !accessToken) {
          throw new Error("Google did not return auth tokens.");
        }
        const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
        await signInWithCredential(auth, credential);
      },
      signupEmail: async (email: string, password: string) => {
        if (!auth) {
          throw new Error("Firebase config is missing.");
        }
        const creds = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(creds.user);
        setAuthState("signedIn_unverified");
      },
      loginEmail: async (email: string, password: string) => {
        if (!auth) {
          throw new Error("Firebase config is missing.");
        }
        const creds = await signInWithEmailAndPassword(auth, email.trim(), password);
        await reload(creds.user);
        const verified = creds.user.emailVerified;
        setAuthState(verified ? "signedIn_verified" : "signedIn_unverified");
      },
      resendVerification: async () => {
        if (!auth?.currentUser) {
          throw new Error("No user is signed in.");
        }
        await sendEmailVerification(auth.currentUser);
      },
      refreshVerificationStatus: async () => {
        if (!auth?.currentUser) return false;
        await reload(auth.currentUser);
        const verified = auth.currentUser.emailVerified;
        setAuthState(verified ? "signedIn_verified" : "signedIn_unverified");
        return verified;
      },
      sendPasswordReset: async (email: string) => {
        if (!auth) {
          throw new Error("Firebase config is missing.");
        }
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      },
      signOut: async () => {
        try {
          if (auth) {
            await firebaseSignOut(auth);
          }
        } catch {
          // noop
        }
        await clearAuthSession();
        setAppAccessToken(null);
        setFirebaseIdToken(null);
        setFirebaseUser(null);
        setUser(null);
        setUserId(null);
        setSessionProvider(null);
        setAuthState("signedOut");
      },
    }),
    [appAccessToken, authState, firebaseIdToken, firebaseUser, loading, user, userId]
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
