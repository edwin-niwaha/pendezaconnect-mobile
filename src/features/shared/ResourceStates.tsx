import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";

export function ResourceError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function ResourceEmpty({ text }: { text: string }) {
  return <EmptyState text={text} />;
}

export function PaginatedListFooter({
  endText,
  error,
  loading,
  loadingText,
  onRetry,
  showEnd
}: {
  endText: string;
  error?: string;
  loading: boolean;
  loadingText: string;
  onRetry: () => void;
  showEnd: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.footerState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.footerText}>{loadingText}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (showEnd) return <Text style={styles.endText}>{endText}</Text>;
  return null;
}

const styles = StyleSheet.create({
  endText: { color: colors.muted, fontSize: 12, fontWeight: "800", padding: spacing.lg, textAlign: "center", textTransform: "uppercase" },
  errorBox: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontWeight: "700", lineHeight: 20 },
  footerState: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  footerText: { color: colors.muted, fontWeight: "700" },
  retryButton: { alignSelf: "flex-start", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryText: { color: colors.danger, fontWeight: "900" }
});
