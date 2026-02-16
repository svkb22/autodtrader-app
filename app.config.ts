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
  },
  plugins: ["expo-notifications"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};

export default config;
