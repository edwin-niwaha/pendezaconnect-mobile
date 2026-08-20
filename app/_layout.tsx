import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { colors, radius, spacing } from "@/constants/theme";
import { getProductionConfigError } from "@/config/environment";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotificationCoordinator } from "@/features/notifications/NotificationCoordinator";

export default function RootLayout() {
  const configError = getProductionConfigError();
  if (configError) {
    return (
      <View style={styles.configRoot}>
        <StatusBar style="dark" />
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Configuration required</Text>
          <Text style={styles.configText}>{configError}</Text>
          <Text style={styles.configHelp}>Set a secure production API URL, rebuild the app, and try again.</Text>
        </View>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <NotificationCoordinator />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  configRoot: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  configCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, width: "100%" },
  configHelp: { color: colors.muted, lineHeight: 20, marginTop: spacing.md },
  configText: { color: colors.danger, fontWeight: "800", lineHeight: 22, marginTop: spacing.sm },
  configTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }
});
