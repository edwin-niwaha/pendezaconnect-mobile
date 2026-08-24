import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getSponsor, getSponsorPayments } from "@/api/sponsors";
import { StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Payment, Sponsor, SponsorPayments, SponsorRelatedPayment } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

function sponsorTitle(sponsor: Sponsor) {
  return sponsor.full_name || `${sponsor.first_name || ""} ${sponsor.last_name || ""}`.trim() || `Sponsor #${sponsor.id}`;
}

function sponsorTypes(sponsor: Sponsor) {
  return [
    sponsor.is_child_sponsor ? "Child support" : "",
    sponsor.is_staff_sponsor ? "Staff support" : "",
    sponsor.is_family_supporter ? "Family support" : "",
    sponsor.is_general_donor ? "General support" : "",
    sponsor.is_one_time_donor ? "One-time donor" : ""
  ].filter(Boolean);
}

function sponsorPhoto(sponsor: Sponsor) {
  return sponsor.thumbnail_url || sponsor.current_picture_url || sponsor.picture_url || sponsor.photo_url || "";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

function paymentTotal(payments: SponsorPayments | null) {
  if (!payments) return 0;
  return [...payments.child_payments, ...payments.staff_payments, ...payments.sponsor_payments].reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

type RecentPayment = { kind: "Child" | "Staff" | "General"; payment: SponsorRelatedPayment | Payment };

function PaymentCard({ item }: { item: RecentPayment }) {
  const { payment, kind } = item;
  const beneficiary = "child_name" in payment && payment.child_name ? payment.child_name : "staff_name" in payment && payment.staff_name ? payment.staff_name : "program_name" in payment && payment.program_name ? payment.program_name : "General support";
  const valid = "is_valid" in payment ? payment.is_valid : undefined;
  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentTop}>
        <View style={styles.paymentIcon}><Ionicons color="#be185d" name={kind === "Child" ? "happy-outline" : kind === "Staff" ? "person-outline" : "heart-outline"} size={18} /></View>
        <View style={styles.paymentCopy}><Text numberOfLines={1} style={styles.paymentTitle}>{beneficiary}</Text><Text style={styles.paymentDate}>{formatDate(payment.payment_date)} · {kind}</Text></View>
        {valid !== undefined ? <StatusBadge tone={valid ? "success" : "warning"} text={valid ? "Valid" : "Pending"} /> : null}
      </View>
      <View style={styles.amountRow}><Text style={styles.amountLabel}>Amount</Text><Text style={styles.amount}>{formatCurrency(payment.amount)}</Text></View>
    </View>
  );
}

