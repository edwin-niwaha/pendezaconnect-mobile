import { StyleSheet, Text, View } from "react-native";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, formatLabel } from "@/utils/format";
import { useSavings } from "./useSavings";

const RECENT_TRANSACTION_LIMIT = 5;
const ACCOUNT_LIMIT = 5;

export function SavingsOptimizedScreen() {
  const { data, error, loading } = useSavings();
  if (loading && !data) return <LoadingState />;

  const accounts = data?.accounts ?? [];
  const transactions = data?.transactions ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const visibleAccounts = accounts.slice(0, ACCOUNT_LIMIT);
  const visibleTransactions = transactions.slice(0, RECENT_TRANSACTION_LIMIT);
  const deposits = transactions.filter((item) => item.transaction_type === "deposit").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const withdrawals = transactions.filter((item) => item.transaction_type === "withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <Screen title="Savings">
      <FeatureCard
        accent="#16a34a"
        icon="wallet"
        subtitle={accounts.length ? `${accounts.length} visible account${accounts.length === 1 ? "" : "s"} for this user.` : "No savings account found yet."}
        title="Available balance"
        value={formatCurrency(totalBalance)}
        meta={`Deposits ${formatCurrency(deposits)} - Withdrawals ${formatCurrency(withdrawals)}`}
      />
      <ResourceError message={error} />

      <SectionHeader title="Accounts" subtitle="Top accounts are shown first for quick review." />
      {visibleAccounts.length ? visibleAccounts.map((account) => (
        <View key={account.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.cardTitle}>{account.client_name}</Text>
            <StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} />
          </View>
          <AmountRow label={account.account_number || "Account"} value={formatCurrency(account.balance)} tone="success" />
          {account.opening_date ? <Text style={styles.muted}>Opened {formatDate(account.opening_date)}</Text> : null}
        </View>
      )) : <ResourceEmpty text="No savings accounts available for your account." />}

      <SectionHeader title="Recent transactions" subtitle="Only the latest transactions appear here; full history should use a paginated endpoint." />
      {visibleTransactions.length ? visibleTransactions.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.cardTitle}>{formatLabel(item.transaction_type)}</Text>
            <StatusBadge tone={item.status === "completed" ? "success" : "info"} text={item.status || "posted"} />
          </View>
          <AmountRow label={formatDate(item.transaction_date)} value={formatCurrency(item.amount)} tone={item.transaction_type === "withdrawal" ? "danger" : "success"} />
          <Text style={styles.muted}>{item.client_name} - {item.payment_method || "Method not recorded"}</Text>
        </View>
      )) : <ResourceEmpty text="No recent savings transactions found." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  muted: { color: colors.muted, marginTop: spacing.xs },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
