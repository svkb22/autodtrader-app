import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
};

type Point = { x: number; y: number };

export default function MiniSparkline({ data, width = 240, height = 44, color = "#334155" }: Props): React.JSX.Element {
  const points: Point[] = useMemo(() => {
    const vals = data.filter((v) => Number.isFinite(v));
    if (vals.length === 0) return [];
    if (vals.length === 1) return [{ x: 0, y: height / 2 }];

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1e-9);

    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return { x, y };
    });
  }, [data, width, height]);

  if (points.length <= 1) {
    return <View style={[styles.empty, { width, height }]} />;
  }

  return (
    <View style={[styles.wrap, { width, height }]}> 
      {points.slice(0, -1).map((p1, idx) => {
        const p2 = points[idx + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={`seg-${idx}`}
            style={[
              styles.segment,
              {
                left: p1.x,
                top: p1.y,
                width: length,
                borderTopColor: color,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    borderTopWidth: 1,
  },
  empty: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
});
