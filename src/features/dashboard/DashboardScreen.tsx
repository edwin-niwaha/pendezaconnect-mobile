import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SectionHeader } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import { formatCurrency, formatLabel } from "@/utils/format";
import { isClientAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";
import { backendUrl } from "@/utils/backendRoutes";
import { useDashboard } from "./useDashboard";

export function DashboardScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { data, error, loading } = useDashboard();
  const accountType = user?.account_type;
  const firstName = user?.first_name || user?.username || "there";
  const staff = isStaffAccount(user);
  const canUseSponsorship = staff || isSponsorAccount(user);
  const canUseLoans = staff || isClientAccount(user);
  const canUseSavings = staff || isClientAccount(user);

  if (loading && !data) return <LoadingState />;

  const activeLoans = data?.loans?.active ?? data?.loans?.approved ?? data?.loans?.total ?? 0;
  const overdueLoans = data?.loans?.overdue ?? 0;
  const totalPayments = data?.payments ? Object.values(data.payments).reduce((sum, value) => sum + Number(value || 0), 0) : 0;
  const children = data?.children;
  const staffWorkforce = data?.staff_workforce;
  const summaryColumns = screenWidth >= 600 ? 3 : 2;
  const summaryCardWidth = (screenWidth - spacing.lg * 2 - spacing.sm * (summaryColumns - 1)) / summaryColumns;

  return (
    <Screen>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroKicker}>Pendeza Connect</Text>
          <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{formatLabel(accountType || "account")}</Text>
        </View>
      </View>

      <ResourceError message={error} />

      {data ? (
        <>
          <SectionHeader title="Today at a glance" subtitle="Role-aware summaries without opening restricted sections." />
          <View style={styles.summaryGrid}>
            {typeof data.sponsors === "number" ? <MiniStat label="Sponsors" value={data.sponsors} width={summaryCardWidth} onPress={() => router.push("/(tabs)/sponsors")} /> : null}
            {typeof data.clients === "number" ? <MiniStat label="Clients" value={data.clients} width={summaryCardWidth} onPress={() => router.push("/(tabs)/clients")} /> : null}
            <MiniStat label="Loans" value={activeLoans} width={summaryCardWidth} accent={overdueLoans ? colors.danger : colors.primaryDark} onPress={() => router.push("/(tabs)/loans")} />
            {data.savings_balance !== undefined ? <MiniStat label="Savings" value={formatCurrency(data.savings_balance)} width={summaryCardWidth} onPress={() => router.push("/(tabs)/savings")} /> : null}
            {totalPayments ? <MiniStat label="Payments" value={totalPayments} width={summaryCardWidth} onPress={() => router.push("/(tabs)/payments")} /> : null}
            {staff ? (
              <>
                <MiniStat label="Total children" value={children?.total ?? 0} width={summaryCardWidth} onPress={() => router.push("/(tabs)/children")} />
                <MiniStat label="Sponsored children" value={children?.sponsored ?? 0} width={summaryCardWidth} accent={colors.success} onPress={() => router.push("/(tabs)/children?scope=sponsored")} />
                <MiniStat label="Non-sponsored" value={children?.non_sponsored ?? 0} width={summaryCardWidth} accent={colors.warning} onPress={() => router.push("/(tabs)/children?scope=non-sponsored")} />
                <MiniStat label="Departed children" value={children?.departed ?? 0} width={summaryCardWidth} accent={colors.danger} onPress={() => router.push("/(tabs)/children?scope=departed")} />
                <MiniStat label="All staff" value={staffWorkforce?.total ?? 0} width={summaryCardWidth} onPress={() => router.push("/(tabs)/staff")} />
                <MiniStat label="Sponsored staff" value={staffWorkforce?.sponsored ?? 0} width={summaryCardWidth} accent={colors.success} onPress={() => router.push("/(tabs)/staff?scope=sponsored")} />
                <MiniStat label="Non-sponsored staff" value={staffWorkforce?.non_sponsored ?? 0} width={summaryCardWidth} accent={colors.warning} onPress={() => router.push("/(tabs)/staff?scope=non-sponsored")} />
                <MiniStat label="Departed staff" value={staffWorkforce?.departed ?? 0} width={summaryCardWidth} accent={colors.danger} onPress={() => router.push("/(tabs)/staff?scope=departed")} />
              </>
            ) : null}
          </View>

          <SectionHeader title="Core services" subtitle="Tap a card to continue. The app only shows services allowed for your account." />
          <View style={styles.serviceGrid}>
            {canUseSponsorship ? (
              <CoreServiceCard
                accent="#db2777"
                icon="heart"
                onPress={() => router.push("/(tabs)/sponsors")}
                subtitle={accountType === "sponsor" ? "Your giving and sponsorship activity." : "Sponsors, giving, and support activity."}
                title="Sponsorship"
                value={typeof data.sponsors === "number" ? data.sponsors : undefined}
              />
            ) : null}
            {canUseLoans ? (
              <CoreServiceCard
                accent={overdueLoans ? colors.danger : colors.accent}
                icon="cash"
                onPress={() => router.push("/(tabs)/loans")}
                subtitle={overdueLoans ? "Some loans need attention." : "Balances, statuses, and due dates."}
                title="Loans"
                value={activeLoans}
              />
            ) : null}
            {canUseSavings ? (
              <CoreServiceCard
                accent="#16a34a"
                icon="wallet"
                onPress={() => router.push("/(tabs)/savings")}
                subtitle="Balances and recent savings activity."
                title="Savings"
                value={data.savings_balance !== undefined ? formatCurrency(data.savings_balance) : undefined}
              />
            ) : null}
            {staff ? (
              <CoreServiceCard
                accent="#b45309"
                icon="storefront"
                onPress={() => WebBrowser.openBrowserAsync(backendUrl("/dashboard/ims/"))}
                subtitle="Open the inventory management dashboard."
                title="Inventory"
              />
            ) : null}
          </View>
        </>
      ) : (
        <EmptyState text="No dashboard data available." />
      )}
    </Screen>
  );
}

