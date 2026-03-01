import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import Loading from "@/components/Loading";
import RootNavigator from "@/navigation/RootNavigator";
import { OnboardingProvider, useOnboarding } from "@/onboarding/OnboardingContext";

function AppShell(): React.JSX.Element {
  const { loading } = useAuth();
  const { ready } = useOnboarding();
  const [iconsReady, setIconsReady] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    Promise.all([Ionicons.loadFont(), AntDesign.loadFont(), MaterialIcons.loadFont()])
      .catch(() => {
        // Do not block app render permanently if a font fails to preload.
      })
      .finally(() => {
        if (active) setIconsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !ready || !iconsReady) {
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
