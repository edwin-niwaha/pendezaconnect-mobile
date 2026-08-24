import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { initiateMobileMoneyDeposit, submitSavingsRequest } from "@/api/savings";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, formatLabel } from "@/utils/format";
import { useSavings } from "./useSavings";
import { useAuth } from "@/providers/AuthProvider";

const RECENT_TRANSACTION_LIMIT = 5;
const ACCOUNT_LIMIT = 5;
const transactionFilters = [
  { label: "All", value: "all" },
  { label: "Deposits", value: "deposit" },
  { label: "Withdrawals", value: "withdrawal" },
  { label: "Pending", value: "pending" }
] as const;

export function SavingsOptimizedScreen() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useSavings();
  const [requestType, setRequestType] = useState<"momo" | "deposit" | "withdrawal" | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "bank_transfer" | "cash" | "cheque">("mobile_money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [accountsExpanded, setAccountsExpanded] = useState(false);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState("all");
  if (loading && !data) return <LoadingState />;

  const accounts = data?.accounts ?? [];
  const transactions = data?.transactions ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const visibleAccounts = accountsExpanded ? accounts : accounts.slice(0, ACCOUNT_LIMIT);
  const approvedTransactions = transactions.filter((item) => ["approved", "completed", "posted"].includes(item.status));
  const deposits = approvedTransactions.filter((item) => item.transaction_type === "deposit").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const withdrawals = approvedTransactions.filter((item) => item.transaction_type === "withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const filteredTransactions = transactions.filter((item) => transactionFilter === "all" || (transactionFilter === "pending" ? item.status === "pending" : item.transaction_type === transactionFilter));
  const visibleTransactions = transactionsExpanded ? filteredTransactions : filteredTransactions.slice(0, RECENT_TRANSACTION_LIMIT);
  const isClient = user?.account_type === "client" && Boolean(user.client_id);
  const amountNumber = Number(amount);
  const fee = requestType === "momo" && amountNumber > 0 ? amountNumber * 0.02 : 0;

  function resetForm() {
    setAmount(""); setPhone(""); setReference(""); setNotes(""); setFormError(""); setPaymentMethod("mobile_money");
  }

  function chooseType(type: "momo" | "deposit" | "withdrawal") {
    resetForm();
    setRequestType((current) => current === type ? null : type);
  }

  async function submitRequest() {
    setFormError("");
    if (!user?.client_id || !requestType) return;
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return setFormError("Enter a valid amount.");
    if (requestType === "momo" && amountNumber < 5000) return setFormError("Mobile Money deposits must be at least UGX 5,000.");
    if (requestType === "momo" && !/^07\d{8}$/.test(phone.replace(/\s/g, ""))) return setFormError("Enter a valid MTN number, for example 0771234567.");
    if (requestType === "deposit" && !reference.trim()) return setFormError("Enter the Mobile Money transaction ID.");
    if (requestType === "withdrawal" && amountNumber > totalBalance) return setFormError("The withdrawal cannot exceed your available savings balance.");
    setSubmitting(true);
    try {
      if (requestType === "momo") {
        const payment = await initiateMobileMoneyDeposit(user.client_id, { amount, phone: phone.replace(/\s/g, ""), notes: notes.trim() });
        const reference = payment.reference_id || payment.reference;
        Alert.alert("Approve on your phone", `${payment.message || payment.detail || "An MTN MoMo prompt has been sent. Approve it with your PIN to complete the deposit."}${reference ? `\n\nReference: ${reference}` : ""}`);
      } else {
        await submitSavingsRequest(user.client_id, { amount, notes: notes.trim(), payment_method: requestType === "deposit" ? "mobile_money" : paymentMethod, reference: reference.trim(), transaction_type: requestType });
        Alert.alert("Request submitted", requestType === "deposit" ? "Your deposit will be credited after staff verifies the transaction." : "Your withdrawal is now awaiting staff review.");
      }
      setRequestType(null);
      resetForm();
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not submit this savings request."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="Savings">
      <FeatureCard
        accent="#16a34a"
        subtitle={accounts.length ? `${accounts.length} visible account${accounts.length === 1 ? "" : "s"} for this user.` : "No savings account found yet."}
        title="Available balance"
        value={formatCurrency(totalBalance)}
        meta={`Deposits ${formatCurrency(deposits)} - Withdrawals ${formatCurrency(withdrawals)}`}
      />
      <ResourceError message={error} />

      {isClient && accounts.length ? <>
        <SectionHeader title="Manage savings" subtitle="Deposit into your account or request a withdrawal." />
        <View style={styles.actionRow}>
          <ActionButton active={requestType === "momo"} icon="phone-portrait-outline" label="MoMo deposit" onPress={() => chooseType("momo")} />
          <ActionButton active={requestType === "deposit"} icon="add-circle-outline" label="Direct deposit" onPress={() => chooseType("deposit")} />
          <ActionButton active={requestType === "withdrawal"} icon="arrow-up-circle-outline" label="Withdraw" onPress={() => chooseType("withdrawal")} />
        </View>
        {requestType ? <View style={styles.formCard}>
          <Text style={styles.formTitle}>{requestType === "momo" ? "Make a Mobile Money deposit" : requestType === "deposit" ? "Submit direct deposit" : "Request a withdrawal"}</Text>
          {requestType === "deposit" ? <View style={styles.notice}><Text style={styles.noticeTitle}>Send Mobile Money to +256 784 871903</Text><Text style={styles.noticeText}>Then enter the transaction ID below. Verification may take 2–3 working days.</Text></View> : null}
          <FormField label="Amount (UGX)" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0" value={amount} />
          {requestType === "momo" ? <><FormField label="MTN Mobile Money number" keyboardType="phone-pad" onChangeText={setPhone} placeholder="07XXXXXXXX" value={phone} /><Text style={styles.breakdown}>MTN fee (2%): {formatCurrency(fee)} · Savings credit: {formatCurrency(Math.max(amountNumber - fee, 0))}</Text></> : null}
          {requestType === "deposit" ? <FormField label="Mobile Money transaction ID" onChangeText={setReference} placeholder="Example: 1234567890" value={reference} /> : null}
          {requestType === "withdrawal" ? <><Text style={styles.fieldLabel}>Preferred payout method</Text><View style={styles.methodRow}>{(["mobile_money", "bank_transfer", "cash", "cheque"] as const).map((method) => <Pressable key={method} onPress={() => setPaymentMethod(method)} style={[styles.method, paymentMethod === method && styles.methodActive]}><Text style={[styles.methodText, paymentMethod === method && styles.methodTextActive]}>{formatLabel(method)}</Text></Pressable>)}</View><FormField label="Phone number, bank reference, or note (optional)" onChangeText={setReference} placeholder="Payout details" value={reference} /></> : null}
          <FormField label={requestType === "withdrawal" ? "Reason / notes (optional)" : "Notes (optional)"} multiline onChangeText={setNotes} placeholder="Add a note" value={notes} />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable disabled={submitting} onPress={submitRequest} style={[styles.submit, submitting && styles.disabled]}><Text style={styles.submitText}>{submitting ? "Submitting..." : requestType === "momo" ? "Send payment prompt" : "Submit request"}</Text></Pressable>
        </View> : null}
      </> : null}

      <SectionHeader title="Accounts" subtitle="Top accounts are shown first for quick review." />
      {visibleAccounts.length ? visibleAccounts.map((account) => (
        <View key={account.id} style={styles.card}>
          <View style={styles.rowTop}>
            <View style={styles.cardIdentity}><View style={styles.accountIcon}><Ionicons color={colors.primaryDark} name="wallet-outline" size={18} /></View><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardTitle}>{account.client_name}</Text><Text style={styles.accountNumber}>{account.account_number || "Savings account"}</Text></View></View>
            <StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} />
          </View>
          <AmountRow label="Available balance" value={formatCurrency(account.balance)} tone="success" />
          {account.opening_date ? <Text style={styles.muted}>Opened {formatDate(account.opening_date)}</Text> : null}
        </View>
      )) : <ResourceEmpty text="No savings accounts available for your account." />}
      {accounts.length > ACCOUNT_LIMIT ? <ExpandButton expanded={accountsExpanded} hiddenCount={accounts.length - ACCOUNT_LIMIT} onPress={() => setAccountsExpanded((value) => !value)} /> : null}

      <View style={styles.activityHeading}><SectionHeader title="Recent transactions" /><Text style={styles.activityCount}>{filteredTransactions.length} record{filteredTransactions.length === 1 ? "" : "s"}</Text></View>
      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
        {transactionFilters.map((filter) => {
          const active = transactionFilter === filter.value;
          return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={filter.value} onPress={() => { setTransactionFilter(filter.value); setTransactionsExpanded(false); }} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text></Pressable>;
        })}
      </ScrollView>
      {visibleTransactions.length ? visibleTransactions.map((item) => (
        <View key={item.id} style={styles.transactionCard}>
          <View style={styles.rowTop}>
            <View style={styles.cardIdentity}><View style={[styles.transactionIcon, item.transaction_type === "withdrawal" && styles.withdrawalIcon]}><Ionicons color={item.transaction_type === "withdrawal" ? colors.danger : colors.success} name={item.transaction_type === "withdrawal" ? "arrow-up" : "arrow-down"} size={17} /></View><View style={styles.cardCopy}><Text style={styles.transactionTitle}>{formatLabel(item.transaction_type)}</Text><Text style={styles.transactionDate}>{formatDate(item.transaction_date)} · {formatLabel(item.payment_method || "method not recorded")}</Text></View></View>
            <Text style={[styles.transactionAmount, item.transaction_type === "withdrawal" && styles.withdrawalAmount]}>{item.transaction_type === "withdrawal" ? "−" : "+"}{formatCurrency(item.amount)}</Text>
          </View>
          <View style={styles.transactionFooter}><Text numberOfLines={1} style={styles.clientName}>{item.client_name}</Text><StatusBadge tone={["approved", "completed", "posted"].includes(item.status) ? "success" : item.status === "rejected" ? "danger" : "warning"} text={item.status || "posted"} /></View>
        </View>
      )) : <ResourceEmpty text={transactionFilter === "all" ? "No recent savings transactions found." : "No transactions match this filter."} />}
      {filteredTransactions.length > RECENT_TRANSACTION_LIMIT ? <ExpandButton expanded={transactionsExpanded} hiddenCount={filteredTransactions.length - RECENT_TRANSACTION_LIMIT} onPress={() => setTransactionsExpanded((value) => !value)} /> : null}
    </Screen>
  );
}

function ActionButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.action, active && styles.actionActive]}><Ionicons color={active ? "white" : colors.primaryDark} name={icon} size={19} /><Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text></Pressable>;
}

function ExpandButton({ expanded, hiddenCount, onPress }: { expanded: boolean; hiddenCount: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={styles.expandButton}><Text style={styles.expandText}>{expanded ? "Show less" : `Show all (${hiddenCount} more)`}</Text><Ionicons color={colors.primaryDark} name={expanded ? "chevron-up" : "chevron-down"} size={18} /></Pressable>;
}

function FormField({ label, multiline, ...props }: { label: string; multiline?: boolean; keyboardType?: "decimal-pad" | "phone-pad"; onChangeText: (value: string) => void; placeholder: string; value: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput multiline={multiline} placeholderTextColor={colors.muted} style={[styles.input, multiline && styles.textarea]} {...props} /></View>;
}

const styles = StyleSheet.create({
  accountIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  accountNumber: { color: colors.muted, fontSize: 11, marginTop: 2 },
  action: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.xs, justifyContent: "center", minHeight: 60, minWidth: 0, paddingHorizontal: spacing.xs },
  actionActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  actionText: { color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  actionTextActive: { color: "white" },
  activityCount: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  activityHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  breakdown: { color: colors.primaryDark, fontSize: 12, fontWeight: "700", marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardCopy: { flex: 1, minWidth: 0 },
  cardIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 },
  cardTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  clientName: { color: colors.muted, flex: 1, fontSize: 11 },
  disabled: { opacity: 0.65 },
  error: { color: colors.danger, marginTop: spacing.md },
  expandButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginBottom: spacing.lg, minHeight: 42, paddingHorizontal: spacing.md },
  expandText: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  field: { marginTop: spacing.md },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs, marginTop: spacing.md },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: spacing.md },
  method: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  methodActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  methodText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  methodTextActive: { color: colors.primaryDark },
  muted: { color: colors.muted, marginTop: spacing.xs },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, marginTop: spacing.md, padding: spacing.md },
  noticeText: { color: colors.primaryDark, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  noticeTitle: { color: colors.primaryDark, fontWeight: "900" },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  submit: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, justifyContent: "center", marginTop: spacing.lg, minHeight: 50 },
  submitText: { color: "white", fontWeight: "900" },
  textarea: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: "top" },
  transactionAmount: { color: colors.success, fontSize: 14, fontWeight: "900", marginLeft: spacing.sm },
  transactionCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  transactionDate: { color: colors.muted, fontSize: 10, marginTop: 3 },
  transactionFooter: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm },
  transactionIcon: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  transactionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  withdrawalAmount: { color: colors.danger },
  withdrawalIcon: { backgroundColor: "#fef2f2" }
});
