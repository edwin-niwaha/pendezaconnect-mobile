import { StyleSheet, Text, View } from "react-native";
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

const styles = StyleSheet.create({
  errorBox: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontWeight: "700", lineHeight: 20 }
});
