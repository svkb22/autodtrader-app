import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "ReviewActivate") => void };
};

const bullets = [
  "Some days will have no trades.",
  "The goal is consistency, not frequency.",
  "Losses can occur; risk limits help contain them.",
  "All positions are closed by market close.",
];

export default function ExpectationsScreen({ navigation }: Props): React.JSX.Element {
  useEffect(() => {
    track("onboarding_step_viewed", { step: "expectations" });
  }, []);

  return (
    <OnboardingLayout
      step={6}
      totalSteps={7}
      title="What to expect"
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "expectations" });
        navigation.navigate("ReviewActivate");
      }}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
    >
      <View style={styles.card}>
        {bullets.map((bullet) => (
          <Text key={bullet} style={styles.bullet}>
            {`• ${bullet}`}
          </Text>
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
    gap: 8,
  },
  bullet: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 22,
  },
});
