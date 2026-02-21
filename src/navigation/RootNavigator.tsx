import React, { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { initNotificationTapHandler } from "@/notifications/notifications";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import AuthLandingScreen from "@/screens/AuthLandingScreen";
import AutoExecuteSettingsScreen from "@/screens/AutoExecuteSettingsScreen";
import BrokerDetailScreen from "@/screens/BrokerDetailScreen";
import BrokersScreen from "@/screens/BrokersScreen";
import ConnectAlpacaScreen from "@/screens/ConnectAlpacaScreen";
import ConnectBrokerScreen from "@/screens/ConnectBrokerScreen";
import EmailAuthScreen from "@/screens/EmailAuthScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import ProposalDetailScreen from "@/screens/ProposalDetailScreen";
import ProposalScreen from "@/screens/ProposalScreen";
import RiskSettingsScreen from "@/screens/RiskSettingsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import VerifyEmailScreen from "@/screens/VerifyEmailScreen";

export type AppStackParamList = {
  Tabs: undefined;
  ConnectBroker: undefined;
  RiskSettings: undefined;
  AutoExecuteSettings: undefined;
  Proposal: { proposalId?: string } | undefined;
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

function SettingsStackNavigator(): React.JSX.Element {
  return (
    <SettingsStack.Navigator>
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "document-text" : "document-text-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

function AppStackNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ConnectBroker" component={ConnectBrokerScreen} options={{ title: "Connect Alpaca" }} />
      <Stack.Screen name="RiskSettings" component={RiskSettingsScreen} options={{ title: "Risk Settings" }} />
      <Stack.Screen name="AutoExecuteSettings" component={AutoExecuteSettingsScreen} options={{ title: "Auto Execution" }} />
      <Stack.Screen name="Proposal" component={ProposalScreen} options={{ title: "Proposal" }} />
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
      <AuthStack.Screen name="LegacyLogin" component={LoginScreen} options={{ title: "Default Login" }} />
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

  useEffect(() => {
    const disposeTap = initNotificationTapHandler((proposalId?: string) => {
      if (authState !== "signedIn_verified" || !completed) return;
      if (navigationRef.isReady()) {
        navigationRef.navigate("Proposal", proposalId ? { proposalId } : undefined);
      }
    });

    return () => {
      disposeTap();
    };
  }, [authState, completed]);

  return (
    <NavigationContainer ref={navigationRef}>
      {authState === "signedOut" ? <AuthNavigator /> : authState === "signedIn_unverified" ? <UnverifiedNavigator /> : completed ? <AppStackNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
