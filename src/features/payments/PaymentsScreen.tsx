import { getErrorMessage } from "@/api/client";
import { getMobileMoneyPaymentStatus, initiateMobileMoneyPayment, type MobileMoneyTransaction } from "@/api/payments";
import { Ionicons } from "@expo/vector-icons";
import { RowCard } from "@/components/Card";
import { StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, joinMeta } from "@/utils/format";
import { pickContactPhone } from "@/features/donations/pickContactPhone";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { usePayments } from "./usePayments";

const SPONSORSHIP_CATEGORIES = [
  { amount: 170000, name: "Child Full Support", caption: "Fully support one child’s education and care." },
  { amount: 85000, name: "Child Co-Support — 2 Sponsors", caption: "Share support for one child with another sponsor." },
  { amount: 60000, name: "Child Co-Support — 3 Sponsors", caption: "Make sponsorship lighter by sharing with two others." },
  { amount: 45000, name: "Child Co-Support — 4 Sponsors", caption: "A flexible way to help sustain a child’s future." },
  { amount: 70000, name: "Family Full Support", caption: "Support a family toward stability and dignity." },
  { amount: 35000, name: "Family Co-Support", caption: "Partner with others to support a family." },
  { amount: 40000, name: "General Support", caption: "Give toward the wider mission of Pendeza Uganda." }
];
const TERMINAL_STATUSES = new Set(["SUCCESSFUL", "FAILED"]);

function PaymentField({ keyboardType, label, onChangeText, onPickContact, placeholder, value }: { keyboardType?: KeyboardTypeOptions; label: string; onChangeText: (value: string) => void; onPickContact?: () => void; placeholder: string; value: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><TextInput autoCapitalize="none" keyboardType={keyboardType} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, onPickContact && styles.inputWithAction]} value={value} />{onPickContact ? <Pressable accessibilityLabel="Choose phone number from contacts" onPress={onPickContact} style={styles.contactButton}><Ionicons name="person-add-outline" color={colors.primaryDark} size={21} /></Pressable> : null}</View></View>;
}

