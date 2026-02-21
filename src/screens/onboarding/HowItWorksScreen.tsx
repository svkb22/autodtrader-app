import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "ConnectBroker") => void };
};

const steps = [
  "Scan liquid stocks",
  "Detect high-quality setup",
  "You approve (or auto-approve)",
  "Risk limits enforced",
  "Positions closed intraday",
];

export default function HowItWorksScreen({ navigation }: Props): React.JSX.Element {
  useEffect(() => {
    track("onboarding_step_viewed", { step: "how_it_works" });
  }, []);

  return (
    <OnboardingLayout
      step={2}
      totalSteps={7}
      title="How it works"
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "how_it_works" });
        navigation.navigate("ConnectBroker");
      }}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
      tertiaryLabel="Skip Tour"
      onTertiary={() => navigation.navigate("ConnectBroker")}
    >
      <View style={styles.card}>
        {steps.map((item, index) => (
          <View key={item} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.item}>{item}</Text>
          </View>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  item: {
    color: "#0f172a",
    fontSize: 15,
  },
});
