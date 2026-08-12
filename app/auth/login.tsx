import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { getErrorMessage } from "@/api/client";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { openDonation } from "@/features/donations/openDonation";
import { useAuth } from "@/providers/AuthProvider";

WebBrowser.maybeCompleteAuthSession();

const googleExpoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "";
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleExpoClientId || "";
const googleConfigured =
  Platform.OS === "web"
    ? Boolean(googleWebClientId)
    : Platform.OS === "android"
      ? Boolean(googleAndroidClientId || googleExpoClientId || googleWebClientId)
      : Platform.OS === "ios"
        ? Boolean(googleIosClientId || googleExpoClientId || googleWebClientId)
        : Boolean(googleExpoClientId || googleWebClientId);
const missingGoogleClientId = "missing-google-client-id.apps.googleusercontent.com";

export default function Login() {
  const { isAuthenticated, loading, login, loginWithGoogleToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [handledGoogleToken, setHandledGoogleToken] = useState("");
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleAndroidClientId || googleExpoClientId || missingGoogleClientId,
    clientId: googleExpoClientId || googleWebClientId || missingGoogleClientId,
    iosClientId: googleIosClientId || googleExpoClientId || missingGoogleClientId,
    webClientId: googleWebClientId || missingGoogleClientId
  });

  async function handleGoogleResponse(idToken: string) {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogleToken(idToken);
      router.replace("/(tabs)");
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed."));
    } finally {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    const idToken = response?.type === "success" ? response.params.id_token : "";
    if (idToken && idToken !== handledGoogleToken && !googleLoading) {
      setHandledGoogleToken(idToken);
      void handleGoogleResponse(idToken);
    }
  }, [googleLoading, handledGoogleToken, response]);

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  async function submit() {
    setError("");
    setNotice("");
    try {
      await login({ username: username.trim(), password });
      router.replace("/(tabs)");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."));
    }
  }

  async function donate(currency: "UGX" | "USD") {
    setError("");
    const result = await openDonation(currency);
    setNotice(result.message);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="heart" color={colors.gold} size={28} />
        </View>
        <Text style={styles.brand}>Pendeza Connect</Text>
        <Text style={styles.tagline}>Sponsor Hope. Build Futures.</Text>
      </View>

      <View style={styles.donationCard}>
        <View style={styles.donationRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Donate UGX" onPress={() => donate("UGX")} style={({ pressed }) => [styles.primaryDonate, pressed && styles.pressed]}>
            <Ionicons name="phone-portrait" color="white" size={18} />
            <Text style={styles.primaryDonateText}>Donate UGX</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Donate dollars" onPress={() => donate("USD")} style={({ pressed }) => [styles.secondaryDonate, pressed && styles.pressed]}>
            <Ionicons name="card" color={colors.primaryDark} size={18} />
            <Text style={styles.secondaryDonateText}>Donate $</Text>
          </Pressable>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.signInCard}>
        <Text style={styles.cardTitle}>Sign in</Text>
        <Text style={styles.cardCopy}>Access your dashboard based on your account role.</Text>

        <Pressable disabled={!googleConfigured || !request || loading || googleLoading} onPress={() => promptAsync()} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
          {googleLoading ? <ActivityIndicator color={colors.text} /> : <Ionicons name="logo-google" color={colors.text} size={18} />}
          <Text style={styles.googleButtonText}>{googleLoading ? "Connecting to Google..." : googleConfigured ? "Continue with Google" : "Google sign-in not configured"}</Text>
        </Pressable>
        {!googleConfigured ? <Text style={styles.googleHelp}>Add Google client IDs in .env, then restart Expo.</Text> : null}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TextInput value={username} onChangeText={setUsername} placeholder="Username or email" placeholderTextColor="#94a3b8" autoCapitalize="none" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#94a3b8" secureTextEntry style={styles.input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={loading || googleLoading} onPress={submit} style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}>
          <Text style={styles.signInButtonText}>{loading ? "Signing in..." : "Sign in"}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Pendeza Uganda</Text>
        <Text style={styles.footerText}>Sponsorship, savings, and financial support in one secure system.</Text>
      </View>
    </Screen>
  );
}

const cardBase = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radius.lg,
  borderWidth: 1,
  padding: spacing.lg
};

const styles = StyleSheet.create({
  brand: { color: "white", fontSize: 28, fontWeight: "900", marginTop: spacing.md },
  cardCopy: { color: colors.muted, lineHeight: 21, marginTop: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  donationCard: { ...cardBase, marginBottom: spacing.lg },
  donationRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  error: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, color: colors.danger, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  footer: { alignItems: "center", marginBottom: spacing.lg, padding: spacing.lg },
  footerText: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs, textAlign: "center" },
  footerTitle: { color: colors.text, fontWeight: "900" },
  googleButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginBottom: spacing.md, marginTop: spacing.lg, padding: spacing.md },
  googleButtonText: { color: colors.text, fontWeight: "800" },
  googleHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md, marginTop: -spacing.sm },
  header: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 28, marginBottom: spacing.lg, marginTop: 18, padding: spacing.xl },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, marginBottom: spacing.md, padding: spacing.md },
  logo: { alignItems: "center", backgroundColor: "rgba(242,184,75,0.16)", borderColor: "rgba(242,184,75,0.34)", borderRadius: 22, borderWidth: 1, height: 62, justifyContent: "center", width: 62 },
  notice: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.md, borderWidth: 1, color: colors.warning, fontWeight: "700", marginTop: spacing.md, padding: spacing.md },
  pressed: { opacity: 0.78 },
  primaryDonate: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.md },
  primaryDonateText: { color: "white", fontWeight: "900" },
  secondaryDonate: { alignItems: "center", backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.md },
  secondaryDonateText: { color: colors.primaryDark, fontWeight: "900" },
  signInButton: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.md },
  signInButtonText: { color: "white", fontWeight: "900" },
  signInCard: { ...cardBase, marginBottom: spacing.lg, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 18 },
  tagline: { color: colors.gold, fontSize: 16, fontWeight: "900", marginTop: spacing.xs, textAlign: "center" }
});
