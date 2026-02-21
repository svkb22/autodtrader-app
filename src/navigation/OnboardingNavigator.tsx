import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ConnectBrokerOnboardingScreen from "@/screens/onboarding/ConnectBrokerOnboardingScreen";
import ExpectationsScreen from "@/screens/onboarding/ExpectationsScreen";
import HowItWorksScreen from "@/screens/onboarding/HowItWorksScreen";
import NotificationsOnboardingScreen from "@/screens/onboarding/NotificationsOnboardingScreen";
import ReviewActivateScreen from "@/screens/onboarding/ReviewActivateScreen";
import RiskGuardrailsOnboardingScreen from "@/screens/onboarding/RiskGuardrailsOnboardingScreen";
import WelcomeScreen from "@/screens/onboarding/WelcomeScreen";

export type OnboardingStackParamList = {
  Welcome: undefined;
  HowItWorks: undefined;
  ConnectBroker: undefined;
  RiskGuardrails: undefined;
  Notifications: undefined;
  Expectations: undefined;
  ReviewActivate: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="ConnectBroker" component={ConnectBrokerOnboardingScreen} />
      <Stack.Screen name="RiskGuardrails" component={RiskGuardrailsOnboardingScreen} />
      <Stack.Screen name="Notifications" component={NotificationsOnboardingScreen} />
      <Stack.Screen name="Expectations" component={ExpectationsScreen} />
      <Stack.Screen name="ReviewActivate" component={ReviewActivateScreen} />
    </Stack.Navigator>
  );
}
