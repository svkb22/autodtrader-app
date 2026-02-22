import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { formatRemaining, getRemainingMs } from "@/utils/time";

type Props = {
  expiresAtISO: string;
  onExpire?: () => void;
};

export default function Countdown({ expiresAtISO, onExpire }: Props): React.JSX.Element {
  const [remainingMs, setRemainingMs] = useState<number>(() => getRemainingMs(expiresAtISO));

  useEffect(() => {
    setRemainingMs(getRemainingMs(expiresAtISO));
    const timer = setInterval(() => {
      setRemainingMs((prev) => {
        const next = getRemainingMs(expiresAtISO);
        if (prev > 0 && next <= 0) {
          onExpire?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAtISO, onExpire]);

  const label = useMemo(() => formatRemaining(remainingMs), [remainingMs]);
  return <Text style={styles.text}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
});
