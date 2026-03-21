import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Falcun",
  slug: "autodtrader",
  scheme: "autodtrader",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/branding/falcun-mark-1024.png",
  splash: {
    image: "./assets/branding/falcun-mark-512.png",
    resizeMode: "contain",
    backgroundColor: "#0B1F2A",
  },
  web: {
    favicon: "./public/favicon.png",
    backgroundColor: "#0B1F2A",
    themeColor: "#0B1F2A",
  },
  ios: {
    bundleIdentifier: "com.falcun.app",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: ["expo-notifications"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    brandName: "Falcun",
    eas: {
      projectId: "8da9e7f6-1111-415b-a1b7-79644152cb32",
    },
  },
};

export default config;
