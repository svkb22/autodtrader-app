import React, { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { initNotificationTapHandler } from "@/notifications/notifications";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import AutoExecuteSettingsScreen from "@/screens/AutoExecuteSettingsScreen";
import ConnectBrokerScreen from "@/screens/ConnectBrokerScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import ProposalDetailScreen from "@/screens/ProposalDetailScreen";
import ProposalScreen from "@/screens/ProposalScreen";
import RiskSettingsScreen from "@/screens/RiskSettingsScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type AppStackParamList = {
  Tabs: undefined;
  ConnectBroker: undefined;
  RiskSettings: undefined;
  AutoExecuteSettings: undefined;
  Proposal: { proposalId?: string } | undefined;
  ProposalDetail: { proposalId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

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
        component={SettingsScreen}
        options={{
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
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator(): React.JSX.Element {
  const { isAuthed } = useAuth();
  const { completed } = useOnboarding();

  useEffect(() => {
    const disposeTap = initNotificationTapHandler((proposalId?: string) => {
      if (!isAuthed || !completed) return;
      if (navigationRef.isReady()) {
        navigationRef.navigate("Proposal", proposalId ? { proposalId } : undefined);
      }
    });

    return () => {
      disposeTap();
    };
  }, [completed, isAuthed]);

  return (
    <NavigationContainer ref={navigationRef}>
      {!isAuthed ? <AuthNavigator /> : completed ? <AppStackNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
