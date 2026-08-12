import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

export default function Account() {
  const { user, logout } = useAuth();
  async function signOut() {
    await logout();
    router.replace("/auth/login");
  }
  return (
    <Screen title="Account">
      <Card>
        <Text style={styles.name}>{user?.first_name || user?.username}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <Text style={styles.muted}>Role: {user?.role}</Text>
        <Text style={styles.muted}>Account: {user?.account_type}</Text>
      </Card>
      <Pressable onPress={signOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 20, fontWeight: "900" },
  muted: { color: colors.muted, marginTop: spacing.sm },
  button: { alignItems: "center", backgroundColor: colors.danger, borderRadius: radius.sm, padding: spacing.md },
  buttonText: { color: "white", fontWeight: "900" }
});