export function PaymentsScreen({ publicMode = false }: { publicMode?: boolean }) {
  const history = usePayments(!publicMode);
  const [amount, setAmount] = useState("170000");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [transaction, setTransaction] = useState<MobileMoneyTransaction | null>(null);
  const transactionReference = transaction?.reference_id;
  const transactionStatus = transaction?.status;

  useEffect(() => {
    if (!transactionReference || !transactionStatus || TERMINAL_STATUSES.has(transactionStatus)) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getMobileMoneyPaymentStatus(transactionReference);
        if (!cancelled) setTransaction(next);
      } catch { /* A later poll can recover from a temporary network failure. */ }
    };
    const timer = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [transactionReference, transactionStatus]);

  const submitPayment = async () => {
    setPaymentError("");
    const parsedAmount = Number(amount.replace(/,/g, ""));
    const normalizedPhone = phone.replace(/\s/g, "");
    if (!Number.isFinite(parsedAmount) || parsedAmount < 5000) return setPaymentError("Enter an amount of at least UGX 5,000.");
    if (!/^07\d{8}$/.test(normalizedPhone)) return setPaymentError("Enter a valid MTN number in the format 07XXXXXXXX.");
    setSubmitting(true);
    try {
      setTransaction(await initiateMobileMoneyPayment({ amount: parsedAmount, phone: normalizedPhone, name: name.trim() || undefined, email: email.trim() || undefined }));
    } catch (requestError) {
      setPaymentError(getErrorMessage(requestError, "Could not send the payment prompt."));
    } finally { setSubmitting(false); }
  };

  const chooseContact = async () => {
    setPaymentError("");
    try {
      const selected = await pickContactPhone();
      if (selected) { setPhone(selected.phone); if (!name) setName(selected.name); }
    } catch (contactError) {
      setPaymentError(contactError instanceof Error ? contactError.message : "Could not open contacts.");
    }
  };

  if (!publicMode && history.loading && !history.items.length) return <LoadingState />;
  return <FlatList
    data={history.items}
    keyExtractor={(item) => String(item.id)}
    renderItem={({ item }) => <RowCard title={joinMeta([item.sponsor_name, formatCurrency(item.amount)])} subtitle={joinMeta([item.program_name || "Sponsor payment", formatDate(item.payment_date)])} meta={item.reference || item.sponsor_code} />}
    ListHeaderComponent={<>
      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Choose an amount</Text>
        <View style={styles.amountGrid}>{SPONSORSHIP_CATEGORIES.map((category) => <Pressable key={category.name} onPress={() => setAmount(String(category.amount))} style={[styles.amountChip, Number(amount) === category.amount && styles.amountChipActive]}><Text style={[styles.amountChipText, Number(amount) === category.amount && styles.amountChipTextActive]}>{formatCurrency(category.amount)} monthly</Text><Text style={[styles.categoryCaption, Number(amount) === category.amount && styles.categoryCaptionActive]}>{category.name} — {category.caption}</Text></Pressable>)}</View>
        <PaymentField keyboardType="number-pad" label="Amount (UGX)" onChangeText={setAmount} placeholder="Minimum 5,000" value={amount} />
        <PaymentField keyboardType="phone-pad" label="MTN phone number" onChangeText={setPhone} onPickContact={chooseContact} placeholder="07XXXXXXXX" value={phone} />
        <PaymentField label="Full name (optional)" onChangeText={setName} placeholder="Your name" value={name} />
        <PaymentField keyboardType="email-address" label="Email (optional)" onChangeText={setEmail} placeholder="name@example.com" value={email} />
        {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
        <Pressable disabled={submitting} onPress={submitPayment} style={({ pressed }) => [styles.payButton, (pressed || submitting) && styles.payButtonPressed]}>{submitting ? <ActivityIndicator color="white" /> : <Ionicons name="send" color="white" size={18} />}<Text style={styles.payButtonText}>{submitting ? "Sending prompt..." : "Send payment prompt"}</Text></Pressable>
      </View>
      {transaction ? <View style={[styles.statusCard, transaction.status === "SUCCESSFUL" && styles.statusSuccess, transaction.status === "FAILED" && styles.statusFailed]}><View style={styles.statusTop}><View><Text style={styles.statusTitle}>{transaction.status === "SUCCESSFUL" ? "Payment received" : transaction.status === "FAILED" ? "Payment failed" : "Approve on your phone"}</Text><Text style={styles.statusAmount}>{formatCurrency(transaction.amount)}</Text></View><StatusBadge text={transaction.status} tone={transaction.status === "SUCCESSFUL" ? "success" : transaction.status === "FAILED" ? "danger" : "warning"} /></View><Text style={styles.statusMessage}>{transaction.status === "PENDING" ? "Check your MTN MoMo prompt and enter your PIN. This screen updates automatically." : transaction.reason || (transaction.status === "SUCCESSFUL" ? "Thank you for supporting Pendeza Uganda." : "The request was not completed. You can send a new prompt.")}</Text><Text style={styles.reference}>Reference: {transaction.reference_id}</Text></View> : null}
      {!publicMode ? <><Text style={styles.historyTitle}>Payment history</Text><SearchBox value={history.search} onChangeText={history.setSearch} placeholder="Search payments" /><ResourceError message={history.error} /></> : null}
    </>}
    ListEmptyComponent={!publicMode && !history.loading && !history.error ? <EmptyState text={history.search ? "No payments match your search." : "No payments found."} /> : null}
    ListFooterComponent={!publicMode ? <PaginatedListFooter endText="All matching payments are loaded." error={history.loadMoreError} loading={history.loadingMore} loadingText="Loading more payments..." onRetry={history.loadMore} showEnd={history.items.length > 0 && !history.hasMore} /> : null}
    contentContainerStyle={styles.content} onEndReached={publicMode ? undefined : history.loadMore} onEndReachedThreshold={0.35} refreshing={publicMode ? false : history.refreshing} onRefresh={publicMode ? undefined : history.refresh} style={styles.root}
  />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, content: { padding: spacing.lg, paddingBottom: 36 },
  paymentCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg }, cardTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.md },
  amountGrid: { gap: spacing.sm, marginBottom: spacing.lg }, amountChip: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md }, amountChipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, amountChipText: { color: colors.text, fontSize: 15, fontWeight: "900" }, amountChipTextActive: { color: "white" }, categoryCaption: { color: colors.muted, fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: spacing.xs }, categoryCaptionActive: { color: "#ccfbf1" },
  field: { gap: spacing.xs, marginBottom: spacing.md }, label: { color: colors.text, fontSize: 13, fontWeight: "800" }, inputRow: { position: "relative" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.md }, inputWithAction: { paddingRight: 58 }, contactButton: { alignItems: "center", bottom: 1, justifyContent: "center", position: "absolute", right: 1, top: 1, width: 52 },
  payButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, padding: spacing.md }, payButtonPressed: { opacity: 0.72 }, payButtonText: { color: "white", fontSize: 15, fontWeight: "900" }, paymentError: { color: colors.danger, fontWeight: "700", lineHeight: 20, marginBottom: spacing.md },
  statusCard: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md, padding: spacing.lg }, statusSuccess: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }, statusFailed: { backgroundColor: "#fef2f2", borderColor: "#fecaca" }, statusTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, statusTitle: { color: colors.text, fontSize: 17, fontWeight: "900" }, statusAmount: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: spacing.xs }, statusMessage: { color: colors.muted, lineHeight: 20, marginTop: spacing.md }, reference: { color: colors.muted, fontSize: 11, marginTop: spacing.md },
  historyTitle: { color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: spacing.md, marginTop: spacing.xl }
});
