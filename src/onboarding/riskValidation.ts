import { CapitalLimitMode, RiskDraft } from "@/onboarding/types";

type ValidationResult = {
  valid: boolean;
  message: string | null;
};

const CAPITAL_USD_MIN = 50;
const CAPITAL_USD_MAX = 100000;
const CAPITAL_PCT_MIN = 0.01;
const CAPITAL_PCT_MAX = 1;

export function parseNumericInput(value: string): number {
  const normalized = value.trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateRiskDraft(draft: RiskDraft): ValidationResult {
  const capitalCheck = validateCapital(draft.capital_limit_mode, draft.capital_limit_value);
  if (!capitalCheck.valid) return capitalCheck;

  if (!Number.isFinite(draft.max_daily_loss_usd) || draft.max_daily_loss_usd <= 0) {
    return { valid: false, message: "Max daily loss must be greater than 0." };
  }

  if (!Number.isInteger(draft.max_trades_per_day) || draft.max_trades_per_day < 1 || draft.max_trades_per_day > 5) {
    return { valid: false, message: "Max trades per day must be between 1 and 5." };
  }

  if (draft.capital_limit_mode === "usd" && draft.max_daily_loss_usd > draft.capital_limit_value) {
    return { valid: false, message: "Max daily loss cannot exceed capital allocation." };
  }

  return { valid: true, message: null };
}

export function validateCapital(mode: CapitalLimitMode, value: number): ValidationResult {
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, message: "Capital allocation must be greater than 0." };
  }

  if (mode === "usd") {
    if (value < CAPITAL_USD_MIN || value > CAPITAL_USD_MAX) {
      return { valid: false, message: `Capital allocation must be between $${CAPITAL_USD_MIN} and $${CAPITAL_USD_MAX}.` };
    }
    return { valid: true, message: null };
  }

  if (value < CAPITAL_PCT_MIN || value > CAPITAL_PCT_MAX) {
    return { valid: false, message: "Capital percentage must be between 0.01 and 1.00." };
  }
  return { valid: true, message: null };
}
