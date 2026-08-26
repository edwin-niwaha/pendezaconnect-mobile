import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { applyForLoan } from "@/api/loans";
import { getErrorMessage } from "@/api/client";
import { StatusBadge } from "@/components/Polished";
import { LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { notifyRunningLoanBalance } from "@/features/notifications/notifications";
import { useAuth } from "@/providers/AuthProvider";
import type { Loan, LoanApplicationPayload } from "@/types";
import { isClientAccount, isStaffAccount } from "@/utils/roles";
import { formatCurrency, formatDate, formatLabel, joinMeta } from "@/utils/format";
import { useLoans } from "./useLoans";

const loanPurposes = [
  { label: "Business", value: "business" },
  { label: "School Fees", value: "school_fees" },
  { label: "Investment", value: "investment" },
  { label: "Agriculture", value: "agriculture" },
  { label: "Emergency", value: "emergency" },
  { label: "Development", value: "personal_development" },
  { label: "Salary Advance", value: "salary" }
];

const loanStatusFilters = [
  { label: "All", statuses: [], value: "all" },
  { label: "Pending", statuses: ["pending", "boo_approved", "hof_approved", "ed_approved"], value: "pending" },
  { label: "Approved", statuses: ["approved"], value: "approved" },
  { label: "Disbursed", statuses: ["disbursed"], value: "disbursed" },
  { label: "Overdue", statuses: ["overdue"], value: "overdue" },
  { label: "Repaid", statuses: ["repaid"], value: "repaid" },
  { label: "Closed", statuses: ["closed"], value: "closed" },
  { label: "Rejected", statuses: ["rejected", "ed_rejected", "hof_rejected"], value: "rejected" }
] as const;

function loanTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("overdue")) return "danger";
  if (normalized.includes("pending")) return "warning";
  if (normalized.includes("approved") || normalized.includes("disbursed")) return "success";
  if (normalized.includes("closed") || normalized.includes("repaid")) return "neutral";
  return "info";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type LoanAsset = NonNullable<LoanApplicationPayload["national_id"]>;

function fileLabel(asset?: LoanAsset | null) {
  return asset?.fileName || (asset ? "Selected image" : "Choose image");
}