type IconName = ComponentProps<typeof Ionicons>["name"];

function CoreServiceCard({ accent, icon, onPress, subtitle, title, value }: { accent: string; icon: IconName; onPress: () => void; subtitle: string; title: string; value?: string | number }) {
  return (
    <Pressable
      accessibilityHint={`Opens ${title}`}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}
    >
      <View style={[styles.serviceIcon, { backgroundColor: accent }]}>
        <Ionicons name={icon} color="#fff" size={20} />
      </View>
      <View style={styles.serviceCardBody}>
        <View style={styles.serviceCardHeading}>
          <Text numberOfLines={2} style={styles.serviceCardTitle}>{title}</Text>
          {value !== undefined ? <Text numberOfLines={1} style={styles.serviceCardValue}>{value}</Text> : null}
        </View>
        <Text numberOfLines={3} style={styles.serviceCardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" color={colors.muted} size={17} />
    </Pressable>
  );
}

function MiniStat({ accent = colors.primaryDark, label, onPress, value, width }: { accent?: string; label: string; onPress?: () => void; value: string | number; width: number }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} onPress={onPress} style={({ pressed }) => [styles.summaryItem, { width }, pressed && styles.pressed]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, marginTop: spacing.sm, padding: spacing.lg },
  heroBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  heroKicker: { color: colors.muted, fontSize: 12, fontWeight: "900", marginBottom: spacing.xs, textTransform: "uppercase" },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.muted, flexShrink: 1, fontSize: 10, fontWeight: "900", lineHeight: 13, marginTop: spacing.xs, minHeight: 26, textAlign: "center", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "900" },
  pressed: { opacity: 0.76 },
  serviceCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", minHeight: 118, padding: spacing.md, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 10, width: "100%" },
  serviceCardBody: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  serviceCardHeading: { alignItems: "flex-start", gap: spacing.xs },
  serviceCardSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  serviceCardTitle: { color: colors.text, fontSize: 15, fontWeight: "900", lineHeight: 19 },
  serviceCardValue: { color: colors.text, fontSize: 16, fontWeight: "900", maxWidth: "100%" },
  serviceGrid: { gap: spacing.md, width: "100%" },
  serviceIcon: { alignItems: "center", borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  summaryGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  summaryItem: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexGrow: 0, flexShrink: 0, justifyContent: "center", minHeight: 86, paddingHorizontal: spacing.xs, paddingVertical: spacing.md }
});
