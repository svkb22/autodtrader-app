export type OAuthErrorCategory = "canceled" | "no_account" | "config" | "unknown";
export type OAuthAction = "retry" | "signup" | "back";

export type OAuthBannerState = {
  category: OAuthErrorCategory;
  title: string;
  message: string;
  severity: "info";
  primaryLabel: string;
  primaryAction: OAuthAction;
  secondaryLabel: string;
  secondaryAction: OAuthAction;
  rawErrorCode: string | null;
};

export type OAuthMappingInput = {
  resultType?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};

const CONFIG_ERROR_CODES = new Set(["invalid_client", "unauthorized_client", "redirect_uri_mismatch", "invalid_request"]);
const CANCEL_WORDS = ["cancel", "cancelled", "canceled", "closed", "dismiss", "window closed"];
const SIGNIN_WORDS = ["unauthorized", "login", "credentials", "account", "sign in", "signin", "not found"];

function normalize(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function parseOAuthErrorFromUrl(url: string | null | undefined): { error: string | null; errorDescription: string | null } {
  if (!url) return { error: null, errorDescription: null };
  try {
    const parsed = new URL(url);
    return {
      error: parsed.searchParams.get("error"),
      errorDescription: parsed.searchParams.get("error_description"),
    };
  } catch {
    return { error: null, errorDescription: null };
  }
}

export function mapOAuthResultToUIState(input: OAuthMappingInput): OAuthBannerState {
  const resultType = normalize(input.resultType);
  const error = normalize(input.error);
  const description = normalize(input.errorDescription);

  const hasCancelSignal =
    resultType === "dismiss" ||
    resultType === "cancel" ||
    resultType === "closed" ||
    (error === "access_denied" && includesAny(description, CANCEL_WORDS));

  if (hasCancelSignal) {
    return {
      category: "canceled",
      title: "Connection canceled",
      message: "No changes were made. You can try again anytime.",
      severity: "info",
      primaryLabel: "Try again",
      primaryAction: "retry",
      secondaryLabel: "Create Alpaca account",
      secondaryAction: "signup",
      rawErrorCode: error || (resultType || null),
    };
  }

  if (CONFIG_ERROR_CODES.has(error)) {
    return {
      category: "config",
      title: "Connection setup issue",
      message: "This appears to be a configuration issue. Please try again. If it persists, contact support.",
      severity: "info",
      primaryLabel: "Try again",
      primaryAction: "retry",
      secondaryLabel: "Back",
      secondaryAction: "back",
      rawErrorCode: error,
    };
  }

  const likelyNoAccount =
    error === "access_denied" ||
    includesAny(description, SIGNIN_WORDS) ||
    error === "unauthorized";

  if (likelyNoAccount) {
    return {
      category: "no_account",
      title: "Couldn’t sign in to Alpaca",
      message: "If you don’t have an Alpaca account yet, create one first, then return here to connect.",
      severity: "info",
      primaryLabel: "Create Alpaca account",
      primaryAction: "signup",
      secondaryLabel: "Try again",
      secondaryAction: "retry",
      rawErrorCode: error || null,
    };
  }

  return {
    category: "unknown",
    title: "Connection failed",
    message: "Please try again. If you don’t have an Alpaca account yet, create one and return to connect.",
    severity: "info",
    primaryLabel: "Try again",
    primaryAction: "retry",
    secondaryLabel: "Create Alpaca account",
    secondaryAction: "signup",
    rawErrorCode: error || (resultType || null),
  };
}