export function LoansOptimizedScreen() {
  const { user } = useAuth();
  const client = isClientAccount(user);
  const staff = isStaffAccount(user);
  const [statusFilter, setStatusFilter] = useState("all");
  const selectedStatuses = loanStatusFilters.find((filter) => filter.value === statusFilter)?.statuses ?? loanStatusFilters[0].statuses;
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, queue, refresh, refreshing, search, setSearch } = useLoans([...selectedStatuses], staff);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [applyToast, setApplyToast] = useState("");
  const [hasBlockingLoan, setHasBlockingLoan] = useState(true);
  const [form, setForm] = useState<LoanApplicationPayload>({
    principal_amount: "",
    loan_purpose: "business",
    loan_period_months: "",
    start_date: todayIso(),
    reason_for_approval: "",
    national_id: null,
    bank_statement: null
  });

  const displayItems = selectedStatuses.length ? items.filter((item) => (selectedStatuses as readonly string[]).includes(item.status)) : items;
  const activeLoans = displayItems.filter((item) => ["approved", "disbursed", "overdue"].includes(item.status)).length;
  const overdueLoans = displayItems.filter((item) => item.status.toLowerCase().includes("overdue")).length;
  const outstanding = displayItems.reduce((sum, item) => sum + Number(item.total_outstanding ?? 0), 0);
  const runningLoans = displayItems.filter((item) => Number(item.total_outstanding ?? 0) > 0 && ["approved", "disbursed", "active", "overdue"].some((status) => item.status.toLowerCase().includes(status)));
  const primaryRunningLoanId = runningLoans[0]?.id;
  const runningLoanIds = runningLoans.map((loan) => loan.id).sort((a, b) => a - b).join("-");
  const nextDue = displayItems.filter((item) => item.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];

  useEffect(() => {
    if (statusFilter !== "all" || loading) return;
    setHasBlockingLoan(items.some((item) => !["closed", "repaid", "rejected", "cancelled", "canceled"].some((status) => item.status.toLowerCase().includes(status))));
  }, [items, loading, statusFilter]);

  useEffect(() => {
    if (!client || loading || !primaryRunningLoanId || outstanding <= 0 || !user) return;
    const day = new Date().toISOString().slice(0, 10);
    void notifyRunningLoanBalance({
      amount: formatCurrency(outstanding),
      loanId: primaryRunningLoanId,
      noticeKey: `${user.id}:${day}:${runningLoanIds}`
    }).catch(() => undefined);
  }, [client, loading, outstanding, primaryRunningLoanId, runningLoanIds, user]);

  useEffect(() => {
    if (!applyToast) return;
    const timer = setTimeout(() => setApplyToast(""), 5000);
    return () => clearTimeout(timer);
  }, [applyToast]);

  if (loading && !items.length) return <LoadingState />;

  function setField<K extends keyof LoanApplicationPayload>(key: K, value: LoanApplicationPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleApplication() {
    if (!showApply && hasBlockingLoan) {
      setApplyToast("You already have a pending application or running loan. New loan applications are available after the current one is completed.");
      return;
    }
    setApplyToast("");
    setShowApply((value) => !value);
  }

  async function pickDocument(field: "national_id" | "bank_statement") {
    setFormError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, mediaTypes: ["images"], quality: 0.88 });
      if (!result.canceled) setField(field, result.assets[0]);
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not open your photos. Check the app settings and try again."));
    }
  }

  async function submitApplication() {
    setFormError("");
    setFormMessage("");
    if (!form.principal_amount || !form.loan_period_months) {
      setFormError("Enter the amount and repayment period.");
      return;
    }
    if (!form.national_id || !form.bank_statement) {
      setFormError("Attach both National ID and Bank Statement images before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const loan = await applyForLoan(form);
      setHasBlockingLoan(true);
      setFormMessage(`Loan #${loan.id} submitted for review.`);
      setShowApply(false);
      setForm({ principal_amount: "", loan_purpose: "business", loan_period_months: "", start_date: todayIso(), reason_for_approval: "", national_id: null, bank_statement: null });
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not submit this loan application."));
    } finally {
      setSubmitting(false);
    }
  }

  function renderApplicationForm() {
    if (!client || !showApply) return null;
    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>New loan application</Text>
        <TextInput keyboardType="numeric" onChangeText={(value) => setField("principal_amount", value)} placeholder="Amount requested" placeholderTextColor={colors.muted} style={styles.input} value={form.principal_amount} />
        <TextInput keyboardType="numeric" onChangeText={(value) => setField("loan_period_months", value)} placeholder="Repayment period in months" placeholderTextColor={colors.muted} style={styles.input} value={form.loan_period_months} />
        <TextInput onChangeText={(value) => setField("reason_for_approval", value)} placeholder="Purpose notes" placeholderTextColor={colors.muted} multiline style={[styles.input, styles.textArea]} value={form.reason_for_approval} />
        <View style={styles.purposeGrid}>
          {loanPurposes.map((purpose) => (
            <Pressable key={purpose.value} onPress={() => setField("loan_purpose", purpose.value)} style={[styles.purposeButton, form.loan_purpose === purpose.value && styles.purposeButtonActive]}>
              <Text style={[styles.purposeText, form.loan_purpose === purpose.value && styles.purposeTextActive]}>{purpose.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.documentRow}>
          <View style={styles.documentChecklistHeader}>
            <Text style={styles.documentChecklistTitle}>Documents to attach</Text>
            <Text style={styles.documentCount}>2 required</Text>
          </View>
          <Text style={styles.documentHelp}>Attach a clear National ID and a recent bank statement.</Text>
          <Pressable onPress={() => pickDocument("national_id")} style={styles.documentButton}>
            <Ionicons name="id-card-outline" color={colors.primaryDark} size={18} />
            <Text numberOfLines={1} style={styles.documentText}>National ID: {fileLabel(form.national_id)}</Text>
          </Pressable>
          <Pressable onPress={() => pickDocument("bank_statement")} style={styles.documentButton}>
            <Ionicons name="document-text-outline" color={colors.primaryDark} size={18} />
            <Text numberOfLines={1} style={styles.documentText}>Bank statement: {fileLabel(form.bank_statement)}</Text>
          </Pressable>
        </View>
        <View style={styles.formActions}>
          <Pressable disabled={submitting} onPress={() => setShowApply(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable disabled={submitting} onPress={submitApplication} style={styles.primaryButton}>
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  function renderHeader() {
    return (
      <>
        <View style={styles.headingRow}><View><Text style={styles.screenTitle}>Loans</Text><Text style={styles.screenSubtitle}>Balances, applications and repayments</Text></View>{client ? <Pressable accessibilityLabel="Apply for loan" onPress={toggleApplication} style={styles.applyButton}><Ionicons name="add" color="white" size={20} /><Text style={styles.applyButtonText}>Apply</Text></Pressable> : null}</View>
        <Pressable disabled={!primaryRunningLoanId} onPress={() => primaryRunningLoanId && router.push(`/(tabs)/loans/${primaryRunningLoanId}`)} style={[styles.overviewCard, overdueLoans > 0 && styles.overviewCardDanger]}>
          <View style={styles.overviewTop}><View><Text style={styles.overviewLabel}>Total outstanding</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.overviewValue}>{formatCurrency(outstanding)}</Text></View>{primaryRunningLoanId ? <View style={styles.overviewArrow}><Ionicons name="arrow-forward" color="white" size={17} /></View> : null}</View>
          <View style={styles.summaryRow}><View style={styles.summaryItem}><Text style={styles.summaryValue}>{activeLoans}</Text><Text style={styles.summaryLabel}>Active</Text></View><View style={styles.summaryDivider} /><View style={styles.summaryItem}><Text style={styles.summaryValue}>{count}</Text><Text style={styles.summaryLabel}>Total</Text></View>{staff ? <><View style={styles.summaryDivider} /><View style={styles.summaryItem}><Text style={styles.summaryValue}>{queue.length}</Text><Text style={styles.summaryLabel}>To review</Text></View></> : nextDue ? <><View style={styles.summaryDivider} /><View style={[styles.summaryItem, styles.summaryItemWide]}><Text numberOfLines={1} style={styles.summaryValueSmall}>{formatDate(nextDue.due_date)}</Text><Text style={styles.summaryLabel}>Next due</Text></View></> : null}</View>
        </Pressable>
        <ResourceError message={error || formError} />
        {formMessage ? <Text style={styles.success}>{formMessage}</Text> : null}
        {applyToast ? (
          <View accessibilityLiveRegion="polite" style={styles.toast}>
            <Ionicons name="information-circle" color="white" size={21} />
            <Text style={styles.toastText}>{applyToast}</Text>
          </View>
        ) : null}
        {renderApplicationForm()}
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search loans" />
        <View style={styles.filterSection}>
          <View style={styles.filterHeading}><Text style={styles.filterLabel}>Filter by status</Text><Text style={styles.filterCount}>{count} result{count === 1 ? "" : "s"}</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {loanStatusFilters.map((filter) => {
              const active = statusFilter === filter.value;
              return <Pressable key={filter.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setStatusFilter(filter.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text></Pressable>;
            })}
          </ScrollView>
        </View>
        {staff && queue.length ? (
          <View style={styles.queueCard}>
            <Text style={styles.queueTitle}>Approval queue</Text>
            <Text style={styles.muted}>{queue.length} loan{queue.length === 1 ? "" : "s"} require your team’s attention.</Text>
          </View>
        ) : null}
        <View style={styles.listHeading}><Text style={styles.listTitle}>{client ? "My loans" : "Loan records"}</Text><Text style={styles.listHint}>Tap a record for details</Text></View>
      </>
    );
  }

  function renderLoan({ item }: { item: Loan }) {
    return (
      <Pressable onPress={() => router.push(`/(tabs)/loans/${item.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.rowTop}>
          <Text style={styles.title}>{joinMeta([`Loan #${item.id}`, item.borrower_name])}</Text>
          <StatusBadge tone={loanTone(item.status)} text={formatLabel(item.status)} />
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>{joinMeta([item.borrower_reg_number, item.loan_purpose ? formatLabel(item.loan_purpose) : "No purpose recorded"])}</Text>
        <View style={styles.amountGrid}><View style={styles.amountItem}><Text style={styles.amountLabel}>Principal</Text><Text numberOfLines={1} style={styles.amountValue}>{formatCurrency(item.principal_amount)}</Text></View><View style={styles.amountDivider} /><View style={styles.amountItem}><Text style={styles.amountLabel}>Outstanding</Text><Text numberOfLines={1} style={[styles.amountValue, item.status.toLowerCase().includes("overdue") && styles.amountDanger]}>{item.total_outstanding ? formatCurrency(item.total_outstanding) : "—"}</Text></View></View>
        <View style={styles.metaRow}><Ionicons name="calendar-outline" color={colors.muted} size={14} /><Text numberOfLines={1} style={styles.meta}>{joinMeta([`${item.loan_period_months} months`, item.monthly_installment ? `${formatCurrency(item.monthly_installment)}/month` : null, item.due_date ? `Due ${formatDate(item.due_date)}` : null])}</Text><Ionicons name="chevron-forward" color={colors.muted} size={16} /></View>
      </Pressable>
    );
  }

  return (
    <FlatList
      data={displayItems}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderLoan}
      ListHeaderComponent={renderHeader()}
      ListEmptyComponent={!loading && !error ? <ResourceEmpty text={search ? "No loans match your search and selected status." : statusFilter !== "all" ? "No loans have this status." : "No loans available for your account."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching loans are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more loans..." onRetry={loadMore} showEnd={displayItems.length > 0 && !hasMore} />}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      onRefresh={refresh}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  amountDanger: { color: colors.danger },
  amountDivider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 },
  amountGrid: { backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, padding: spacing.sm },
  amountItem: { flex: 1, minWidth: 0 },
  amountLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  amountValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 3 },
  applyButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 40, paddingHorizontal: spacing.md },
  applyButtonText: { color: "white", fontWeight: "900" },
  balanceNotice: { alignItems: "center", backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  balanceNoticeCopy: { flex: 1 },
  balanceNoticeTitle: { color: colors.warning, fontWeight: "900" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  documentButton: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md },
  documentChecklistHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  documentChecklistTitle: { color: colors.text, fontWeight: "900" },
  documentCount: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  documentHelp: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  documentRow: { gap: spacing.sm, marginTop: spacing.md },
  documentText: { color: colors.primaryDark, flex: 1, fontWeight: "800" },
  formActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  formTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.md },
  filterChip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterChipText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: "white" },
  filterCount: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  filterHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  filterLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterSection: { marginBottom: spacing.md },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, marginBottom: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  listHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, marginTop: spacing.xs },
  listHint: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  listTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  meta: { color: colors.muted, flex: 1, fontSize: 10, fontWeight: "700" },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  overviewArrow: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  overviewCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.md, padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.16, shadowRadius: 12 },
  overviewCardDanger: { backgroundColor: "#991b1b" },
  overviewLabel: { color: "#ccfbf1", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  overviewTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  overviewValue: { color: "white", fontSize: 25, fontWeight: "900", marginTop: 3, maxWidth: 250 },
  pressed: { opacity: 0.78 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 44 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  purposeButton: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  purposeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  purposeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  purposeText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  purposeTextActive: { color: "white" },
  queueCard: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  queueTitle: { color: colors.warning, fontSize: 16, fontWeight: "900" },
  root: { backgroundColor: colors.background, flex: 1 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  screenSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  screenTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  secondaryButtonText: { color: colors.text, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  summaryDivider: { backgroundColor: "rgba(255,255,255,0.2)", width: 1 },
  summaryItem: { flex: 1 },
  summaryItemWide: { flex: 1.5 },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: "700", marginTop: 2, textTransform: "uppercase" },
  summaryRow: { borderTopColor: "rgba(255,255,255,0.16)", borderTopWidth: 1, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm },
  summaryValue: { color: "white", fontSize: 15, fontWeight: "900" },
  summaryValueSmall: { color: "white", fontSize: 11, fontWeight: "900" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "800", marginBottom: spacing.md, padding: spacing.md },
  textArea: { minHeight: 78, paddingTop: spacing.md, textAlignVertical: "top" },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  toast: { alignItems: "flex-start", backgroundColor: colors.primaryDark, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  toastText: { color: "white", flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 }
});
