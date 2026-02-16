import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import Loading from "@/components/Loading";
import RootNavigator from "@/navigation/RootNavigator";

function AppShell(): JSX.Element {
  const { loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  return <RootNavigator />;
}

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
