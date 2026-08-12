import { StyleSheet, Text, View } from "react-native";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState, Screen } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, formatLabel, joinMeta } from "@/utils/format";
import { useLoans } from "./useLoans";

function loanTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("overdue")) return "danger";
  if (normalized.includes("pending")) return "warning";
  if (normalized.includes("active") || normalized.includes("approved")) return "success";
  if (normalized.includes("complete") || normalized.includes("closed")) return "neutral";
  return "info";
}

export function LoansScreen() {
  const { error, items, loading, queue, search, setSearch } = useLoans();
  if (loading && !items.length) return <LoadingState />;

  const activeLoans = items.filter((item) => ["active", "approved", "disbursed"].includes(item.status)).length;
  const overdueLoans = items.filter((item) => item.status.toLowerCase().includes("overdue")).length;
  const outstanding = items.reduce((sum, item) => sum + Number(item.total_outstanding ?? 0), 0);

  return (
    <Screen title="Loans">
      <FeatureCard
        accent={overdueLoans ? colors.danger : colors.accent}
        icon="cash"
        subtitle={overdueLoans ? "Some loans are overdue and need attention." : "Track balances, statuses, installments, and due dates."}
        title="Loan portfolio"
        value={formatCurrency(outstanding)}
        meta={joinMeta([`${activeLoans} active`, queue.length ? `${queue.length} awaiting approval` : null])}
      />

      <SearchBox value={search} onChangeText={setSearch} placeholder="Search loans" />
      <ResourceError message={error} />

      {queue.length ? (
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Approval queue</Text>
          <Text style={styles.muted}>{queue.length} loan{queue.length === 1 ? "" : "s"} require staff attention.</Text>
        </View>
      ) : null}

      <SectionHeader title="Loan records" subtitle="Statuses and amounts are shown clearly for quick decisions." />
      {items.length ? items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.title}>{joinMeta([`Loan #${item.id}`, item.borrower_name])}</Text>
            <StatusBadge tone={loanTone(item.status)} text={formatLabel(item.status)} />
          </View>
          <Text style={styles.subtitle}>{joinMeta([item.borrower_reg_number, item.loan_purpose || "No purpose recorded"])}</Text>
          <AmountRow label="Principal" value={formatCurrency(item.principal_amount)} />
          <AmountRow label="Outstanding" value={item.total_outstanding ? formatCurrency(item.total_outstanding) : "Not available"} tone={item.status.toLowerCase().includes("overdue") ? "danger" : "neutral"} />
          <AmountRow label="Monthly installment" value={formatCurrency(item.monthly_installment)} />
          <Text style={styles.meta}>{joinMeta([`${item.loan_period_months} months`, `Due ${formatDate(item.due_date)}`])}</Text>
        </View>
      )) : <ResourceEmpty text="No loans available for your account." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  meta: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  queueCard: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  queueTitle: { color: colors.warning, fontSize: 16, fontWeight: "900" },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" }
});
