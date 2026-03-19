import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";
import { prudexTheme } from "@/theme/prudex";

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
      title="Welcome to Prudex"
      subtitle="Prudex is a disciplined execution system for structured market participation."
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "welcome" });
        navigation.navigate("HowItWorks");
      }}
      tertiaryLabel="Skip Tour"
      onTertiary={() => navigation.navigate("ConnectBroker")}
    >
      <View style={styles.card}>
        <Text style={styles.bullet}>Qualified setups only</Text>
        <Text style={styles.bullet}>Risk-defined entries and exits</Text>
        <Text style={styles.bullet}>Execution aligned with your limits</Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: prudexTheme.colors.surface,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    padding: 16,
    gap: 10,
  },
  bullet: {
    color: prudexTheme.colors.textMuted,
    fontSize: 15,
  },
});
