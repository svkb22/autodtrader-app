import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import Loading from "@/components/Loading";
import RootNavigator from "@/navigation/RootNavigator";
import { OnboardingProvider, useOnboarding } from "@/onboarding/OnboardingContext";

function AppShell(): React.JSX.Element {
  const { loading } = useAuth();
  const { ready } = useOnboarding();

  useEffect(() => {
    console.info(`[boot][app] shell loading=${String(loading)} onboardingReady=${String(ready)}`);
  }, [loading, ready]);

  if (loading || !ready) {
    return <Loading />;
  }
  return <RootNavigator />;
}

function Providers(): React.JSX.Element {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <AppShell />
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <Providers />
    </SafeAreaProvider>
  );
}
