import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import { formatCurrency, formatLabel } from "@/utils/format";
import { isClientAccount, isGuestAccount, isStaffAccount } from "@/utils/roles";
import { PendingVerificationScreen } from "./PendingVerificationScreen";
import { useDashboard } from "./useDashboard";

export function DashboardScreen() {
  const { user } = useAuth();
  const guest = isGuestAccount(user);
  const { data, error, loading } = useDashboard(!guest);
  const accountType = user?.account_type;
  const firstName = user?.first_name || user?.username || "there";
  const staff = isStaffAccount(user);
  const canViewClientPhoto = staff || isClientAccount(user);

  if (guest) return <PendingVerificationScreen />;

  if (loading && !data) return <LoadingState />;

  const activeLoans = data?.loans?.active ?? data?.loans?.approved ?? data?.loans?.total ?? 0;
  const overdueLoans = data?.loans?.overdue ?? 0;
  const children = data?.children;
  const staffWorkforce = data?.staff_workforce;

  return (
    <Screen>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroKicker}>Your Pendeza workspace</Text>
          <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
          <Text style={styles.heroSubtitle}>Here is what matters today.</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" color={colors.gold} size={14} />
          <Text style={styles.heroBadgeText}>{formatLabel(accountType || "account")}</Text>
        </View>
      </View>

      <ResourceError message={error} />

      {canViewClientPhoto ? (
        <>
          <SectionHeader title="Quick actions" subtitle={staff ? "Capture and update profile photos." : "View your verified profile photo."} />
          <View style={styles.quickActions}>
            <PhotoShortcut
              accent="#0891b2"
              icon="camera"
              subtitle={staff ? "Capture or choose a client photo" : "Photo changes require authorized staff"}
              title={staff ? "Upload client photo" : "View my profile photo"}
              onPress={() => router.push("/(tabs)/client-photos")}
            />
            {staff ? (
              <PhotoShortcut
                accent="#d97706"
                icon="images"
                subtitle="Capture or choose a child photo"
                title="Upload child photo"
                onPress={() => router.push("/(tabs)/child-photos")}
              />
            ) : null}
          </View>
        </>
      ) : null}

      {data ? (
        <>
          <SectionHeader title="Today at a glance" />

          {(typeof data.sponsors === "number" || typeof data.clients === "number" || staff) ? (
            <DashboardGroup icon="people" title="People & programs">
              {typeof data.sponsors === "number" ? <MiniStat icon="heart" label="Sponsors" value={data.sponsors} onPress={() => router.push("/(tabs)/sponsors")} /> : null}
              {typeof data.clients === "number" ? <MiniStat icon="people" label="Clients" value={data.clients} onPress={() => router.push("/(tabs)/clients")} /> : null}
              {staff ? <MiniStat icon="briefcase" label="All staff" value={staffWorkforce?.total ?? 0} onPress={() => router.push("/(tabs)/staff")} /> : null}
            </DashboardGroup>
          ) : null}

          <DashboardGroup icon="wallet" title="Financial overview">
            <MiniStat icon="cash" label="Active loans" value={activeLoans} accent={overdueLoans ? colors.danger : colors.primaryDark} onPress={() => router.push("/(tabs)/loans")} />
            {data.savings_balance !== undefined ? <MiniStat icon="wallet" label="Savings balance" value={formatCurrency(data.savings_balance)} onPress={() => router.push("/(tabs)/savings")} /> : null}
          </DashboardGroup>

          {staff ? (
            <DashboardGroup icon="school" title="Children">
              <MiniStat icon="school" label="Total children" value={children?.total ?? 0} onPress={() => router.push("/(tabs)/children")} />
              <MiniStat icon="heart-circle" label="Sponsored" value={children?.sponsored ?? 0} accent={colors.success} />
              <MiniStat icon="sparkles" label="Awaiting sponsor" value={children?.non_sponsored ?? 0} accent={colors.warning} />
              <MiniStat icon="archive" label="Departed" value={children?.departed ?? 0} accent={colors.danger} />
            </DashboardGroup>
          ) : null}
        </>
      ) : (
        <EmptyState text="No dashboard data available." />
      )}
    </Screen>
  );
}

function PhotoShortcut({ accent, icon, onPress, subtitle, title }: { accent: string; icon: IconName; onPress: () => void; subtitle: string; title: string }) {
  return (
    <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons color={accent} name={icon} size={24} />
      </View>
      <View style={styles.quickActionCopy}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={accent} name="arrow-forward-circle" size={22} />
    </Pressable>
  );
}

type IconName = ComponentProps<typeof Ionicons>["name"];

function DashboardGroup({ children, icon, title }: { children: ReactNode; icon: IconName; title: string }) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeading}>
        <View style={styles.groupIcon}><Ionicons name={icon} color={colors.primaryDark} size={17} /></View>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <View style={styles.summaryGrid}>{children}</View>
    </View>
  );
}

function MiniStat({ accent = colors.primaryDark, icon, label, onPress, value }: { accent?: string; icon: IconName; label: string; onPress?: () => void; value: string | number }) {
  const content = (
    <>
      <View style={[styles.statIcon, { backgroundColor: `${accent}14` }]}><Ionicons name={icon} color={accent} size={17} /></View>
      <View style={styles.statCopy}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: accent }]}>{value}</Text><Text numberOfLines={2} style={styles.statLabel}>{label}</Text></View>
      {onPress ? <Ionicons name="chevron-forward" color="#94a3b8" size={14} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.summaryItem}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.summaryItem, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.04, shadowRadius: 10 },
  groupHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  groupIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 10, height: 32, justifyContent: "center", width: 32 },
  groupTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  hero: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, marginTop: spacing.sm, overflow: "hidden", padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 14 },
  heroBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroBadgeText: { color: "white", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  heroKicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginBottom: spacing.xs, textTransform: "uppercase" },
  heroSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: spacing.xs },
  heroTitle: { color: "white", fontSize: 23, fontWeight: "900" },
  statCopy: { flex: 1, minWidth: 0 },
  statIcon: { alignItems: "center", borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", lineHeight: 12, marginTop: 2, textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.76 },
  quickAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minHeight: 92, minWidth: 0, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.05, shadowRadius: 10 },
  quickActionCopy: { flex: 1, minWidth: 0 },
  quickActionIcon: { alignItems: "center", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  quickActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  quickActionSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  quickActionTitle: { color: colors.text, fontSize: 13, fontWeight: "900", lineHeight: 17 },
  summaryGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  summaryItem: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: "#edf1f5", borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: spacing.sm, minHeight: 72, minWidth: 0, paddingHorizontal: spacing.sm, paddingVertical: spacing.md }
});
