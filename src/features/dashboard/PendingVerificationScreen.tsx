import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

export function PendingVerificationScreen() {
  const { refreshMe, user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const firstName = user?.first_name || user?.username || "there";

  async function checkStatus() {
    setChecking(true);
    setError("");
    setMessage("");
    try {
      await refreshMe();
      setMessage("Your account is still awaiting verification.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not check your account status."));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen>
      <View style={styles.welcome}>
        <View style={styles.statusRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" color={colors.primaryDark} size={28} />
          </View>
          <View style={styles.welcomeCopy}>
            <Text style={styles.kicker}>Account verification</Text>
            <Text style={styles.title}>Welcome, {firstName}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Pending</Text>
          </View>
        </View>
        <Text style={styles.lead}>Your Pendeza Connect account was created successfully and is waiting for activation.</Text>
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>What happens next?</Text>
        <TimelineItem icon="checkmark-circle" title="Account received" text="Your details have been securely submitted." complete />
        <TimelineItem icon="shield-checkmark-outline" title="Admin verification" text="The team will verify and link your account to the correct services." />
        <TimelineItem icon="apps-outline" title="Services activated" text="Loans, savings, sponsorship, and other eligible services will appear automatically." last />
      </View>

      <View style={styles.timeNotice}>
        <Ionicons name="calendar-outline" color="#b45309" size={22} />
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Activation takes 2–3 working days</Text>
          <Text style={styles.noticeText}>You do not need to create another account. Check again later using the button below.</Text>
        </View>
      </View>

      {message ? <View accessibilityLiveRegion="polite" style={styles.info}><Text style={styles.infoText}>{message}</Text></View> : null}
      {error ? <View accessibilityLiveRegion="polite" style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      <Pressable accessibilityRole="button" disabled={checking} onPress={checkStatus} style={({ pressed }) => [styles.primaryButton, (pressed || checking) && styles.pressed]}>
        {checking ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="refresh-outline" color="white" size={20} />}
        <Text style={styles.primaryButtonText}>{checking ? "Checking status..." : "Check account status"}</Text>
      </Pressable>

      <View style={styles.urgentCard}>
        <View style={styles.urgentCopy}>
          <Text style={styles.urgentTitle}>Need urgent assistance?</Text>
          <Text style={styles.urgentText}>Contact the administrator and include the email used to create this account.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/support")} style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}>
          <Ionicons name="chatbubble-ellipses-outline" color={colors.primaryDark} size={19} />
          <Text style={styles.contactButtonText}>Contact admin</Text>
        </Pressable>
      </View>

      <Text style={styles.signedInAs}>Signed in as {user?.email || user?.username}</Text>
    </Screen>
  );
}

function TimelineItem({ complete = false, icon, last = false, text, title }: { complete?: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; last?: boolean; text: string; title: string }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineIcon, complete && styles.timelineIconComplete]}>
          <Ionicons name={icon} color={complete ? "white" : colors.primaryDark} size={18} />
        </View>
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: "#fef3c7", borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { color: "#92400e", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  contactButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "white", borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.md },
  contactButtonText: { color: colors.primaryDark, fontWeight: "900" },
  error: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontWeight: "700", lineHeight: 19 },
  iconWrap: { alignItems: "center", backgroundColor: "white", borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  info: { backgroundColor: colors.primarySoft, borderRadius: radius.md, marginBottom: spacing.md, padding: spacing.md },
  infoText: { color: colors.primaryDark, fontWeight: "700", lineHeight: 19 },
  kicker: { color: colors.primaryDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  lead: { color: colors.primaryDark, fontSize: 15, lineHeight: 22, marginTop: spacing.lg },
  noticeCopy: { flex: 1 },
  noticeText: { color: "#92400e", fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  noticeTitle: { color: "#92400e", fontWeight: "900" },
  pressed: { opacity: 0.72 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginBottom: spacing.md, minHeight: 50, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: "white", fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.lg },
  signedInAs: { color: colors.muted, fontSize: 12, marginTop: spacing.md, textAlign: "center" },
  statusRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  timelineCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  timelineCopy: { flex: 1, paddingBottom: spacing.lg },
  timelineIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  timelineIconComplete: { backgroundColor: colors.success },
  timelineItem: { alignItems: "stretch", flexDirection: "row", gap: spacing.md },
  timelineLine: { backgroundColor: colors.border, flex: 1, marginVertical: spacing.xs, width: 2 },
  timelineRail: { alignItems: "center" },
  timelineText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  timelineTitle: { color: colors.text, fontWeight: "900" },
  timeNotice: { alignItems: "flex-start", backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 2 },
  urgentCard: { backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  urgentCopy: { flex: 1 },
  urgentText: { color: colors.primaryDark, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  urgentTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: "900" },
  welcome: { backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, marginTop: spacing.sm, padding: spacing.lg },
  welcomeCopy: { flex: 1 }
});
