import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { navigate: (route: "HowItWorks" | "ConnectBroker") => void };
};

export default function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  useEffect(() => {
    track("onboarding_started");
    track("onboarding_step_viewed", { step: "welcome" });
  }, []);

  return (
    <OnboardingLayout
      step={1}
      totalSteps={7}
      title="Welcome"
      subtitle="Auto Day-Trader is a disciplined, low-frequency system for structured side income."
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "welcome" });
        navigation.navigate("HowItWorks");
      }}
      tertiaryLabel="Skip Tour"
      onTertiary={() => navigation.navigate("ConnectBroker")}
    >
      <View style={styles.card}>
        <Text style={styles.bullet}>0-1 trades per day</Text>
        <Text style={styles.bullet}>Strict risk guardrails</Text>
        <Text style={styles.bullet}>You stay in control</Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  bullet: {
    color: "#0f172a",
    fontSize: 15,
  },
});
