import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export const RowCard = React.memo(function RowCard({ title, subtitle, meta, onPress }: { title: string; subtitle?: string; meta?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  pressed: { opacity: 0.75 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: spacing.xs },
  meta: { color: colors.primaryDark, fontSize: 12, fontWeight: "700", marginTop: spacing.sm, textTransform: "uppercase" },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, minWidth: "45%", padding: spacing.lg },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: spacing.sm }
});
