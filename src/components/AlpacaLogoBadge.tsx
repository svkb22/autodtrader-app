import React from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AlpacaLogoBadge({ size = 40, style }: Props): React.JSX.Element {
  return (
    <View style={[styles.outer, { width: size, height: size }, style]}>
      <Image
        source={require("../../assets/brokers/alpaca-symbol-yellow.png")}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <Text style={[styles.textFallback, { fontSize: Math.max(12, Math.round(size * 0.32)) }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
  },
  textFallback: {
    color: "#92400e",
    fontWeight: "800",
    position: "absolute",
    opacity: 0,
  },
});
