import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getInventorySummary } from "@/api/inventory";
import { SectionHeader } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import { formatCurrency, formatLabel } from "@/utils/format";
import { isClientAccount, isGuestAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";
import type { InventorySummary } from "@/types";
import { PendingVerificationScreen } from "./PendingVerificationScreen";
import { useDashboard } from "./useDashboard";

export function DashboardScreen() {
  const { user } = useAuth();
  const guest = isGuestAccount(user);
  const { data, error, loading } = useDashboard(!guest);
  const accountType = user?.account_type;
  const firstName = user?.first_name || user?.username || "there";
  const staff = isStaffAccount(user);
  const client = isClientAccount(user);
  const sponsor = isSponsorAccount(user);
  const canViewClientPhoto = staff || client;
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const today = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", weekday: "short" }).format(new Date());

  useEffect(() => {
    if (!staff) return;
    let active = true;
    getInventorySummary().then((summary) => { if (active) setInventory(summary); }).catch(() => undefined);
    return () => { active = false; };
  }, [staff]);

  if (guest) return <PendingVerificationScreen />;

  if (loading && !data) return <LoadingState />;

  const activeLoans = data?.loans?.active ?? data?.loans?.approved ?? data?.loans?.total ?? 0;
  const overdueLoans = data?.loans?.overdue ?? 0;
  const children = data?.children;
  const staffWorkforce = data?.staff_workforce;

  return (
    <Screen>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <View>
          <Text style={styles.heroKicker}>Your Pendeza workspace</Text>
          <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
          <Text style={styles.heroSubtitle}>Here is what matters today.</Text>
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.heroDate}>{today}</Text>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" color={colors.gold} size={14} />
            <Text style={styles.heroBadgeText}>{formatLabel(accountType || "account")}</Text>
          </View>
        </View>
      </View>

      <ResourceError message={error} />

      <View style={styles.sectionRow}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionEyebrow}>Made for your role</Text>
          <Text style={styles.sectionTitle}>Recommended</Text>
        </View>
        <Pressable accessibilityLabel="View all services" accessibilityRole="button" onPress={() => router.push("/(tabs)/services")} style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
          <Text style={styles.seeAllText}>All services</Text>
          <Ionicons color={colors.primary} name="arrow-forward" size={14} />
        </Pressable>
      </View>
      <View style={styles.recommendationGrid}>
        {staff || client ? (
          <RecommendedCard
            accent={overdueLoans ? colors.danger : colors.accent}
            badge="Finance"
            icon="cash"
            title="Loans"
            value={overdueLoans ? `${overdueLoans} overdue` : `${activeLoans} active`}
            onPress={() => router.push("/(tabs)/loans")}
          />
        ) : null}
        {staff || client ? (
          <RecommendedCard
            accent="#16a34a"
            badge="Savings"
            icon="wallet"
            title="Savings"
            value={data?.savings_balance !== undefined ? formatCurrency(data.savings_balance) : "View balance"}
            onPress={() => router.push("/(tabs)/savings")}
          />
        ) : null}
        {sponsor ? (
          <RecommendedCard
            accent="#db2777"
            badge="Sponsorship"
            icon="heart"
            title="Sponsorships"
            value={typeof data?.sponsors === "number" ? `${data.sponsors} connected` : "View support"}
            onPress={() => router.push("/(tabs)/sponsors")}
          />
        ) : null}
      </View>

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
              {typeof data.sponsors === "number" ? <MiniStat accent="#db2777" icon="heart" label="Sponsors" value={data.sponsors} onPress={() => router.push("/(tabs)/sponsors")} /> : null}
              {typeof data.clients === "number" ? <MiniStat accent="#0891b2" icon="people" label="Clients" value={data.clients} onPress={() => router.push("/(tabs)/clients")} /> : null}
              {staff ? <MiniStat accent="#7c3aed" icon="briefcase" label="All staff" value={staffWorkforce?.total ?? 0} onPress={() => router.push("/(tabs)/staff")} /> : null}
            </DashboardGroup>
          ) : null}

          <DashboardGroup icon="wallet" title="Financial overview">
            <MiniStat icon="cash" label="Active loans" value={activeLoans} accent={overdueLoans ? colors.danger : colors.primaryDark} onPress={() => router.push("/(tabs)/loans")} />
            {data.savings_balance !== undefined ? <MiniStat accent={colors.success} icon="wallet" label="Savings balance" value={formatCurrency(data.savings_balance)} onPress={() => router.push("/(tabs)/savings")} /> : null}
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

      {staff ? (
        <>
          <View style={[styles.sectionRow, styles.inventoryHeading]}>
            <View style={styles.sectionCopy}>
              <Text style={[styles.sectionEyebrow, { color: "#7c3aed" }]}>Smart inventory</Text>
              <Text style={styles.sectionTitle}>Stock tools</Text>
            </View>
            <Ionicons color="#7c3aed" name="sparkles" size={20} />
          </View>
          <View style={styles.recommendationGrid}>
            <RecommendedCard accent="#7c3aed" badge="Inventory" icon="cube" title="Stock overview" value={inventory ? `${inventory.total_stock} units` : "Live stock"} onPress={() => router.push("/(tabs)/inventory")} />
            <RecommendedCard
              accent={inventory && inventory.low_stock + inventory.out_of_stock === 0 ? colors.success : "#ea580c"}
              badge={inventory && inventory.low_stock + inventory.out_of_stock === 0 ? "Healthy" : "Attention"}
              icon={inventory && inventory.low_stock + inventory.out_of_stock === 0 ? "checkmark-circle" : "alert-circle"}
              title="Stock alerts"
              value={inventory ? (inventory.low_stock + inventory.out_of_stock ? `${inventory.low_stock + inventory.out_of_stock} items` : "All clear") : "Check stock"}
              onPress={() => router.push("/(tabs)/inventory-alerts")}
            />
          </View>
        </>
      ) : null}
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