export function SponsorDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sponsorId = Number(params.id);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [payments, setPayments] = useState<SponsorPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(sponsorId)) {
      setError("Sponsor details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    const [sponsorResult, paymentResult] = await Promise.allSettled([getSponsor(sponsorId), getSponsorPayments(sponsorId)]);
    if (sponsorResult.status === "fulfilled") {
      setSponsor(sponsorResult.value);
      setPayments(paymentResult.status === "fulfilled" ? paymentResult.value : null);
    } else {
      setError(getErrorMessage(sponsorResult.reason, "Unable to load sponsor details."));
    }
    setLoading(false);
  }, [sponsorId]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !sponsor) return <LoadingState />;

  const title = sponsor ? sponsorTitle(sponsor) : "";
  const types = sponsor ? sponsorTypes(sponsor) : [];
  const photo = sponsor ? sponsorPhoto(sponsor) : "";
  const childCount = payments?.child_payments.length ?? 0;
  const staffCount = payments?.staff_payments.length ?? 0;
  const recentPayments: RecentPayment[] = [
    ...(payments?.child_payments ?? []).map((payment) => ({ kind: "Child" as const, payment })),
    ...(payments?.staff_payments ?? []).map((payment) => ({ kind: "Staff" as const, payment })),
    ...(payments?.sponsor_payments ?? []).map((payment) => ({ kind: "General" as const, payment }))
  ].sort((a, b) => String(b.payment.payment_date).localeCompare(String(a.payment.payment_date)));
  const visiblePayments = paymentsExpanded ? recentPayments : recentPayments.slice(0, 3);

  return (
    <Screen title="Sponsor Details">
      <ResourceError message={error} />
      {sponsor ? (
        <>
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              {photo ? <Image fadeDuration={120} source={{ uri: photo }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials(title)}</Text></View>}
              <View style={styles.profileCopy}>
                <Text style={styles.name}>{title}</Text>
                <Text style={styles.sponsorId}>{sponsor.prefixed_id || `Sponsor #${sponsor.id}`}</Text>
                <StatusBadge tone={sponsor.is_departed ? "danger" : "success"} text={sponsor.is_departed ? "Departed" : "Active sponsor"} />
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable disabled={!sponsor.mobile_telephone} onPress={() => void Linking.openURL(`tel:${sponsor.mobile_telephone}`)} style={[styles.actionButton, !sponsor.mobile_telephone && styles.disabled]}><Ionicons color={colors.primaryDark} name="call-outline" size={18} /><Text style={styles.actionText}>Call</Text></Pressable>
              <Pressable disabled={!sponsor.email} onPress={() => void Linking.openURL(`mailto:${sponsor.email}`)} style={[styles.actionButton, !sponsor.email && styles.disabled]}><Ionicons color={colors.primaryDark} name="mail-outline" size={18} /><Text style={styles.actionText}>Email</Text></Pressable>
            </View>
            <View style={styles.contactDetails}>
              {sponsor.mobile_telephone ? <Text selectable style={styles.contactText}>{sponsor.mobile_telephone}</Text> : null}
              {sponsor.email ? <Text selectable style={styles.contactText}>{sponsor.email}</Text> : null}
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeading}><View><Text style={styles.eyebrow}>Recorded support</Text><Text style={styles.totalAmount}>{formatCurrency(paymentTotal(payments))}</Text></View><View style={styles.heartBadge}><Ionicons color="#be185d" name="heart" size={22} /></View></View>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.metricValue}>{recentPayments.length}</Text><Text style={styles.metricLabel}>Recent records</Text></View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}><Text style={styles.metricValue}>{childCount}</Text><Text style={styles.metricLabel}>Child payments</Text></View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}><Text style={styles.metricValue}>{staffCount}</Text><Text style={styles.metricLabel}>Staff payments</Text></View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Support programmes</Text>
          <View style={styles.programmes}>{(types.length ? types : [sponsor.sponsorship_type || "Sponsor"]).map((type) => <View key={type} style={styles.programme}><Ionicons color="#be185d" name="heart-outline" size={16} /><Text style={styles.programmeText}>{type}</Text></View>)}</View>

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Recent payments</Text><Text style={styles.sectionCount}>{recentPayments.length} record{recentPayments.length === 1 ? "" : "s"}</Text></View>
          {visiblePayments.length ? visiblePayments.map((item, index) => <PaymentCard item={item} key={`${item.kind}-${item.payment.id}-${index}`} />) : <EmptyState text="No recent payments are available for this sponsor." />}
          {recentPayments.length > 3 ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: paymentsExpanded }} onPress={() => setPaymentsExpanded((expanded) => !expanded)} style={styles.expandButton}>
              <Text style={styles.expandText}>{paymentsExpanded ? "Show less" : `Show all (${recentPayments.length - 3} more)`}</Text>
              <Ionicons color={colors.primaryDark} name={paymentsExpanded ? "chevron-up" : "chevron-down"} size={18} />
            </Pressable>
          ) : null}
        </>
      ) : <EmptyState text="Sponsor details are unavailable." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 42 },
  actionText: { color: colors.primaryDark, fontWeight: "900" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  amount: { color: colors.success, fontSize: 16, fontWeight: "900" },
  amountLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  amountRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingTop: spacing.sm },
  avatar: { borderRadius: 34, height: 68, width: 68 },
  avatarFallback: { alignItems: "center", backgroundColor: "#fce7f3", borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  avatarText: { color: "#be185d", fontSize: 20, fontWeight: "900" },
  contactDetails: { alignItems: "center", marginTop: spacing.md },
  contactText: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  disabled: { opacity: 0.45 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  expandButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginBottom: spacing.md, minHeight: 42, paddingHorizontal: spacing.md },
  expandText: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  heartBadge: { alignItems: "center", backgroundColor: "#fce7f3", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  metric: { alignItems: "center", flex: 1 },
  metricDivider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: 2, textAlign: "center", textTransform: "uppercase" },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: "900" },
  metrics: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", marginTop: spacing.md, paddingTop: spacing.md },
  name: { color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: spacing.xs },
  paymentCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentDate: { color: colors.muted, fontSize: 11, marginTop: 3 },
  paymentIcon: { alignItems: "center", backgroundColor: "#fdf2f8", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  paymentTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  paymentTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  profileCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  profileCopy: { alignItems: "flex-start", flex: 1, minWidth: 0 },
  profileTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  programme: { alignItems: "center", backgroundColor: "#fdf2f8", borderColor: "#fbcfe8", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.md },
  programmeText: { color: "#9d174d", fontSize: 12, fontWeight: "800" },
  programmes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  sectionCount: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.md, marginTop: spacing.md },
  sponsorId: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm },
  summaryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  summaryHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  totalAmount: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.xs }
});
