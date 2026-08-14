import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { FeatureCard, SectionHeader } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import { formatCurrency, formatLabel, joinMeta } from "@/utils/format";
import { isClientAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";
import { useDashboard } from "./useDashboard";

export function DashboardScreen() {
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

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
        <Text style={styles.heroCopy}>Your focused hub for sponsorship, loans, and savings operations.</Text>
      </View>

      <ResourceError message={error} />

      {data ? (
        <>
          <SectionHeader title="Today at a glance" subtitle="Role-aware summaries without opening restricted sections." />
          <View style={styles.summaryGrid}>
            {typeof data.sponsors === "number" ? <MiniStat label="Sponsors" value={data.sponsors} /> : null}
            {typeof data.clients === "number" ? <MiniStat label="Clients" value={data.clients} /> : null}
            <MiniStat label="Loans" value={activeLoans} accent={overdueLoans ? colors.danger : colors.primaryDark} />
            {data.savings_balance !== undefined ? <MiniStat label="Savings" value={formatCurrency(data.savings_balance)} /> : null}
            {totalPayments ? <MiniStat label="Payments" value={totalPayments} /> : null}
            {staff ? (
              <>
                <MiniStat label="Total children" value={children?.total ?? 0} />
                <MiniStat label="Sponsored children" value={children?.sponsored ?? 0} accent={colors.success} />
                <MiniStat label="Non-sponsored" value={children?.non_sponsored ?? 0} accent={colors.warning} />
                <MiniStat label="Departed children" value={children?.departed ?? 0} accent={colors.danger} />
                <MiniStat label="All staff" value={staffWorkforce?.total ?? 0} />
                <MiniStat label="Sponsored staff" value={staffWorkforce?.sponsored ?? 0} accent={colors.success} />
                <MiniStat label="Non-sponsored staff" value={staffWorkforce?.non_sponsored ?? 0} accent={colors.warning} />
                <MiniStat label="Departed staff" value={staffWorkforce?.departed ?? 0} accent={colors.danger} />
              </>
            ) : null}
          </View>

          <SectionHeader title="Core services" subtitle="Tap a card to continue. The app only shows services allowed for your account." />
          {canUseSponsorship ? (
            <FeatureCard
              accent="#db2777"
              icon="heart"
              meta={joinMeta([typeof data.sponsors === "number" ? `${data.sponsors} sponsors` : null, totalPayments ? `${totalPayments} payment records` : null])}
              onPress={() => router.push("/(tabs)/sponsors")}
              subtitle={accountType === "sponsor" ? "View your giving history and sponsorship activity." : "Review sponsors, giving history, and sponsorship activity."}
              title="Sponsorship"
              value={typeof data.sponsors === "number" ? data.sponsors : undefined}
            />
          ) : null}
          {canUseLoans ? (
            <FeatureCard
              accent={overdueLoans ? colors.danger : colors.accent}
              icon="cash"
              meta={joinMeta([data.loans ? Object.entries(data.loans).map(([key, value]) => `${formatLabel(key)} ${value}`).join(" · ") : null])}
              onPress={() => router.push("/(tabs)/loans")}
              subtitle={overdueLoans ? "Some loans need urgent attention." : "Track active loans, balances, statuses, and due dates."}
              title="Loans"
              value={activeLoans}
            />
          ) : null}
          {canUseSavings ? (
            <FeatureCard
              accent="#16a34a"
              icon="wallet"
              meta={accountType === "staff" ? "Operational savings overview" : "Balance and recent activity"}
              onPress={() => router.push("/(tabs)/savings")}
              subtitle="See balances and recent savings transactions in a clean mobile view."
              title="Savings"
              value={data.savings_balance !== undefined ? formatCurrency(data.savings_balance) : undefined}
            />
          ) : null}
        </>
      ) : (
        <EmptyState text="No dashboard data available." />
      )}
    </Screen>
  );
}

function MiniStat({ accent = colors.primaryDark, label, value }: { accent?: string; label: string; value: string | number }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.lg, marginTop: spacing.sm, padding: spacing.xl },
  heroCopy: { color: "#ccfbf1", fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  heroTitle: { color: "white", fontSize: 30, fontWeight: "900", marginTop: spacing.md },
  statLabel: { color: colors.muted, flexShrink: 1, fontSize: 11, fontWeight: "800", lineHeight: 15, marginTop: spacing.xs, minHeight: 30, textAlign: "center", textTransform: "uppercase" },
  statValue: { fontSize: 22, fontWeight: "900" },
  summaryGrid: { columnGap: spacing.md, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  summaryItem: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47.5%", flexGrow: 0, flexShrink: 0, justifyContent: "center", minHeight: 116, paddingHorizontal: spacing.sm, paddingVertical: spacing.lg }
});
