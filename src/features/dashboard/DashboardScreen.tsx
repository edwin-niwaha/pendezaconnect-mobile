import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { FeatureCard, NoticeBanner, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { openDonation } from "@/features/donations/openDonation";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import { formatCurrency, formatLabel, joinMeta } from "@/utils/format";
import { isClientAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";
import { useDashboard } from "./useDashboard";

function roleLabel(accountType?: string) {
  if (accountType === "staff") return "Staff workspace";
  if (accountType === "sponsor") return "Sponsor portal";
  if (accountType === "client") return "Client portal";
  return "Pendeza workspace";
}

export function DashboardScreen() {
  const { user } = useAuth();
  const { data, error, loading } = useDashboard();
  const [donationNotice, setDonationNotice] = useState("");
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

  async function donate(currency: "UGX" | "USD") {
    const result = await openDonation(currency);
    setDonationNotice(result.message);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <StatusBadge tone="success" text={roleLabel(accountType)} />
        <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
        <Text style={styles.heroCopy}>Your focused hub for sponsorship, loans, and savings operations.</Text>
      </View>

      <ResourceError message={error} />
      <NoticeBanner message={donationNotice} />

      {data ? (
        <>
          <SectionHeader title="Today at a glance" subtitle="Role-aware summaries without opening restricted sections." />
          <View style={styles.summaryGrid}>
            {typeof data.sponsors === "number" ? <MiniStat label="Sponsors" value={data.sponsors} /> : null}
            {typeof data.clients === "number" ? <MiniStat label="Clients" value={data.clients} /> : null}
            <MiniStat label="Loans" value={activeLoans} accent={overdueLoans ? colors.danger : colors.primaryDark} />
            {data.savings_balance !== undefined ? <MiniStat label="Savings" value={formatCurrency(data.savings_balance)} /> : null}
            {totalPayments ? <MiniStat label="Payments" value={totalPayments} /> : null}
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
          <SectionHeader title="Donate" subtitle="Use the existing secure Django payment flow. Payment provider secrets stay on the server." />
          <FeatureCard
            accent={colors.gold}
            icon="phone-portrait"
            onPress={() => donate("UGX")}
            subtitle="Open the MTN Mobile Money donation form powered by the backend."
            title="Donate UGX"
            meta="Minimum UGX 5,000"
          />
          <FeatureCard
            accent={colors.warning}
            icon="card"
            onPress={() => donate("USD")}
            subtitle="USD donation support was not found in the current backend flow."
            title="Donate USD"
            meta="Not available yet"
          />
        </>
      ) : (
        <EmptyState text="No dashboard data available." />
      )}
    </Screen>
  );
}

function MiniStat({ accent = colors.primaryDark, label, value }: { accent?: string; label: string; value: string | number }) {
  return (
    <Card>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.lg, marginTop: spacing.sm, padding: spacing.xl },
  heroCopy: { color: "#ccfbf1", fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  heroTitle: { color: "white", fontSize: 30, fontWeight: "900", marginTop: spacing.md },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: spacing.xs, textTransform: "uppercase" },
  statValue: { fontSize: 22, fontWeight: "900" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }
});
