import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL, getErrorMessage } from "@/api/client";
import { listNotificationWorkQueues, type NotificationWorkQueue } from "@/api/notifications";
import { colors, radius, spacing } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";
import { workQueueWebUrl } from "./workQueueLinks";

export function useNotificationWorkQueues(userKey: string | undefined, staff: boolean) {
  const [state, setState] = useState<{ userKey?: string; queues: NotificationWorkQueue[]; loading: boolean; error: string }>({ queues: [], loading: false, error: "" });
  const generation = useRef(0);
  const focused = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!staff || userKey == null) {
      setState({ userKey, queues: [], loading: false, error: "" });
      return;
    }
    setState((current) => ({ userKey, queues: current.userKey === userKey ? current.queues : [], loading: true, error: "" }));
    try {
      const queues = await listNotificationWorkQueues();
      if (generation.current === request) setState({ userKey, queues, loading: false, error: "" });
    } catch (error) {
      if (generation.current === request) setState({ userKey, queues: [], loading: false, error: getErrorMessage(error, "Unable to load account, feedback, and withdrawal notifications.") });
    }
  }, [staff, userKey]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void refresh();
    return () => { focused.current = false; generation.current++; };
  }, [refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && focused.current) void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  // Never display a previous account's operational records during an account switch.
  return { ...(staff && state.userKey === userKey ? state : { queues: [], loading: false, error: "" }), refresh };
}

export function NotificationWorkQueues({ queues, loading, error, filter, onRefresh }: {
  queues: NotificationWorkQueue[]; loading: boolean; error: string; filter: string; onRefresh: () => Promise<void>;
}) {
  const relevantFilter = ["all", "activation", "feedback", "saving"].includes(filter);
  if (!relevantFilter) return null;
  const visible = queues.filter((queue) => filter === "all" || (filter === "activation" && queue.id === "activations") || (filter === "feedback" && queue.id === "feedback") || (filter === "saving" && queue.id === "withdrawals"));
  async function review(path: string) {
    try {
      await WebBrowser.openBrowserAsync(workQueueWebUrl(API_BASE_URL, path));
      await onRefresh();
    } catch {
      Alert.alert("Could not open review page", "Please try again or open Pendeza Connect on the web.");
    }
  }
  return <View style={styles.container}>
    {loading ? <Text style={styles.note}>Checking account, feedback, and withdrawal notifications…</Text> : null}
    {error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void onRefresh()} style={styles.link}><Text style={styles.linkText}>Retry work notifications</Text></Pressable></View> : null}
    {visible.map((queue) => {
      const icon = queue.id === "activations" ? "person-add-outline" : queue.id === "feedback" ? "chatbubble-ellipses-outline" : "wallet-outline";
      return <View key={queue.id} style={styles.section}>
        <Text style={styles.heading}>{queue.title} ({queue.count})</Text>
        {!queue.count ? <Text style={styles.note}>Nothing awaiting review.</Text> : null}
        {queue.items.map((item) => <View key={item.id} style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Review ${item.title} on web`} onPress={() => void review(item.web_path)} style={styles.row}>
            <Ionicons color={colors.primaryDark} name={icon} size={22} />
            <View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.note}>{item.amount ? `${formatCurrency(item.amount)} · ` : ""}{item.body}</Text><Text style={styles.linkText}>Review on web</Text></View>
            <Ionicons color={colors.muted} name="open-outline" size={17} />
          </Pressable>
          {item.client_id != null ? <Pressable accessibilityRole="button" onPress={() => router.push(`/(tabs)/savings/${item.client_id}`)} style={styles.link}><Text style={styles.linkText}>View savings in app</Text></Pressable> : null}
        </View>)}
        {queue.links.map((link) => <Pressable accessibilityRole="button" key={link.path} onPress={() => void review(link.path)} style={styles.link}><Text style={styles.linkText}>{link.label} on web</Text></Pressable>)}
      </View>;
    })}
    {visible.length ? <Text style={styles.note}>Review pages open on the web and may ask you to sign in. Reading or clearing messages does not resolve these tasks.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.lg },
  section: { gap: spacing.sm, marginBottom: spacing.md },
  heading: { color: colors.text, fontSize: 15, fontWeight: "900" },
  title: { color: colors.text, fontSize: 14, fontWeight: "800" },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  link: { minHeight: 44, justifyContent: "center", paddingVertical: spacing.sm },
  linkText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
});
