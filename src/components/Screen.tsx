import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

export function Screen({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </ScrollView>
  );
}

export function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>Loading...</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  state: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  stateText: { color: colors.muted, marginTop: spacing.sm }
});