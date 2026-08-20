import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
  if (loading && !data) return <LoadingState />;

  const accounts = data?.accounts ?? [];
  const transactions = data?.transactions ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const visibleAccounts = accounts.slice(0, ACCOUNT_LIMIT);
  const visibleTransactions = transactions.slice(0, RECENT_TRANSACTION_LIMIT);
  const deposits = transactions.filter((item) => item.transaction_type === "deposit").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const withdrawals = transactions.filter((item) => item.transaction_type === "withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
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
          <ActionButton active={requestType === "momo"} label="MoMo deposit" onPress={() => chooseType("momo")} />
          <ActionButton active={requestType === "deposit"} label="Direct deposit" onPress={() => chooseType("deposit")} />
          <ActionButton active={requestType === "withdrawal"} label="Withdraw" onPress={() => chooseType("withdrawal")} />
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
            <Text style={styles.cardTitle}>{account.client_name}</Text>
            <StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} />
          </View>
          <AmountRow label={account.account_number || "Account"} value={formatCurrency(account.balance)} tone="success" />
          {account.opening_date ? <Text style={styles.muted}>Opened {formatDate(account.opening_date)}</Text> : null}
        </View>
      )) : <ResourceEmpty text="No savings accounts available for your account." />}

      <SectionHeader title="Recent transactions" subtitle="Only the latest transactions appear here." />
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

function ActionButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.action, active && styles.actionActive]}><Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text></Pressable>;
}

function FormField({ label, multiline, ...props }: { label: string; multiline?: boolean; keyboardType?: "decimal-pad" | "phone-pad"; onChangeText: (value: string) => void; placeholder: string; value: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput multiline={multiline} placeholderTextColor={colors.muted} style={[styles.input, multiline && styles.textarea]} {...props} /></View>;
}

const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.xs },
  actionActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  actionText: { color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  actionTextActive: { color: "white" },
  breakdown: { color: colors.primaryDark, fontSize: 12, fontWeight: "700", marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  error: { color: colors.danger, marginTop: spacing.md },
  field: { marginTop: spacing.md },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs, marginTop: spacing.md },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
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
  textarea: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: "top" }
});
