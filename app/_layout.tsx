import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { colors, radius, spacing } from "@/constants/theme";
import { getProductionConfigError } from "@/config/environment";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotificationCoordinator } from "@/features/notifications/NotificationCoordinator";
import { NotificationProvider } from "@/providers/NotificationProvider";

export default function RootLayout() {
  const [showOpeningSplash, setShowOpeningSplash] = useState(true);
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
        <NotificationProvider>
          <NotificationCoordinator />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </NotificationProvider>
        {showOpeningSplash ? <OpeningSplash onFinish={() => setShowOpeningSplash(false)} /> : null}
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function OpeningSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const ringScale = useRef(new Animated.Value(0.12)).current;
  const ringOpacity = useRef(new Animated.Value(0.85)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { damping: 12, mass: 0.8, stiffness: 95, toValue: 1, useNativeDriver: true }),
        Animated.timing(ringScale, { duration: 1050, easing: Easing.out(Easing.cubic), toValue: 4.8, useNativeDriver: true }),
        Animated.timing(ringOpacity, { delay: 280, duration: 720, toValue: 0, useNativeDriver: true })
      ]),
      Animated.delay(180),
      Animated.timing(screenOpacity, { duration: 320, toValue: 0, useNativeDriver: true })
    ]).start(onFinish);
  }, [logoScale, onFinish, ringOpacity, ringScale, screenOpacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.openingSplash, { opacity: screenOpacity }]}>
      <Animated.View style={[styles.splashRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.splashLogoCard, { transform: [{ scale: logoScale }] }]}>
        <Image source={require("../assets/logo.png")} style={styles.splashLogo} />
      </Animated.View>
      <Text style={styles.splashTagline}>SPONSOR HOPE. BUILD FUTURES.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  configRoot: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  configCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, width: "100%" },
  configHelp: { color: colors.muted, lineHeight: 20, marginTop: spacing.md },
  configText: { color: colors.danger, fontWeight: "800", lineHeight: 22, marginTop: spacing.sm },
  configTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  openingSplash: { alignItems: "center", backgroundColor: colors.primaryDark, bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 999 },
  splashLogo: { height: 148, resizeMode: "contain", width: 148 },
  splashLogoCard: { alignItems: "center", backgroundColor: "white", borderRadius: 40, height: 190, justifyContent: "center", shadowColor: "#001d19", shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 24, width: 190 },
  splashRing: { borderColor: "rgba(242,184,75,0.72)", borderRadius: 90, borderWidth: 3, height: 180, position: "absolute", width: 180 },
  splashTagline: { bottom: "17%", color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.8, position: "absolute" }
});
