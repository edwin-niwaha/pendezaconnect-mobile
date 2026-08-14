import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getSponsor, getSponsorPayments } from "@/api/sponsors";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Payment, Sponsor, SponsorPayments, SponsorRelatedPayment } from "@/types";
import { formatCurrency, formatDate, joinMeta } from "@/utils/format";

function sponsorTitle(sponsor: Sponsor) {
  return sponsor.full_name || `${sponsor.first_name} ${sponsor.last_name}`.trim();
}

function sponsorTypes(sponsor: Sponsor) {
  return [
    sponsor.is_child_sponsor ? "Child" : "",
    sponsor.is_staff_sponsor ? "Staff" : "",
    sponsor.is_family_supporter ? "Family" : "",
    sponsor.is_general_donor ? "General" : "",
    sponsor.is_one_time_donor ? "One-time" : ""
  ].filter(Boolean);
}

function getSponsorPhotoUrl(sponsor: Sponsor) {
  return sponsor.current_picture_url || sponsor.picture_url || sponsor.photo_url || sponsor.thumbnail_url || "";
}

function totalRelated(payments: SponsorPayments | null) {
  const childTotal = payments?.child_payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0;
  const staffTotal = payments?.staff_payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0;
  const sponsorTotal = payments?.sponsor_payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0;
  return childTotal + staffTotal + sponsorTotal;
}

function RelatedPaymentCard({ payment }: { payment: SponsorRelatedPayment | Payment }) {
  const beneficiary = "child_name" in payment && payment.child_name ? payment.child_name : "staff_name" in payment && payment.staff_name ? payment.staff_name : "General support";
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.cardTitle}>{beneficiary}</Text>
        {"is_valid" in payment && payment.is_valid !== undefined ? <StatusBadge tone={payment.is_valid ? "success" : "warning"} text={payment.is_valid ? "Valid" : "Pending"} /> : null}
      </View>
      <AmountRow label={formatDate(payment.payment_date)} value={formatCurrency(payment.amount)} tone="success" />
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

  const load = useCallback(async () => {
    if (!Number.isFinite(sponsorId)) {
      setError("Sponsor details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nextSponsor = await getSponsor(sponsorId);
      setSponsor(nextSponsor);
      try {
        setPayments(await getSponsorPayments(sponsorId));
      } catch {
        setPayments(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load sponsor details."));
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !sponsor) return <LoadingState />;

  const types = sponsor ? sponsorTypes(sponsor) : [];
  const recentPayments = [
    ...(payments?.child_payments ?? []).map((payment) => ({ kind: "child", payment })),
    ...(payments?.staff_payments ?? []).map((payment) => ({ kind: "staff", payment })),
    ...(payments?.sponsor_payments ?? []).map((payment) => ({ kind: "sponsor", payment }))
  ].slice(0, 5);
  const photoUrl = sponsor ? getSponsorPhotoUrl(sponsor) : "";

  return (
    <Screen title="Sponsor Details">
      <ResourceError message={error} />
      {sponsor ? (
        <>
          <View style={styles.profileCard}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="heart" color={colors.primaryDark} size={30} />
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{sponsorTitle(sponsor)}</Text>
              <Text style={styles.muted}>{joinMeta([sponsor.prefixed_id, sponsor.email || "No email", sponsor.mobile_telephone])}</Text>
              <View style={styles.badges}>
                <StatusBadge tone={sponsor.is_departed ? "danger" : "success"} text={sponsor.is_departed ? "Departed" : "Active"} />
                <StatusBadge tone="info" text={types[0] || sponsor.sponsorship_type || "Sponsor"} />
              </View>
            </View>
          </View>

          <FeatureCard
            accent="#db2777"
            icon="heart"
            subtitle="Giving categories and recent payment activity."
            title="Sponsorship"
            value={formatCurrency(totalRelated(payments))}
            meta={types.length ? types.join(" - ") : sponsor.sponsorship_type || "Sponsor"}
          />

          <SectionHeader title="Recent payments" subtitle="Latest related child, staff, and general sponsor payments." />
          {recentPayments.length ? recentPayments.map(({ kind, payment }, index) => <RelatedPaymentCard key={`${kind}-${payment.id}-${payment.payment_date}-${index}`} payment={payment} />) : <EmptyState text="No recent payments are available for this sponsor." />}
        </>
      ) : (
        <EmptyState text="Sponsor details are unavailable." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 36, height: 72, width: 72 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "900" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  profileCopy: { flex: 1 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
