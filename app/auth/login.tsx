import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
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
const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";
const isExpoGo = Constants.appOwnership === "expo";
const googleConfigured =
  Platform.OS === "web"
    ? Boolean(googleWebClientId)
    : Platform.OS === "android"
      ? Boolean(googleAndroidClientId || googleExpoClientId || googleWebClientId)
      : Platform.OS === "ios"
        ? Boolean(googleIosClientId || googleExpoClientId || googleWebClientId)
        : Boolean(googleExpoClientId || googleWebClientId);
export default function Login() {
  const { isAuthenticated, loading, login, loginWithGoogleToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [handledGoogleToken, setHandledGoogleToken] = useState("");
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: "pendezaconnect" }),
    []
  );
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId || googleExpoClientId || undefined,
    clientId: googleExpoClientId || googleWebClientId || undefined,
    iosClientId: googleIosClientId || googleExpoClientId || undefined,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    webClientId: googleWebClientId || undefined
  });

  const handleGoogleResponse = useCallback(async (accessToken: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogleToken(accessToken);
      router.replace("/(tabs)");
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed."));
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogleToken]);

  useEffect(() => {
    const accessToken =
      response?.type === "success" ? response.authentication?.accessToken || "" : "";
    if (accessToken && accessToken !== handledGoogleToken && !googleLoading) {
      setHandledGoogleToken(accessToken);
      void handleGoogleResponse(accessToken);
    } else if (response && response.type !== "success") {
      setGoogleLoading(false);
    }
  }, [googleLoading, handleGoogleResponse, handledGoogleToken, response]);

  async function startGoogleSignIn() {
    setError("");

    if (isNativeMobile) {
      if (isExpoGo) {
        setError(
          "Google sign-in needs an Android development build. Run npm run mobile, then open the installed Pendeza Connect app instead of Expo Go."
        );
        return;
      }

      if (!googleWebClientId) {
        setError("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.");
        return;
      }

      setGoogleLoading(true);
      try {
        const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

        GoogleSignin.configure({
          scopes: ["openid", "profile", "email"],
          webClientId: googleWebClientId,
          iosClientId: googleIosClientId || undefined,
          offlineAccess: false
        });

        if (Platform.OS === "android") {
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true
          });
        }

        // Clear only this app's cached Google session so signIn presents the
        // account chooser. Do not revoke access, which would disconnect the app.
        if (GoogleSignin.hasPreviousSignIn()) {
          await GoogleSignin.signOut();
        }

        const signInResponse = await GoogleSignin.signIn();
        if ("type" in signInResponse && signInResponse.type === "cancelled") {
          return;
        }

        const tokens = await GoogleSignin.getTokens();
        const accessToken = tokens.accessToken;
        if (!accessToken) {
          setError("Google did not return an access token.");
          return;
        }

        await loginWithGoogleToken(accessToken);
        router.replace("/(tabs)");
      } catch (err) {
        const code =
          typeof err === "object" && err && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        const message = err instanceof Error ? err.message : String(err || "");

        if (code === "SIGN_IN_CANCELLED" || message.includes("SIGN_IN_CANCELLED")) {
          return;
        }

        if (message.includes("Native module") || message.includes("TurboModule")) {
          setError(
            "Google sign-in is not available in Expo Go. Run npm run mobile to install the Android development build."
          );
          return;
        }

        setError(getErrorMessage(err, "Google sign-in failed."));
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    if (!request) {
      setError("Google sign-in is not ready yet. Please try again.");
      return;
    }

    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed."));
      setGoogleLoading(false);
    }
  }

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
    if (currency === "UGX") {
      router.push("/donate");
      return;
    }
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
            <Text style={styles.secondaryDonateText}>Donate USD</Text>
          </Pressable>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.signInCard}>
        <Text style={styles.cardTitle}>Sign in</Text>

        <Pressable disabled={!googleConfigured || (!isNativeMobile && !request) || loading || googleLoading} onPress={startGoogleSignIn} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
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
