import { StyleSheet, Text, View } from "react-native";
import { AmountRow, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, formatLabel } from "@/utils/format";
import { useSavings } from "./useSavings";

export function SavingsScreen() {
  const { data, error, loading } = useSavings();
  if (loading && !data) return <LoadingState />;

  const accounts = data?.accounts ?? [];
  const transactions = data?.transactions ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  return (
    <Screen title="Savings">
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total savings balance</Text>
        <Text style={styles.balanceValue}>{formatCurrency(totalBalance)}</Text>
        <Text style={styles.balanceCopy}>{accounts.length ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} visible to this user` : "No savings account found yet"}</Text>
      </View>
      <ResourceError message={error} />

      <SectionHeader title="Accounts" subtitle="Balances formatted for quick field review." />
      {accounts.length ? accounts.map((account) => (
        <View key={account.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.cardTitle}>{account.client_name}</Text>
            <StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} />
          </View>
          <AmountRow label={account.account_number || "Account"} value={formatCurrency(account.balance)} tone="success" />
          {account.opening_date ? <Text style={styles.muted}>Opened {formatDate(account.opening_date)}</Text> : null}
        </View>
      )) : <ResourceEmpty text="No savings accounts available for your account." />}

      <SectionHeader title="Recent activity" subtitle="Deposits and withdrawals appear here when available." />
      {transactions.length ? transactions.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.cardTitle}>{formatLabel(item.transaction_type)}</Text>
            <StatusBadge tone={item.status === "completed" ? "success" : "info"} text={item.status || "posted"} />
          </View>
          <AmountRow label={formatDate(item.transaction_date)} value={formatCurrency(item.amount)} tone={item.transaction_type === "withdrawal" ? "danger" : "success"} />
          <Text style={styles.muted}>{item.client_name} · {item.payment_method || "Method not recorded"}</Text>
        </View>
      )) : <ResourceEmpty text="No recent savings transactions found." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.lg, padding: spacing.xl },
  balanceCopy: { color: "#ccfbf1", marginTop: spacing.sm },
  balanceLabel: { color: "#ccfbf1", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  balanceValue: { color: "white", fontSize: 32, fontWeight: "900", marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  muted: { color: colors.muted, marginTop: spacing.xs },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
