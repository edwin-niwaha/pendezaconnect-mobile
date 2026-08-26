import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getClientSavings } from "@/api/savings";
import { StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { ClientSavings } from "@/types";
import { formatCurrency, formatDate, formatLabel } from "@/utils/format";

export function SavingsDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const clientId = Number(params.id);
  const [data, setData] = useState<ClientSavings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(clientId)) {
      setError("Savings details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      setData(await getClientSavings(clientId));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load savings details."));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);
  if (loading && !data) return <LoadingState />;

  const account = data?.accounts[0];
  const transactions = data?.transactions ?? [];
  const deposits = transactions.filter((item) => item.transaction_type === "deposit" && ["approved", "completed", "posted"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const withdrawals = transactions.filter((item) => item.transaction_type === "withdrawal" && ["approved", "completed", "posted"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return <Screen>
    <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>Savings account</Text><Text style={styles.pageTitle}>Account details</Text></View><View style={styles.headingIcon}><Ionicons color={colors.primaryDark} name="wallet" size={22} /></View></View>
    <ResourceError message={error} />
    {account ? <>
      <View style={styles.hero}>
        <View style={styles.heroTop}><View style={styles.heroIcon}><Ionicons color="white" name="wallet-outline" size={23} /></View><StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} /></View>
        <Text style={styles.balanceLabel}>Available balance</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>{formatCurrency(account.balance)}</Text>
        <Text style={styles.clientName}>{account.client_name}</Text><Text style={styles.accountNumber}>{account.account_number || "Savings account"}</Text>
      </View>
      <View style={styles.stats}><Info icon="arrow-down" label="Deposits" value={formatCurrency(deposits)} tone={colors.success} /><Info icon="arrow-up" label="Withdrawals" value={formatCurrency(withdrawals)} tone={colors.danger} /><Info icon="calendar-outline" label="Opened" value={account.opening_date ? formatDate(account.opening_date) : "Not recorded"} tone={colors.primaryDark} /></View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Transaction history</Text><Text style={styles.recordCount}>{transactions.length} record{transactions.length === 1 ? "" : "s"}</Text></View>
      {transactions.length ? transactions.map((item) => {
        const withdrawal = item.transaction_type === "withdrawal";
        return <View key={item.id} style={styles.transaction}><View style={[styles.transactionIcon, withdrawal && styles.withdrawalIcon]}><Ionicons color={withdrawal ? colors.danger : colors.success} name={withdrawal ? "arrow-up" : "arrow-down"} size={17} /></View><View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{formatLabel(item.transaction_type)}</Text><Text style={styles.transactionMeta}>{formatDate(item.transaction_date)} · {formatLabel(item.payment_method || "method not recorded")}</Text></View><View style={styles.transactionEnd}><Text style={[styles.amount, withdrawal && styles.withdrawalAmount]}>{withdrawal ? "−" : "+"}{formatCurrency(item.amount)}</Text><Text style={styles.statusText}>{formatLabel(item.status || "posted")}</Text></View></View>;
      }) : <EmptyState text="No savings transactions found for this account." />}
    </> : !error ? <EmptyState text="This savings account is unavailable." /> : null}
  </Screen>;
}

function Info({ icon, label, tone, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone: string; value: string }) {
  return <View style={styles.info}><View style={[styles.infoIcon, { backgroundColor: `${tone}14` }]}><Ionicons color={tone} name={icon} size={16} /></View><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  accountNumber: { color: "rgba(255,255,255,0.68)", fontSize: 11, marginTop: 3 },
  amount: { color: colors.success, fontSize: 13, fontWeight: "900" },
  balance: { color: "white", fontSize: 29, fontWeight: "900", marginTop: 3, maxWidth: 290 },
  balanceLabel: { color: "#ccfbf1", fontSize: 10, fontWeight: "800", marginTop: spacing.md, textTransform: "uppercase" },
  clientName: { color: "white", fontSize: 15, fontWeight: "900", marginTop: spacing.md },
  eyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  headingIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.md, padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.18, shadowRadius: 12 },
  heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  info: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, minWidth: 0, padding: spacing.sm },
  infoIcon: { alignItems: "center", borderRadius: 10, height: 30, justifyContent: "center", marginBottom: spacing.sm, width: 30 },
  infoLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  infoValue: { color: colors.text, fontSize: 11, fontWeight: "900", marginTop: 2 },
  pageHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, marginTop: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 2 },
  recordCount: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  stats: { flexDirection: "row", gap: spacing.sm },
  statusText: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: 3 },
  transaction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionEnd: { alignItems: "flex-end" },
  transactionIcon: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  transactionMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  transactionTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  withdrawalAmount: { color: colors.danger },
  withdrawalIcon: { backgroundColor: "#fef2f2" }
});
