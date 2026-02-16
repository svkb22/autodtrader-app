import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Loading(): JSX.Element {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
