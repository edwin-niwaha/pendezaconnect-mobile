import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { sendFeedback } from "@/api/support";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

export function SupportScreen() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setName(`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "");
    setEmail(user?.email || "");
  }, [user]);

  async function submit() {
    setError("");
    setSuccess("");
    if (!name.trim()) return setError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (message.trim().length < 10) return setError("Tell us a little more (at least 10 characters).");
    setSending(true);
    try {
      const response = await sendFeedback({ name: name.trim(), email: email.trim(), message: message.trim() });
      setMessage("");
      setSuccess(response.detail || "Thank you. Your feedback has been sent.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not send your feedback."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen title="Contact us">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="chatbubbles-outline" color={colors.primaryDark} size={25} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.intro}>Send the Pendeza team a question or describe an issue with your account, savings, loan, or payment.</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Send feedback</Text>
        <Text style={styles.hint}>Your profile details are filled in automatically so the team can reply to you.</Text>
        <Field label="Your name" onChangeText={setName} placeholder="Enter your name" value={name} />
        <Field label="Email address" onChangeText={setEmail} placeholder="name@example.com" value={email} keyboardType="email-address" />
        <Field label="How can we help?" maxLength={1000} onChangeText={setMessage} placeholder="Describe your question or issue" value={message} multiline />
        <Text style={styles.characterCount}>{message.length}/1000</Text>
        {error ? <FeedbackBanner icon="alert-circle-outline" text={error} tone="error" /> : null}
        {success ? <FeedbackBanner icon="checkmark-circle-outline" text={success} tone="success" /> : null}
        <Pressable accessibilityRole="button" disabled={sending} onPress={submit} style={({ pressed }) => [styles.submit, (pressed || sending) && styles.disabled]}>
          {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send-outline" color="white" size={18} />}
          <Text style={styles.submitText}>{sending ? "Sending..." : "Send feedback"}</Text>
        </Pressable>
        <Text style={styles.responseNote}>The support team will reply using the email address above.</Text>
      </View>
    </Screen>
  );
}

function FeedbackBanner({ icon, text, tone }: { icon: keyof typeof Ionicons.glyphMap; text: string; tone: "error" | "success" }) {
  return <View accessibilityLiveRegion="polite" style={[styles.feedback, tone === "error" ? styles.errorFeedback : styles.successFeedback]}><Ionicons name={icon} color={tone === "error" ? colors.danger : colors.success} size={19} /><Text style={[styles.feedbackText, tone === "error" ? styles.errorText : styles.successText]}>{text}</Text></View>;
}

function Field({ label, ...props }: { label: string; onChangeText: (value: string) => void; placeholder: string; value: string; keyboardType?: "email-address"; maxLength?: number; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize={props.keyboardType ? "none" : "sentences"} placeholderTextColor="#94a3b8" style={[styles.input, props.multiline && styles.message]} {...props} /></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 12 },
  characterCount: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, textAlign: "right" },
  disabled: { opacity: 0.65 },
  errorFeedback: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  errorText: { color: colors.danger },
  feedback: { alignItems: "flex-start", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  field: { marginTop: spacing.md },
  hint: { color: colors.muted, lineHeight: 20 },
  hero: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  heroCopy: { flex: 1 },
  heroIcon: { alignItems: "center", backgroundColor: "white", borderRadius: 16, height: 46, justifyContent: "center", width: 46 },
  heroTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: "900", marginBottom: spacing.xs },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  intro: { color: colors.muted, lineHeight: 20 },
  label: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs },
  message: { minHeight: 132, paddingTop: spacing.md, textAlignVertical: "top" },
  responseNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm, textAlign: "center" },
  submit: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.lg, minHeight: 50 },
  submitText: { color: "white", fontWeight: "900" },
  successFeedback: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  successText: { color: colors.success },
  title: { color: colors.text, fontSize: 19, fontWeight: "900", marginBottom: spacing.xs }
});
