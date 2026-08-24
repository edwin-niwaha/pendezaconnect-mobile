import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getErrorMessage } from "@/api/client";
import { colors } from "@/constants/theme";
import { openDonation } from "@/features/donations/openDonation";
import { useAuth } from "@/providers/AuthProvider";

WebBrowser.maybeCompleteAuthSession();

const heroSlides = [
  { image: require("../../assets/pendeza-kids.jpg"), kicker: "Education that lasts", title: "Sponsor hope. Build futures." },
  { image: require("../../assets/pendeza-kids-2.jpg"), kicker: "Stronger families", title: "Care that changes lives." },
  { image: require("../../assets/pendeza-hero.png"), kicker: "Pendeza Uganda", title: "Every child deserves a chance." }
] as const;

const googleExpoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "";
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleExpoClientId || "";
// expo-auth-session validates its platform client ID while rendering. Native
// builds use @react-native-google-signin/google-signin below, but this hook is
// still created for web support. Keep an inert value here so a build with no
// Google configuration can render the disabled sign-in button instead of
// crashing the entire route.
const googleAuthSessionClientId =
  Platform.OS === "android"
    ? googleAndroidClientId || googleExpoClientId || googleWebClientId || "google-auth-not-configured"
    : Platform.OS === "ios"
      ? googleIosClientId || googleExpoClientId || googleWebClientId || "google-auth-not-configured"
      : googleWebClientId || "google-auth-not-configured";
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
  const { height, width } = useWindowDimensions();
  const compact = height < 700;
  const heroHeight = Math.max(compact ? 92 : 120, Math.min(220, height - (compact ? 490 : 535)));
  const { isAuthenticated, loading, login, loginWithGoogleToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [handledGoogleToken, setHandledGoogleToken] = useState("");
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: "pendezaconnect" }),
    []
  );
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAuthSessionClientId,
    clientId: googleAuthSessionClientId,
    iosClientId: googleAuthSessionClientId,
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

        if (code === "DEVELOPER_ERROR" || message.includes("DEVELOPER_ERROR")) {
          setError(
            "Google sign-in is not configured for this APK's signing certificate. Add this build's SHA-1 to the org.pendeza.connect Android app in Firebase, download the updated google-services.json, and rebuild the APK."
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
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.pageInner, { maxWidth: Math.min(540, width) }]}>
        <View style={[styles.brandRow, compact && styles.brandRowCompact]}>
          <Image source={require("../../assets/logo.png")} style={[styles.brandLogo, compact && styles.brandLogoCompact]} />
          <View style={styles.brandCopy}><Text style={styles.brand}>Pendeza Connect</Text><Text style={styles.tagline}>Sponsor hope. Build futures.</Text></View>
          <View style={styles.secureBadge}><Ionicons name="shield-checkmark" color={colors.primaryDark} size={15} /></View>
        </View>

        <HeroCarousel height={heroHeight} />

        <View style={[styles.donationRow, compact && styles.donationRowCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Donate UGX" onPress={() => donate("UGX")} style={({ pressed }) => [styles.primaryDonate, pressed && styles.pressed]}><Ionicons name="phone-portrait-outline" color="white" size={17} /><Text style={styles.primaryDonateText}>Donate UGX</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Donate dollars" onPress={() => donate("USD")} style={({ pressed }) => [styles.secondaryDonate, pressed && styles.pressed]}><Ionicons name="card-outline" color={colors.primaryDark} size={17} /><Text style={styles.secondaryDonateText}>Donate USD</Text></Pressable>
        </View>
        {notice ? <Text numberOfLines={2} style={styles.notice}>{notice}</Text> : null}

        <View style={[styles.signInCard, compact && styles.signInCardCompact]}>
          <View style={styles.signInHeading}><View><Text style={styles.cardTitle}>Welcome back</Text><Text style={styles.cardCopy}>Sign in securely to continue</Text></View><Ionicons name="lock-closed-outline" color={colors.primaryDark} size={20} /></View>
          <Pressable disabled={!googleConfigured || (!isNativeMobile && !request) || loading || googleLoading} onPress={startGoogleSignIn} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
            {googleLoading ? <ActivityIndicator color={colors.text} /> : <Ionicons name="logo-google" color="#4285F4" size={18} />}
            <Text style={styles.googleButtonText}>{googleLoading ? "Connecting..." : googleConfigured ? "Continue with Google" : "Google sign-in not configured"}</Text>
          </Pressable>
          {!googleConfigured ? <Text style={styles.googleHelp}>Google sign-in needs configuration.</Text> : null}
          <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>or use your account</Text><View style={styles.divider} /></View>
          <View style={styles.inputWrap}><Ionicons name="person-outline" color={colors.muted} size={17} /><TextInput value={username} onChangeText={setUsername} placeholder="Username or email" placeholderTextColor="#94a3b8" autoCapitalize="none" style={styles.input} /></View>
          <View style={styles.inputWrap}>
            <Ionicons name="key-outline" color={colors.muted} size={17} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#94a3b8" secureTextEntry={!passwordVisible} style={styles.input} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
              hitSlop={8}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} color={colors.muted} size={20} />
            </Pressable>
          </View>
          {error ? <Text numberOfLines={3} style={styles.error}>{error}</Text> : null}
          <Pressable disabled={loading || googleLoading} onPress={submit} style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}>
            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text style={styles.signInButtonText}>Sign in</Text><Ionicons name="arrow-forward" color="white" size={18} /></>}
          </Pressable>
        </View>

        <Text style={styles.footerText}>© 2026 Pendeza Uganda. All Rights Reserved. · Powered by <Text accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync("https://perpetual-web-vert.vercel.app/")} style={styles.footerLink}>Perpetual Labs</Text></Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeroCarousel({ height }: { height: number }) {
  const [slide, setSlide] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { duration: 220, toValue: 0, useNativeDriver: true }).start(() => {
        setSlide((current) => (current + 1) % heroSlides.length);
        Animated.timing(fade, { duration: 420, toValue: 1, useNativeDriver: true }).start();
      });
    }, 4200);
    return () => clearInterval(timer);
  }, [fade]);
  const item = heroSlides[slide];
  return (
    <View style={[styles.hero, { height }]}>
      <Animated.Image source={item.image} resizeMode="cover" style={[styles.heroImage, { opacity: fade }]} />
      <View style={styles.heroShade} />
      <View style={styles.heroCopy}><Text style={styles.heroKicker}>{item.kicker}</Text><Text style={styles.heroTitle}>{item.title}</Text><View style={styles.dots}>{heroSlides.map((_, index) => <View key={index} style={[styles.dot, index === slide && styles.dotActive]} />)}</View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  brandCopy: { flex: 1 },
  brandLogo: { height: 46, resizeMode: "contain", width: 46 },
  brandLogoCompact: { height: 38, width: 38 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 50 },
  brandRowCompact: { minHeight: 40 },
  cardCopy: { color: colors.muted, fontSize: 12, marginTop: 2 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: 8, marginVertical: 8 },
  dividerText: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  donationRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  donationRowCompact: { marginTop: 5 },
  dot: { backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 4, height: 5, width: 5 },
  dotActive: { backgroundColor: colors.gold, width: 18 },
  dots: { flexDirection: "row", gap: 5, marginTop: 6 },
  error: { backgroundColor: "#fef2f2", borderRadius: 8, color: colors.danger, fontSize: 11, fontWeight: "700", marginBottom: 7, padding: 7 },
  footerLink: { color: colors.primaryDark, fontWeight: "900", textDecorationLine: "underline" },
  footerText: { color: colors.muted, fontSize: 9.5, lineHeight: 14, marginTop: 7, textAlign: "center" },
  googleButton: { alignItems: "center", borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, height: 40, justifyContent: "center", marginTop: 10 },
  googleButtonText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  googleHelp: { color: colors.danger, fontSize: 10, marginTop: 4, textAlign: "center" },
  hero: { backgroundColor: colors.primaryDark, borderRadius: 18, marginTop: 6, minHeight: 92, overflow: "hidden", width: "100%" },
  heroCopy: { bottom: 12, left: 14, position: "absolute", right: 14 },
  heroImage: { height: "100%", width: "100%" },
  heroKicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  heroShade: { backgroundColor: "rgba(4,40,35,0.35)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  heroTitle: { color: "white", fontSize: 20, fontWeight: "900", marginTop: 2, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 3 },
  input: { color: colors.text, flex: 1, fontSize: 14, height: 40, paddingHorizontal: 8 },
  inputWrap: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", height: 42, marginBottom: 8, paddingHorizontal: 11 },
  notice: { backgroundColor: "#fffbeb", borderRadius: 8, color: colors.warning, fontSize: 10, fontWeight: "700", marginTop: 6, padding: 6, textAlign: "center" },
  page: { backgroundColor: "#f4f8f7", flex: 1 },
  pageInner: { alignSelf: "center", flex: 1, justifyContent: "space-between", paddingBottom: 8, paddingHorizontal: 16, width: "100%" },
  passwordToggle: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  pressed: { opacity: 0.78 },
  primaryDonate: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 11, flex: 1, flexDirection: "row", gap: 7, height: 42, justifyContent: "center" },
  primaryDonateText: { color: "white", fontSize: 13, fontWeight: "900" },
  secondaryDonate: { alignItems: "center", backgroundColor: "#fff8e8", borderColor: colors.gold, borderRadius: 11, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, height: 42, justifyContent: "center" },
  secondaryDonateText: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  secureBadge: { alignItems: "center", backgroundColor: "#dff5ef", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  signInButton: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 10, flexDirection: "row", gap: 8, height: 42, justifyContent: "center" },
  signInButtonText: { color: "white", fontSize: 14, fontWeight: "900" },
  signInCard: { backgroundColor: "white", borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 10, padding: 12, shadowColor: "#0f172a", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.07, shadowRadius: 12 },
  signInCardCompact: { marginTop: 5, padding: 9 },
  signInHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  tagline: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 1 }
});
