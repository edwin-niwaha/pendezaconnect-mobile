import { memo, useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listApprovalQueue } from "@/api/loans";
import { getErrorMessage } from "@/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { isStaffAccount } from "@/utils/roles";
import { formatCurrency } from "@/utils/format";
import type { Loan } from "@/types";
import { openNotification } from "@/features/notifications/NotificationCoordinator";
import { NotificationWorkQueues, useNotificationWorkQueues } from "./NotificationWorkQueues";
import { colors, radius, spacing } from "@/constants/theme";
import { EmptyState, LoadingState } from "@/components/Screen";
import { useNotificationsInbox, type InboxNotification } from "@/providers/NotificationProvider";

const inboxFilters = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Accounts", value: "activation" },
  { label: "Feedback", value: "feedback" },
  { label: "Loans", value: "loan" },
  { label: "Savings", value: "saving" },
  { label: "Payments", value: "payment" },
  { label: "Inventory", value: "inventory" },
  { label: "Security", value: "security" }
] as const;

function notificationStyle(event: unknown) {
  const value = String(event || "");
  if (value.includes("loan")) return { background: "#fef3c7", color: "#b45309", icon: "cash-outline" as const, label: "Loan" };
  if (value.includes("saving")) return { background: "#dbeafe", color: "#1d4ed8", icon: "wallet-outline" as const, label: "Savings" };
  if (value.includes("payment") || value.includes("sponsorship")) return { background: "#ede9fe", color: "#6d28d9", icon: "receipt-outline" as const, label: "Payment" };
  if (value.includes("inventory")) return { background: "#ffedd5", color: "#c2410c", icon: "cube-outline" as const, label: "Inventory" };
  if (value.includes("security")) return { background: "#fee2e2", color: "#b91c1c", icon: "shield-checkmark-outline" as const, label: "Security" };
  if (value.includes("activation")) return { background: "#dcfce7", color: "#15803d", icon: "person-add-outline" as const, label: "Account" };
  if (value.includes("feedback")) return { background: "#fce7f3", color: "#be185d", icon: "chatbubble-ellipses-outline" as const, label: "Feedback" };
  return { background: colors.primarySoft, color: colors.primaryDark, icon: "notifications-outline" as const, label: "Update" };
}

function timeLabel(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

const NotificationRow = memo(function NotificationRow({ item, onOpen }: { item: InboxNotification; onOpen: (item: InboxNotification) => void }) {
  const appearance = notificationStyle(item.data.event);
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={({ pressed }) => [styles.card, !item.read && styles.unreadCard, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: appearance.background }]}><Ionicons color={appearance.color} name={appearance.icon} size={21} /></View>
      <View style={styles.copy}>
        <View style={styles.titleRow}><Text numberOfLines={1} style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>{!item.read ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}</View>
        <Text style={styles.body}>{item.body}</Text>
        <View style={styles.metaRow}><Text style={[styles.category, { color: appearance.color }]}>{appearance.label}</Text><View style={styles.metaDot} /><Text style={styles.time}>{timeLabel(item.receivedAt)}</Text></View>
      </View>
      <Ionicons color="#94a3b8" name="chevron-forward" size={17} />
    </Pressable>
  );
});

