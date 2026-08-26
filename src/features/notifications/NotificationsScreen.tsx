import { memo, useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { openNotification } from "@/features/notifications/NotificationCoordinator";
import { colors, radius, spacing } from "@/constants/theme";
import { EmptyState, LoadingState } from "@/components/Screen";
import { useNotificationsInbox, type InboxNotification } from "@/providers/NotificationProvider";

const inboxFilters = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Loans", value: "loan" },
  { label: "Savings", value: "saving" },
  { label: "Payments", value: "payment" },
  { label: "Security", value: "security" }
] as const;

function notificationIcon(event: unknown): keyof typeof Ionicons.glyphMap {
  const value = String(event || "");
  if (value.includes("loan")) return "cash-outline";
  if (value.includes("saving")) return "wallet-outline";
  if (value.includes("payment") || value.includes("sponsorship")) return "receipt-outline";
  if (value.includes("security")) return "shield-checkmark-outline";
  return "notifications-outline";
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
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={({ pressed }) => [styles.card, !item.read && styles.unreadCard, pressed && styles.pressed]}>
      <View style={[styles.icon, !item.read && styles.unreadIcon]}><Ionicons color={item.read ? colors.muted : colors.primaryDark} name={notificationIcon(item.data.event)} size={21} /></View>
      <View style={styles.copy}>
        <View style={styles.titleRow}><Text numberOfLines={1} style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>{!item.read ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}</View>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{timeLabel(item.receivedAt)}</Text>
      </View>
      <Ionicons color="#94a3b8" name="chevron-forward" size={17} />
    </Pressable>
  );
});

export function NotificationsScreen() {
  const { clearAll, items, loading, markAllRead, markRead, refresh, unreadCount } = useNotificationsInbox();
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.read;
    const event = String(item.data.event || "");
    if (filter === "payment") return event.includes("payment") || event.includes("sponsorship");
    return event.includes(filter);
  }), [filter, items]);

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
    await refresh();
    setRefreshing(false);
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item.id}
      renderItem={renderNotification}
      ListHeaderComponent={(
        <>
          <View style={styles.heading}>
            <View><Text style={styles.screenTitle}>Notifications</Text><Text style={styles.subtitle}>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</Text></View>
            <View style={styles.headingIcon}><Ionicons color={colors.primaryDark} name="notifications" size={24} /></View>
          </View>
          {items.length ? <View style={styles.toolbar}><Pressable disabled={!unreadCount} onPress={() => void markAllRead()} style={[styles.toolbarButton, !unreadCount && styles.disabled]}><Ionicons color={colors.primaryDark} name="checkmark-done-outline" size={17} /><Text style={styles.toolbarText}>Mark all read</Text></Pressable><Pressable onPress={confirmClear} style={styles.clearButton}><Ionicons color={colors.danger} name="trash-outline" size={17} /><Text style={styles.clearText}>Clear</Text></Pressable></View> : null}
          {items.length ? <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>{inboxFilters.map((item) => { const active = filter === item.value; return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.value} onPress={() => setFilter(item.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>; })}</ScrollView> : null}
        </>
      )}
      ListEmptyComponent={<EmptyState text={items.length ? "No notifications match this filter." : "No notifications yet. Account, loan, savings, and payment updates will appear here."} />}
      contentContainerStyle={styles.content}
      onRefresh={() => void refreshInbox()}
      refreshing={refreshing}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  clearButton: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.sm },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: "900" },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: 36 },
  copy: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.42 },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  headingIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  icon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  pressed: { opacity: 0.76 },
  root: { backgroundColor: colors.background, flex: 1 },
  screenTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  time: { color: "#94a3b8", fontSize: 10, fontWeight: "700", marginTop: spacing.sm },
  title: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  toolbar: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  toolbarButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.md },
  toolbarText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  unreadCard: { backgroundColor: "#f0fdfa", borderColor: "#99f6e4" },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  unreadIcon: { backgroundColor: "#ccfbf1" },
  unreadTitle: { fontWeight: "900" }
});
