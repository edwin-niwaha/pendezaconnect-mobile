import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { approveLoan, deleteLoan, disburseLoan, getLoan, rejectLoan, updateLoan, uploadLoanDocuments } from "@/api/loans";
import { getErrorMessage } from "@/api/client";
import { SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import { useAuth } from "@/providers/AuthProvider";
import type { Loan, LoanApplicationPayload, LoanRepaymentScheduleItem } from "@/types";
import { isClientAccount } from "@/utils/roles";
import { formatCurrency, formatDate, formatLabel, joinMeta } from "@/utils/format";

type LoanAsset = NonNullable<LoanApplicationPayload["national_id"]>;

const loanPurposes = [
  { label: "Business", value: "business" },
  { label: "School Fees", value: "school_fees" },
  { label: "Investment", value: "investment" },
  { label: "Agriculture", value: "agriculture" },
  { label: "Emergency", value: "emergency" },
  { label: "Development", value: "personal_development" },
  { label: "Salary Advance", value: "salary" }
];

function loanTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("overdue")) return "danger";
  if (normalized.includes("pending")) return "warning";
  if (normalized.includes("approved") || normalized.includes("disbursed")) return "success";
  if (normalized.includes("closed") || normalized.includes("repaid")) return "neutral";
  return "info";
}

function fileLabel(asset?: LoanAsset | null) {
  return asset?.fileName || (asset ? "Selected image" : "Choose image");
}

const approvalSteps = [
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "disbursed", label: "Disbursed" },
  { key: "repaid", label: "Repaid" }
] as const;

function approvalStep(status: string) {
  const value = status.toLowerCase();
  if (value.includes("closed") || value.includes("repaid")) return 3;
  if (value.includes("disburs") || value.includes("overdue") || value.includes("active")) return 2;
  if (value.includes("approv")) return 1;
  return 0;
}

