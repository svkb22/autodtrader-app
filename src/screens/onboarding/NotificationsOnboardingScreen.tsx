import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import { registerDevice, toApiError } from "@/api/client";
import { registerForPushNotificationsAsync } from "@/notifications/notifications";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "Expectations") => void };
};

export default function NotificationsOnboardingScreen({ navigation }: Props): React.JSX.Element {
  const { draft, setNotificationsStatus } = useOnboarding();
  const [statusLabel, setStatusLabel] = useState<string>(draft.notificationsStatus);
  const [errorText, setErrorText] = useState<string>("");

  useEffect(() => {
    track("onboarding_step_viewed", { step: "notifications" });
  }, []);

  const requestPermission = async () => {
    setErrorText("");
    track("notifications_permission_prompted");

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await registerDevice("ios", token);
        setNotificationsStatus("granted");
        setStatusLabel("granted");
        track("notifications_permission_result", { status: "granted" });
        return;
      }
      setNotificationsStatus("denied");
      setStatusLabel("denied");
      track("notifications_permission_result", { status: "denied" });
    } catch (error) {
      setNotificationsStatus("denied");
      setStatusLabel("denied");
      setErrorText(toApiError(error));
      track("notifications_permission_result", { status: "denied" });
    }
  };

  return (
    <OnboardingLayout
      step={5}
      totalSteps={7}
      title="Enable notifications"
      subtitle="We’ll notify you when a high-quality setup is ready. You’ll have about 2 minutes to approve."
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "notifications" });
        navigation.navigate("Expectations");
      }}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
      tertiaryLabel="Enable Notifications"
      onTertiary={() => {
        void requestPermission();
      }}
    >
      <View style={styles.card}>
        <Text style={styles.status}>Status: {statusLabel}</Text>
        {statusLabel === "denied" ? (
          <Text style={styles.warning}>You can still use the app, but you may miss proposals.</Text>
        ) : null}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
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
    gap: 10,
  },
  status: {
    color: "#334155",
    fontSize: 13,
  },
  warning: {
    color: "#92400e",
    fontSize: 13,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});
