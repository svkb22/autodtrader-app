import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.open === "function") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    return;
  }

  try {
    if (typeof WebBrowser?.openBrowserAsync === "function") {
      await WebBrowser.openBrowserAsync(url);
      return;
    }
  } catch {
    // Fall through to Linking fallback.
  }

  await Linking.openURL(url);
}
