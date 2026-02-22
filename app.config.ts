import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AutoDTrader",
  slug: "autodtrader",
  scheme: "autodtrader",
  version: "0.1.0",
  orientation: "portrait",
  ios: {
    bundleIdentifier: "com.yourorg.autodtrader",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: ["expo-notifications"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: "8da9e7f6-1111-415b-a1b7-79644152cb32",
    },
  },
};

export default config;
