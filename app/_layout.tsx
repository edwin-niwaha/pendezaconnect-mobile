import { useCallback, useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { colors, radius, spacing } from "@/constants/theme";
import { getProductionConfigError } from "@/config/environment";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { NotificationCoordinator } from "@/features/notifications/NotificationCoordinator";
import { NotificationProvider } from "@/providers/NotificationProvider";

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
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function AppContent() {
  const [showOpeningSplash, setShowOpeningSplash] = useState(true);
  const { ready } = useAuth();
  const finishOpeningSplash = useCallback(() => setShowOpeningSplash(false), []);

  return (
    <>
      <NotificationProvider>
        <NotificationCoordinator />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </NotificationProvider>
      {showOpeningSplash ? <OpeningSplash ready={ready} onFinish={finishOpeningSplash} /> : null}
    </>
  );
}

function OpeningSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [entranceFinished, setEntranceFinished] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const brandScale = useRef(new Animated.Value(0.76)).current;
  const brandOpacity = useRef(new Animated.Value(0.18)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(brandOpacity, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(brandScale, {
        duration: 850,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]);

    entrance.start(({ finished }) => {
      if (finished) setEntranceFinished(true);
    });
    return () => entrance.stop();
  }, [brandOpacity, brandScale]);

  useEffect(() => {
    if (!entranceFinished || ready) {
      setShowLoadingIndicator(false);
      return;
    }
    const timer = setTimeout(() => setShowLoadingIndicator(true), 250);
    return () => clearTimeout(timer);
  }, [entranceFinished, ready]);

  useEffect(() => {
    if (!showLoadingIndicator) return;
    const fadeIn = Animated.timing(loadingOpacity, {
      duration: 180,
      toValue: 0.58,
      useNativeDriver: true
    });
    const rotate = Animated.loop(
      Animated.timing(loadingRotation, {
        duration: 1400,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { duration: 700, easing: Easing.inOut(Easing.cubic), toValue: 1, useNativeDriver: true }),
        Animated.timing(loadingPulse, { duration: 700, easing: Easing.inOut(Easing.cubic), toValue: 0, useNativeDriver: true })
      ])
    );
    fadeIn.start();
    rotate.start();
    pulse.start();
    return () => {
      fadeIn.stop();
      rotate.stop();
      pulse.stop();
      loadingRotation.setValue(0);
      loadingPulse.setValue(0);
    };
  }, [loadingOpacity, loadingPulse, loadingRotation, showLoadingIndicator]);

  useEffect(() => {
    if (!ready || !entranceFinished) return;
    const exit = Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(brandScale, {
          duration: 340,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1.04,
          useNativeDriver: true
        }),
        Animated.timing(screenOpacity, {
          duration: 340,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    ]);
    exit.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => exit.stop();
  }, [brandScale, entranceFinished, onFinish, ready, screenOpacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.openingSplash, { opacity: screenOpacity }]}>
      <Image
        resizeMode="cover"
        source={require("../assets/splash-v2.png")}
        style={styles.splashBackdrop}
      />
      <Animated.View style={[styles.splashBrand, { opacity: brandOpacity, transform: [{ scale: brandScale }] }]}>
        <View style={styles.splashLogoStage}>
          <View style={styles.splashLogoGlow} />
          <View style={styles.splashLogoCard}>
            <Image resizeMode="contain" source={require("../assets/logo.png")} style={styles.splashLogo} />
          </View>
        </View>
        <Text style={styles.splashAppName}>PENDEZA CONNECT</Text>
        <Text style={styles.splashTagline}>SPONSOR HOPE. BUILD FUTURES.</Text>
      </Animated.View>
      {showLoadingIndicator ? (
        <Animated.View style={[styles.splashLoading, { opacity: loadingOpacity }]}>
          <View style={styles.loadingMark}>
            <Animated.View
              style={[
                styles.loadingOrbit,
                { transform: [{ rotate: loadingRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }
              ]}
            >
              <View style={styles.loadingSpark} />
            </Animated.View>
            <Animated.View
              style={[
                styles.loadingCore,
                {
                  opacity: loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                  transform: [{ scale: loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }]
                }
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Preparing your experience</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  configRoot: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  configCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, width: "100%" },
  configHelp: { color: colors.muted, lineHeight: 20, marginTop: spacing.md },
  configText: { color: colors.danger, fontWeight: "800", lineHeight: 22, marginTop: spacing.sm },
  configTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  loadingCore: { backgroundColor: colors.gold, borderRadius: 999, height: 9, width: 9 },
  loadingMark: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  loadingOrbit: { borderColor: "rgba(255,255,255,0.34)", borderRadius: 999, borderWidth: 1, height: 34, position: "absolute", width: 34 },
  loadingSpark: { backgroundColor: colors.gold, borderRadius: 999, height: 7, left: 1, position: "absolute", top: 1, width: 7 },
  loadingText: { color: "rgba(255,255,255,0.82)", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: spacing.sm, textTransform: "uppercase" },
  openingSplash: { alignItems: "center", backgroundColor: colors.primaryDark, bottom: 0, justifyContent: "center", left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0, zIndex: 999 },
  splashAppName: { color: "white", fontSize: 19, fontWeight: "900", letterSpacing: 1.5, marginTop: spacing.xl },
  splashBackdrop: { bottom: 0, height: "100%", left: 0, position: "absolute", right: 0, top: 0, width: "100%" },
  splashBrand: { alignItems: "center", justifyContent: "center", maxWidth: 360, paddingHorizontal: spacing.xl, width: "100%" },
  splashLoading: { alignItems: "center", bottom: "8%", position: "absolute" },
  splashLogo: { height: 154, width: 154 },
  splashLogoCard: { alignItems: "center", backgroundColor: "white", borderRadius: 44, elevation: 10, height: 204, justifyContent: "center", shadowColor: "#001d19", shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.28, shadowRadius: 26, width: 204 },
  splashLogoGlow: { backgroundColor: "rgba(153, 246, 228, 0.14)", borderRadius: 999, height: 236, position: "absolute", width: 236 },
  splashLogoStage: { alignItems: "center", height: 236, justifyContent: "center", width: 236 },
  splashTagline: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.8, marginTop: spacing.sm, textAlign: "center" }
});
