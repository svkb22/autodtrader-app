import React, { Suspense, lazy, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/auth/AuthContext";
import Loading from "@/components/Loading";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import AuthLandingScreen from "@/screens/AuthLandingScreen";
import EmailAuthScreen from "@/screens/EmailAuthScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import VerifyEmailScreen from "@/screens/VerifyEmailScreen";

const AutoExecuteSettingsScreen = lazy(() => import("@/screens/AutoExecuteSettingsScreen"));
const BrokerDetailScreen = lazy(() => import("@/screens/BrokerDetailScreen"));
const BrokersScreen = lazy(() => import("@/screens/BrokersScreen"));
const ConnectAlpacaScreen = lazy(() => import("@/screens/ConnectAlpacaScreen"));
const HistoryScreen = lazy(() => import("@/screens/HistoryScreen"));
const HomeScreen = lazy(() => import("@/screens/HomeScreen"));
const ProposalDetailScreen = lazy(() => import("@/screens/ProposalDetailScreen"));
const RiskSettingsScreen = lazy(() => import("@/screens/RiskSettingsScreen"));
const SettingsScreen = lazy(() => import("@/screens/SettingsScreen"));

export type AppStackParamList = {
  Tabs: undefined;
  RiskSettings: undefined;
  AutoExecuteSettings: undefined;
  Home: { proposalId?: string } | undefined;
  ProposalDetail: { proposalId: string };
};

type SettingsStackParamList = {
  SettingsHome: undefined;
  Brokers: undefined;
  BrokerDetail: undefined;
  ConnectAlpaca: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator();
const VerifyStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

function BackButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.backButton} accessibilityLabel="Back">
      <Text style={styles.backButtonText}>Back</Text>
    </Pressable>
  );
}

function TabBadge({ label, focused }: { label: string; focused: boolean }): React.JSX.Element {
  return (
    <View style={[styles.tabBadge, focused && styles.tabBadgeFocused]}>
      <Text style={[styles.tabBadgeText, focused && styles.tabBadgeTextFocused]}>{label}</Text>
    </View>
  );
}

function SettingsStackNavigator(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsStack.Navigator
        screenOptions={({ navigation }) => ({
          headerBackVisible: false,
          headerLeft: navigation.canGoBack() ? () => <BackButton onPress={navigation.goBack} /> : undefined,
        })}
      >
        <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ headerShown: false }} />
        <SettingsStack.Screen name="Brokers" component={BrokersScreen} options={{ title: "Brokers" }} />
        <SettingsStack.Screen name="BrokerDetail" component={BrokerDetailScreen} options={{ title: "Alpaca" }} />
        <SettingsStack.Screen name="ConnectAlpaca" component={ConnectAlpacaScreen} options={{ title: "Connect Alpaca" }} />
      </SettingsStack.Navigator>
    </Suspense>
  );
}

function AppTabs(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <Tabs.Navigator>
        <Tabs.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabBadge label="H" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabBadge label="T" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="Settings"
          component={SettingsStackNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabBadge label="S" focused={focused} />,
          }}
        />
      </Tabs.Navigator>
    </Suspense>
  );
}

function AppStackNavigator(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerBackVisible: false,
          headerLeft: navigation.canGoBack() ? () => <BackButton onPress={navigation.goBack} /> : undefined,
        })}
      >
        <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen name="RiskSettings" component={RiskSettingsScreen} options={{ title: "Risk Settings" }} />
        <Stack.Screen name="AutoExecuteSettings" component={AutoExecuteSettingsScreen} options={{ title: "Auto Execution" }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
        <Stack.Screen name="ProposalDetail" component={ProposalDetailScreen} options={{ title: "Proposal Detail" }} />
      </Stack.Navigator>
    </Suspense>
  );
}

function AuthNavigator(): React.JSX.Element {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} options={{ title: "Sign In" }} />
      <AuthStack.Screen name="EmailAuth" component={EmailAuthScreen} options={{ title: "Email" }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Reset Password" }} />
    </AuthStack.Navigator>
  );
}

function UnverifiedNavigator(): React.JSX.Element {
  return (
    <VerifyStack.Navigator>
      <VerifyStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
    </VerifyStack.Navigator>
  );
}

export default function RootNavigator(): React.JSX.Element {
  const { authState } = useAuth();
  const { completed } = useOnboarding();
  const navTreeKey = `${authState}-${completed ? "app" : "onboarding"}`;

  useEffect(() => {
    if (authState !== "signedIn_verified" || !completed) {
      return undefined;
    }

    let disposeTap: (() => void) | undefined;
    let cancelled = false;

    void import("@/notifications/notifications").then(({ initNotificationTapHandler }) => {
      if (cancelled) return;
      disposeTap = initNotificationTapHandler((proposalId?: string) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("Home", proposalId ? { proposalId } : undefined);
        }
      });
    });

    return () => {
      cancelled = true;
      if (disposeTap) {
        disposeTap();
      }
    };
  }, [authState, completed]);

  return (
    <NavigationContainer key={navTreeKey} ref={navigationRef}>
      {authState === "signedOut" ? <AuthNavigator /> : authState === "signedIn_unverified" ? <UnverifiedNavigator /> : completed ? <AppStackNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minHeight: 32,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  backButtonText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeFocused: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  tabBadgeText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  tabBadgeTextFocused: {
    color: "#ffffff",
  },
});
