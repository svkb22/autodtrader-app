import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/auth/AuthContext";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { initNotificationTapHandler } from "@/notifications/notifications";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import AuthLandingScreen from "@/screens/AuthLandingScreen";
import AutoExecuteSettingsScreen from "@/screens/AutoExecuteSettingsScreen";
import BrokerDetailScreen from "@/screens/BrokerDetailScreen";
import BrokersScreen from "@/screens/BrokersScreen";
import ConnectAlpacaScreen from "@/screens/ConnectAlpacaScreen";
import EmailAuthScreen from "@/screens/EmailAuthScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import HomeScreen from "@/screens/HomeScreen";
import PositionsScreen from "@/screens/PositionsScreen";
import ProposalDetailScreen from "@/screens/ProposalDetailScreen";
import RiskSettingsScreen from "@/screens/RiskSettingsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import VerifyEmailScreen from "@/screens/VerifyEmailScreen";

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
  );
}

function AppTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator>
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBadge label="H" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Positions"
        component={PositionsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBadge label="P" focused={focused} />,
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
  );
}

function AppStackNavigator(): React.JSX.Element {
  return (
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
    const disposeTap = initNotificationTapHandler((proposalId?: string) => {
      if (authState !== "signedIn_verified" || !completed) return;
      if (navigationRef.isReady()) {
        navigationRef.navigate("Home", proposalId ? { proposalId } : undefined);
      }
    });

    return () => {
      disposeTap();
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