export function LoanDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const loanId = Number(params.id);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editForm, setEditForm] = useState<Partial<LoanApplicationPayload>>({});
  const [documents, setDocuments] = useState<Pick<LoanApplicationPayload, "national_id" | "bank_statement">>({ national_id: null, bank_statement: null });
  const canManageDocuments = Boolean(loan?.can_update || (isClientAccount(user) && loan && !["approved", "disbursed", "active", "overdue", "closed", "repaid"].some((status) => loan.status.toLowerCase().includes(status))));

  const load = useCallback(async () => {
    if (!Number.isFinite(loanId)) {
      setError("Loan details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nextLoan = await getLoan(loanId);
      setLoan(nextLoan);
      setEditForm({
        principal_amount: String(nextLoan.principal_amount ?? ""),
        loan_period_months: String(nextLoan.loan_period_months ?? ""),
        loan_purpose: nextLoan.loan_purpose || "business",
        reason_for_approval: nextLoan.reason_for_approval || ""
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load loan details."));
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<Loan | void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await action();
      if (next) setLoan(next);
      setMessage(success);
    } catch (err) {
      setError(getErrorMessage(err, "Could not complete this loan action."));
    } finally {
      setBusy(false);
    }
  }

  async function pickDocument(field: "national_id" | "bank_statement") {
    setError("");
    try {
      // The system photo picker does not require broad library access and works
      // with Android's intentionally blocked READ_MEDIA_IMAGES permission.
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, mediaTypes: ["images"], quality: 0.88 });
      if (!result.canceled) setDocuments((current) => ({ ...current, [field]: result.assets[0] }));
    } catch (err) {
      setError(getErrorMessage(err, "Could not open your photos. Check the app settings and try again."));
    }
  }

  function documentField(type: string): "national_id" | "bank_statement" | null {
    const normalized = type.toLowerCase();
    if (normalized.includes("national") || normalized.includes("identity")) return "national_id";
    if (normalized.includes("bank") || normalized.includes("statement")) return "bank_statement";
    return null;
  }

  function interestMethod() {
    const method = loan?.interest_method || loan?.interest_rate_method;
    return method ? formatLabel(method) : "Flat rate";
  }

  function repaymentSchedule(): LoanRepaymentScheduleItem[] {
    if (!loan) return [];
    if (loan.repayment_schedule?.length) return loan.repayment_schedule;
    const count = Math.max(0, Number(loan.loan_period_months));
    const start = new Date(loan.start_date);
    const principal = Number(loan.principal_amount) / count;
    const interest = Number(loan.total_interest) / count;
    if (!count || Number.isNaN(start.getTime())) return [];
    return Array.from({ length: count }, (_, index) => {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + index + 1);
      return { installment_number: index + 1, due_date: dueDate.toISOString(), principal: String(principal), interest: String(interest), amount: String(principal + interest) };
    });
  }

  async function uploadDocuments() {
    if (!loan) return;
    if (!documents.national_id && !documents.bank_statement) {
      setError("Choose at least one document image to upload.");
      return;
    }
    await runAction(async () => {
      await uploadLoanDocuments(loan.id, documents);
      setDocuments({ national_id: null, bank_statement: null });
      return getLoan(loan.id);
    }, "Documents uploaded.");
  }

  async function saveUpdates() {
    if (!loan) return;
    await runAction(async () => {
      const next = await updateLoan(loan.id, editForm);
      setShowEdit(false);
      return next;
    }, "Loan updated.");
  }

  function confirmDelete() {
    if (!loan) return;
    Alert.alert("Delete loan", `Delete loan #${loan.id}?`, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => void runAction(async () => {
          await deleteLoan(loan.id);
          router.replace("/(tabs)/loans");
        }, "Loan deleted."),
        style: "destructive",
        text: "Delete"
      }
    ]);
  }

  function showApprovalReason() {
    const approvalReason = loan?.reason_for_approval?.trim();
    Alert.alert(
      "Reason for approval",
      approvalReason || "No reason for approval was provided.",
      [{ text: "Close" }]
    );
  }

  if (loading && !loan) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.pageHeading}><View><Text style={styles.pageEyebrow}>Loan record</Text><Text style={styles.pageTitle}>Loan details</Text></View><View style={styles.pageIcon}><Ionicons name="cash" color={colors.primaryDark} size={22} /></View></View>
      <ResourceError message={error} />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {loan ? (
        <>
          <View style={[styles.hero, loan.status.toLowerCase().includes("overdue") && styles.heroDanger]}>
            <View style={styles.heroTop}><View style={styles.loanIdentity}><View style={styles.heroIcon}><Ionicons name="document-text-outline" color="white" size={21} /></View><View><Text style={styles.loanNumber}>Loan #{loan.id}</Text><Text numberOfLines={1} style={styles.borrower}>{loan.borrower_name}</Text></View></View><StatusBadge tone={loanTone(loan.status)} text={formatLabel(loan.status)} /></View>
            <Text style={styles.heroLabel}>Outstanding balance</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>{loan.total_outstanding ? formatCurrency(loan.total_outstanding) : formatCurrency(loan.total_repayable)}</Text>
            <View style={styles.heroMeta}><Text numberOfLines={1} style={styles.heroMetaText}>{joinMeta([loan.borrower_reg_number, loan.loan_purpose ? formatLabel(loan.loan_purpose) : null])}</Text><Text style={styles.heroMetaText}>{loan.due_date ? `Due ${formatDate(loan.due_date)}` : `${loan.loan_period_months} months`}</Text></View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.rowTop}>
              <Text style={styles.cardTitle}>Approval progress</Text>
              <Text style={styles.progressCaption}>{loan.status.toLowerCase().includes("reject") ? "Needs attention" : `${approvalStep(loan.status) + 1} of ${approvalSteps.length}`}</Text>
            </View>
            <View style={styles.progressRow}>
              {approvalSteps.map((step, index) => {
                const reached = index <= approvalStep(loan.status) && !loan.status.toLowerCase().includes("reject");
                const current = index === approvalStep(loan.status) && !loan.status.toLowerCase().includes("reject");
                return (
                  <View key={step.key} style={styles.progressStep}>
                    <View style={[styles.progressDot, reached && styles.progressDotReached]}>
                      <Ionicons name={reached ? "checkmark" : "ellipse-outline"} color={reached ? "white" : colors.muted} size={13} />
                    </View>
                    <Text numberOfLines={1} style={[styles.progressLabel, current && styles.progressLabelCurrent]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.muted}>{loan.status.toLowerCase().includes("reject") ? "This application was not approved. Review the reason below and update it if changes are allowed." : `Current stage: ${formatLabel(loan.status)}`}</Text>
            {loan.reason_for_approval?.trim() ? (
              <Pressable
                accessibilityHint="Opens the approval reason in a message box"
                accessibilityLabel="View reason for approval"
                accessibilityRole="button"
                onPress={showApprovalReason}
                style={styles.approvalReasonButton}
              >
                <Ionicons name="chatbox-ellipses-outline" color={colors.primaryDark} size={18} />
                <Text style={styles.approvalReasonButtonText}>View approval reason</Text>
                <Ionicons name="chevron-forward" color={colors.primaryDark} size={17} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Financial summary</Text><Text style={styles.sectionHint}>{loan.loan_period_months} month term</Text></View>
          <View style={styles.financeGrid}>
            <FinanceTile icon="cash-outline" label="Principal" value={formatCurrency(loan.principal_amount)} />
            <FinanceTile icon="trending-up-outline" label="Interest" value={`${loan.interest_rate}% · ${interestMethod()}`} />
            <FinanceTile icon="calculator-outline" label="Interest total" value={formatCurrency(loan.total_interest)} />
            <FinanceTile icon="receipt-outline" label="Total repayable" value={formatCurrency(loan.total_repayable)} />
            <FinanceTile icon="calendar-outline" label="Monthly payment" value={formatCurrency(loan.monthly_installment)} />
            <FinanceTile danger={loan.status.toLowerCase().includes("overdue")} icon="wallet-outline" label="Outstanding" value={loan.total_outstanding ? formatCurrency(loan.total_outstanding) : "Not available"} />
          </View>

          <View style={styles.card}>
            <Pressable accessibilityRole="button" onPress={() => setShowSchedule((value) => !value)} style={styles.rowTop}>
              <View style={styles.scheduleHeading}>
                <Ionicons name="calendar-outline" color={colors.primaryDark} size={20} />
                <View>
                  <Text style={styles.cardTitle}>Repayment schedule</Text>
                  <Text style={styles.compactMuted}>{loan.loan_period_months} monthly installments</Text>
                </View>
              </View>
              <Ionicons name={showSchedule ? "chevron-up" : "chevron-down"} color={colors.muted} size={20} />
            </Pressable>
            {showSchedule ? (
              <View style={styles.scheduleList}>
                {!loan.repayment_schedule?.length ? <Text style={styles.scheduleNote}>Estimated schedule based on the current loan totals.</Text> : null}
                {repaymentSchedule().map((item, index) => (
                  <View key={`${item.installment_number || item.number || index}-${item.due_date}`} style={styles.scheduleRow}>
                    <View style={styles.installmentNumber}><Text style={styles.installmentNumberText}>{item.installment_number || item.number || index + 1}</Text></View>
                    <View style={styles.scheduleCopy}>
                      <Text style={styles.documentTitle}>{formatDate(item.due_date)}</Text>
                      <Text style={styles.compactMuted}>Principal {formatCurrency(item.principal || 0)} · Interest {formatCurrency(item.interest || 0)}</Text>
                    </View>
                    <Text style={styles.scheduleAmount}>{formatCurrency(item.total_due || item.amount || loan.monthly_installment)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {loan.reason_for_rejection ? <Text style={styles.warningText}>Rejected: {loan.reason_for_rejection}</Text> : null}

          <SectionHeader title="Documents" subtitle="Required documents must be present before approval." />
          {loan.missing_required_documents?.length ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Missing documents</Text>
              <Text style={styles.muted}>{loan.missing_required_documents.map((doc) => doc.label).join(", ")}</Text>
            </View>
          ) : null}
          {loan.documents?.length ? loan.documents.map((document) => {
            const field = documentField(document.document_type);
            return (
            <View key={document.id} style={styles.documentCard}>
              <Ionicons name="document-text-outline" color={colors.primaryDark} size={20} />
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle}>{document.document_type_label}</Text>
                <Text style={styles.muted}>{document.description || "Uploaded document"}</Text>
              </View>
              <View style={styles.documentActions}>
                {document.file_url ? <Pressable accessibilityLabel={`View ${document.document_type_label}`} onPress={() => Linking.openURL(document.file_url!)} style={styles.iconButton}><Ionicons name="eye-outline" color={colors.primaryDark} size={19} /></Pressable> : null}
                {canManageDocuments && field ? <Pressable accessibilityLabel={`Replace ${document.document_type_label}`} onPress={() => pickDocument(field)} style={styles.iconButton}><Ionicons name="create-outline" color={colors.primaryDark} size={19} /></Pressable> : null}
              </View>
            </View>
          );
          }) : <EmptyState text="No documents are attached to this loan." />}

          {loan.can_update ? (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.cardTitle}>Update loan</Text>
                <Pressable onPress={() => setShowEdit((value) => !value)} style={styles.smallAction}>
                  <Text style={styles.smallActionText}>{showEdit ? "Close" : "Edit"}</Text>
                </Pressable>
              </View>
              {showEdit ? (
                <>
                  <TextInput keyboardType="numeric" onChangeText={(value) => setEditForm((current) => ({ ...current, principal_amount: value }))} placeholder="Principal amount" placeholderTextColor={colors.muted} style={styles.input} value={editForm.principal_amount} />
                  <TextInput keyboardType="numeric" onChangeText={(value) => setEditForm((current) => ({ ...current, loan_period_months: value }))} placeholder="Period in months" placeholderTextColor={colors.muted} style={styles.input} value={editForm.loan_period_months} />
                  <TextInput onChangeText={(value) => setEditForm((current) => ({ ...current, reason_for_approval: value }))} placeholder="Assessment notes" placeholderTextColor={colors.muted} style={styles.input} value={editForm.reason_for_approval} />
                  <View style={styles.purposeGrid}>
                    {loanPurposes.map((purpose) => (
                      <Pressable key={purpose.value} onPress={() => setEditForm((current) => ({ ...current, loan_purpose: purpose.value }))} style={[styles.purposeButton, editForm.loan_purpose === purpose.value && styles.purposeButtonActive]}>
                        <Text style={[styles.purposeText, editForm.loan_purpose === purpose.value && styles.purposeTextActive]}>{purpose.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable disabled={busy} onPress={saveUpdates} style={styles.primaryButton}>
                    {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Save updates</Text>}
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {canManageDocuments ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Attach or replace documents</Text>
              <Text style={styles.muted}>Choose a new file for a document type, then save your selection.</Text>
              <Pressable onPress={() => pickDocument("national_id")} style={styles.documentButton}>
                <Ionicons name="id-card-outline" color={colors.primaryDark} size={18} />
                <Text numberOfLines={1} style={styles.documentText}>National ID: {fileLabel(documents.national_id)}</Text>
              </Pressable>
              <Pressable onPress={() => pickDocument("bank_statement")} style={styles.documentButton}>
                <Ionicons name="document-text-outline" color={colors.primaryDark} size={18} />
                <Text numberOfLines={1} style={styles.documentText}>Bank statement: {fileLabel(documents.bank_statement)}</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={uploadDocuments} style={styles.primaryButton}>
                {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{loan.documents?.length ? "Save document changes" : "Upload selected documents"}</Text>}
              </Pressable>
            </View>
          ) : null}

          {(loan.can_approve || loan.can_reject || loan.can_delete || loan.can_disburse) ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Review actions</Text>
              {loan.can_reject ? <TextInput onChangeText={setReason} placeholder="Rejection reason" placeholderTextColor={colors.muted} style={styles.input} value={reason} /> : null}
              <View style={styles.actions}>
                {loan.can_approve ? (
                  <Pressable disabled={busy} onPress={() => runAction(() => approveLoan(loan.id), "Loan moved to the next approval stage.")} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Approve</Text>
                  </Pressable>
                ) : null}
                {loan.can_reject ? (
                  <Pressable disabled={busy} onPress={() => runAction(() => rejectLoan(loan.id, reason || "Rejected from mobile review."), "Loan rejected.")} style={styles.dangerButton}>
                    <Text style={styles.dangerButtonText}>Reject</Text>
                  </Pressable>
                ) : null}
                {loan.can_disburse ? (
                  <Pressable disabled={busy} onPress={() => runAction(() => disburseLoan(loan.id), "Loan disbursed.")} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Disburse</Text>
                  </Pressable>
                ) : null}
                {loan.can_delete ? (
                  <Pressable disabled={busy} onPress={confirmDelete} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState text="Loan details are unavailable." />
      )}
    </Screen>
  );
}

function FinanceTile({ danger = false, icon, label, value }: { danger?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const tone = danger ? colors.danger : colors.primaryDark;
  return <View style={styles.financeTile}><View style={[styles.financeIcon, { backgroundColor: `${tone}14` }]}><Ionicons name={icon} color={tone} size={16} /></View><View style={styles.financeCopy}><Text style={styles.financeLabel}>{label}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.financeValue, danger && styles.financeDanger]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  approvalReasonButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md },
  approvalReasonButtonText: { color: colors.primaryDark, flex: 1, fontWeight: "900" },
  borrower: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 2, maxWidth: 170 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  compactMuted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dangerButton: { alignItems: "center", backgroundColor: colors.danger, borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 44, minWidth: 110 },
  dangerButtonText: { color: "white", fontWeight: "900" },
  documentButton: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md },
  documentCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  documentActions: { flexDirection: "row", gap: spacing.xs },
  documentCopy: { flex: 1 },
  documentText: { color: colors.primaryDark, flex: 1, fontWeight: "800" },
  documentTitle: { color: colors.text, fontWeight: "900" },
  financeCopy: { flex: 1, minWidth: 0 },
  financeDanger: { color: colors.danger },
  financeGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md, rowGap: spacing.sm },
  financeIcon: { alignItems: "center", borderRadius: 10, height: 32, justifyContent: "center", width: 32 },
  financeLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  financeTile: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexDirection: "row", flexGrow: 1, gap: spacing.sm, minHeight: 66, minWidth: 0, padding: spacing.sm },
  financeValue: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 2 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.md, overflow: "hidden", padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 14 },
  heroDanger: { backgroundColor: "#991b1b" },
  heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  heroLabel: { color: "#ccfbf1", fontSize: 9, fontWeight: "800", marginTop: spacing.lg, textTransform: "uppercase" },
  heroMeta: { borderTopColor: "rgba(255,255,255,0.16)", borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginTop: spacing.md, paddingTop: spacing.sm },
  heroMetaText: { color: "rgba(255,255,255,0.72)", flexShrink: 1, fontSize: 10, fontWeight: "700" },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  heroValue: { color: "white", fontSize: 28, fontWeight: "900", marginTop: 3, maxWidth: 290 },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: spacing.md },
  installmentNumber: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  installmentNumberText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 },
  loanIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  loanNumber: { color: "white", fontSize: 15, fontWeight: "900" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  pageEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  pageHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, marginTop: spacing.xs },
  pageIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  pageTitle: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 2 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 44, minWidth: 130, paddingHorizontal: spacing.md },
  primaryButtonText: { color: "white", fontWeight: "900" },
  purposeButton: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  purposeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  purposeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  purposeText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  purposeTextActive: { color: "white" },
  progressCaption: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  progressCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  progressDot: { alignItems: "center", backgroundColor: "#e2e8f0", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  progressDotReached: { backgroundColor: colors.primary },
  progressLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: spacing.xs, maxWidth: 70 },
  progressLabelCurrent: { color: colors.primaryDark, fontWeight: "900" },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressStep: { alignItems: "center", flex: 1, minWidth: 0 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  scheduleAmount: { color: colors.text, fontSize: 12, fontWeight: "900" },
  scheduleCopy: { flex: 1 },
  scheduleHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  scheduleList: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.xs, paddingTop: spacing.sm },
  scheduleNote: { color: colors.warning, fontSize: 12, marginBottom: spacing.sm },
  scheduleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionHint: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, minWidth: 110 },
  secondaryButtonText: { color: colors.text, fontWeight: "900" },
  smallAction: { backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  smallActionText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "800", marginBottom: spacing.md, padding: spacing.md },
  warningBox: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  warningText: { backgroundColor: "#fee2e2", borderRadius: radius.md, color: colors.danger, fontWeight: "800", lineHeight: 20, marginBottom: spacing.md, padding: spacing.md },
  warningTitle: { color: colors.warning, fontWeight: "900" }
});