function RecommendedCard({ accent, badge, icon, onPress, title, value }: { accent: string; badge: string; icon: IconName; onPress: () => void; title: string; value: string }) {
  return (
    <Pressable accessibilityLabel={`${title}, ${value}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.recommendationCard, { backgroundColor: `${accent}0D`, borderColor: `${accent}2E` }, pressed && styles.cardPressed]}>
      <Ionicons color={`${accent}12`} name={icon} size={78} style={styles.recommendationWatermark} />
      <View style={styles.recommendationTop}>
        <View style={[styles.recommendationIcon, { backgroundColor: accent }]}><Ionicons color="white" name={icon} size={20} /></View>
        <View style={[styles.recommendationBadge, { backgroundColor: `${accent}16` }]}><Text style={[styles.recommendationBadgeText, { color: accent }]}>{badge}</Text></View>
      </View>
      <Text numberOfLines={1} style={styles.recommendationTitle}>{title}</Text>
      <View style={styles.recommendationFooter}><Text numberOfLines={1} style={[styles.recommendationValue, { color: accent }]}>{value}</Text><View style={[styles.recommendationArrow, { backgroundColor: accent }]}><Ionicons color="white" name="arrow-forward" size={13} /></View></View>
    </Pressable>
  );
}

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
      <Ionicons color={`${accent}12`} name={icon} size={54} style={styles.statWatermark} />
      <View style={[styles.statIcon, { backgroundColor: accent }]}><Ionicons name={icon} color="white" size={16} /></View>
      <View style={styles.statCopy}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: accent }]}>{value}</Text><Text numberOfLines={2} style={styles.statLabel}>{label}</Text></View>
      {onPress ? <View style={[styles.statArrow, { backgroundColor: `${accent}16` }]}><Ionicons name="arrow-forward" color={accent} size={12} /></View> : null}
    </>
  );
  const cardStyle = [styles.summaryItem, { backgroundColor: `${accent}09`, borderColor: `${accent}22` }];
  if (!onPress) return <View style={cardStyle}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  groupCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.04, shadowRadius: 10 },
  groupHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  groupIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 10, height: 32, justifyContent: "center", width: 32 },
  groupTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  hero: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, marginTop: spacing.sm, minHeight: 132, overflow: "hidden", padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 14 },
  heroBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroBadgeText: { color: "white", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  heroGlow: { backgroundColor: "rgba(45,212,191,0.14)", borderRadius: 100, height: 150, position: "absolute", right: -52, top: -58, width: 150 },
  heroKicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginBottom: spacing.xs, textTransform: "uppercase" },
  heroSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: spacing.xs },
  heroTitle: { color: "white", fontSize: 23, fontWeight: "900" },
  heroMeta: { alignItems: "flex-end", gap: spacing.sm, marginLeft: spacing.sm },
  inventoryHeading: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.xl },
  statCopy: { flex: 1, minWidth: 0 },
  statArrow: { alignItems: "center", borderRadius: 999, height: 24, justifyContent: "center", width: 24 },
  statIcon: { alignItems: "center", borderRadius: 11, height: 34, justifyContent: "center", shadowColor: "#0f172a", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.12, shadowRadius: 4, width: 34 },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", lineHeight: 12, marginTop: 2, textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: "900" },
  statWatermark: { bottom: -12, position: "absolute", right: -8 },
  pressed: { opacity: 0.76 },
  quickAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minHeight: 92, minWidth: 0, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.05, shadowRadius: 10 },
  quickActionCopy: { flex: 1, minWidth: 0 },
  quickActionIcon: { alignItems: "center", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  quickActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  quickActionSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  quickActionTitle: { color: colors.text, fontSize: 13, fontWeight: "900", lineHeight: 17 },
  recommendationBadge: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  recommendationBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },
  recommendationArrow: { alignItems: "center", borderRadius: 999, height: 27, justifyContent: "center", width: 27 },
  recommendationCard: { borderRadius: radius.lg, borderWidth: 1, flexBasis: "47%", flexGrow: 1, flexShrink: 1, minHeight: 136, minWidth: 0, overflow: "hidden", padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.04, shadowRadius: 8 },
  recommendationFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: "auto", paddingTop: spacing.sm },
  recommendationGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.xl, rowGap: spacing.sm },
  recommendationIcon: { alignItems: "center", borderRadius: 13, height: 40, justifyContent: "center", shadowColor: "#0f172a", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.12, shadowRadius: 5, width: 40 },
  recommendationTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: spacing.md },
  recommendationTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  recommendationValue: { flex: 1, fontSize: 11, fontWeight: "900", marginRight: spacing.xs },
  recommendationWatermark: { bottom: -20, position: "absolute", right: -12 },
  sectionCopy: { flex: 1 },
  sectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 2 },
  seeAll: { alignItems: "center", flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  seeAllText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  summaryGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  summaryItem: { alignItems: "center", borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: spacing.sm, minHeight: 78, minWidth: 0, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.md, position: "relative" }
});