export function NotificationsScreen() {
  const { clearAll, items, loading, markAllRead, markRead, refresh, unreadCount } = useNotificationsInbox();
  const { user } = useAuth();
  const staff = isStaffAccount(user);
  const workQueues = useNotificationWorkQueues(user ? [user.id, user.account_type, user.role, user.staff_role].join(":") : undefined, staff);
  const [pendingLoans, setPendingLoans] = useState<Loan[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingError, setPendingError] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const availableFilters = inboxFilters.filter((item) => {
    if (item.value === "activation") return workQueues.queues.some((queue) => queue.id === "activations");
    if (item.value === "feedback") return workQueues.queues.some((queue) => queue.id === "feedback");
    return true;
  });
  const effectiveFilter = availableFilters.some((item) => item.value === filter) ? filter : "all";
  const loadPendingLoans = useCallback(async (isActive: () => boolean = () => true) => {
    if (!staff || user?.id == null) return;
    setPendingLoading(true);
    try {
      const result = await listApprovalQueue();
      if (!isActive()) return;
      setPendingLoans(result);
      setPendingCount(result.length);
      setPendingError("");
    } catch (error) {
      if (isActive()) setPendingError(getErrorMessage(error, "Unable to load pending loan applications. Pull down to retry."));
    } finally {
      if (isActive()) setPendingLoading(false);
    }
  }, [staff, user?.id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setPendingLoans([]);
    setPendingCount(0);
    setPendingError("");
    void loadPendingLoans(() => active);
    void refresh();
    return () => { active = false; };
  }, [loadPendingLoans, refresh]));
  const filteredItems = useMemo(() => items.filter((item) => {
    if (effectiveFilter === "all") return true;
    if (effectiveFilter === "unread") return !item.read;
    const event = String(item.data.event || "");
    if (effectiveFilter === "payment") return event.includes("payment") || event.includes("sponsorship");
    return event.includes(effectiveFilter);
  }), [effectiveFilter, items]);

  const open = useCallback(async (item: InboxNotification) => {
    await markRead(item.id);
    openNotification(item.data);
  }, [markRead]);

  const renderNotification = useCallback(({ item }: { item: InboxNotification }) => <NotificationRow item={item} onOpen={open} />, [open]);

  if (loading) return <LoadingState />;

  function confirmClear() {
    Alert.alert("Clear notifications", "Remove all notifications from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear all", style: "destructive", onPress: () => void clearAll() }
    ]);
  }

  async function refreshInbox() {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadPendingLoans(), workQueues.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item.id}
      renderItem={renderNotification}
      ListHeaderComponent={(
        <>
          <View style={styles.heading}>
            <View style={styles.heroGlow} />
            <View style={styles.heroCopy}><Text style={styles.eyebrow}>YOUR ACTIVITY</Text><Text style={styles.screenTitle}>Stay in the loop</Text><Text style={styles.heroSubtitle}>{unreadCount ? `${unreadCount} update${unreadCount === 1 ? "" : "s"} waiting for you` : "You're all caught up"}</Text></View>
            <View style={styles.headingIcon}><Ionicons color="white" name={unreadCount ? "notifications" : "checkmark-done"} size={25} />{unreadCount ? <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View> : null}</View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}><Text style={styles.summaryValue}>{items.length}</Text><Text style={styles.summaryLabel}>All updates</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: colors.primary }]}>{unreadCount}</Text><Text style={styles.summaryLabel}>Unread</Text></View>
            {staff ? <><View style={styles.summaryDivider} /><View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: colors.warning }]}>{pendingCount}</Text><Text style={styles.summaryLabel}>Pending loans</Text></View></> : null}
          </View>
          {items.length || staff ? <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>{availableFilters.map((item) => { const active = effectiveFilter === item.value; return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.value} onPress={() => setFilter(item.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>; })}</ScrollView> : null}
          {staff ? <NotificationWorkQueues queues={workQueues.queues} loading={workQueues.loading} error={workQueues.error} filter={effectiveFilter} onRefresh={workQueues.refresh} /> : null}
          {staff && (effectiveFilter === "all" || effectiveFilter === "loan") ? <View style={styles.pendingSection}>
            <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons color="#b45309" name="hourglass-outline" size={18} /></View><View style={styles.copy}><Text style={styles.sectionTitle}>Needs your attention</Text><Text style={styles.subtitle}>Loans at your approval stage{pendingCount ? ` · ${pendingCount}` : ""}</Text></View></View>
            {pendingLoading ? <Text style={styles.subtitle}>Checking pending applications…</Text> : null}
            {pendingError ? <Text accessibilityRole="alert" style={styles.clearText}>{pendingError}</Text> : null}
            {!pendingLoading && !pendingError && !pendingCount ? <Text style={styles.subtitle}>No loans currently require your approval.</Text> : null}
            {pendingLoans.map((loan) => <Pressable accessibilityRole="button" key={loan.id} onPress={() => router.push(`/(tabs)/loans/${loan.id}`)} style={styles.card}>
              <View style={styles.icon}><Ionicons color={colors.primaryDark} name="cash-outline" size={21} /></View>
              <View style={styles.copy}><Text style={styles.title}>{loan.borrower_name}</Text><Text style={styles.body}>{formatCurrency(loan.principal_amount)} · Pending review</Text></View>
              <Ionicons color={colors.muted} name="chevron-forward" size={17} />
            </Pressable>)}
            {pendingCount > pendingLoans.length ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/loans")} style={styles.toolbarButton}><Text style={styles.toolbarText}>View all loans</Text></Pressable> : null}
          </View> : null}
          {items.length ? <View style={styles.toolbar}><Text style={styles.sectionTitle}>Recent updates</Text><View style={styles.toolbarActions}><Pressable disabled={!unreadCount} onPress={() => void markAllRead()} style={[styles.compactButton, !unreadCount && styles.disabled]}><Ionicons color={colors.primaryDark} name="checkmark-done-outline" size={16} /><Text style={styles.toolbarText}>Read all</Text></Pressable><Pressable accessibilityLabel="Clear all notifications" onPress={confirmClear} style={styles.iconButton}><Ionicons color={colors.danger} name="trash-outline" size={17} /></Pressable></View></View> : null}
        </>
      )}
      ListEmptyComponent={<EmptyState text={items.length ? "No notifications match this filter." : "No notification messages yet. Account, finance, and inventory updates will appear here."} />}
      contentContainerStyle={styles.content}
      onRefresh={() => void refreshInbox()}
      refreshing={refreshing}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderColor: "#e8edf3", borderRadius: radius.lg, borderWidth: 1, elevation: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.04, shadowRadius: 8 },
  category: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  clearButton: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.sm },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: "900" },
  compactButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 999, flexDirection: "row", gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: 40 },
  copy: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.42 },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  eyebrow: { color: "#99f6e4", fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginBottom: spacing.xs },
  heading: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 24, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, overflow: "hidden", padding: spacing.lg },
  headingIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 27, borderWidth: 1, height: 54, justifyContent: "center", width: 54 },
  heroBadge: { alignItems: "center", backgroundColor: colors.gold, borderColor: colors.primaryDark, borderRadius: 10, borderWidth: 2, justifyContent: "center", minHeight: 20, minWidth: 20, paddingHorizontal: 4, position: "absolute", right: -4, top: -4 },
  heroBadgeText: { color: "#422006", fontSize: 9, fontWeight: "900" },
  heroCopy: { flex: 1 },
  heroGlow: { backgroundColor: "rgba(45,212,191,0.16)", borderRadius: 80, height: 130, position: "absolute", right: -30, top: -50, width: 130 },
  heroSubtitle: { color: "#ccfbf1", fontSize: 13, marginTop: 4 },
  icon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  pressed: { opacity: 0.76 },
  iconButton: { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  metaDot: { backgroundColor: "#cbd5e1", borderRadius: 2, height: 3, width: 3 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  pendingSection: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md },
  root: { backgroundColor: colors.background, flex: 1 },
  screenTitle: { color: "white", fontSize: 23, fontWeight: "900" },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  sectionIcon: { alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  summaryCard: { alignItems: "center", flex: 1, gap: 2 },
  summaryDivider: { backgroundColor: colors.border, height: 30, width: 1 },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  summaryRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", marginBottom: spacing.lg, paddingVertical: spacing.md },
  summaryValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  time: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  title: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  toolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, marginTop: spacing.xs },
  toolbarActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  toolbarButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.md },
  toolbarText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  unreadCard: { backgroundColor: "#f8fffe", borderColor: "#99f6e4", borderLeftColor: colors.primary, borderLeftWidth: 4 },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  unreadTitle: { fontWeight: "900" }
});
