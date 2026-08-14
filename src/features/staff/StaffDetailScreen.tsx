import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getStaff } from "@/api/staff";
import { FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Staff } from "@/types";
import { joinMeta } from "@/utils/format";

function getStaffPhotoUrl(staff: Staff) {
  return staff.current_picture_url || staff.picture_url || staff.photo_url || staff.thumbnail_url || "";
}

export function StaffDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const staffId = Number(params.id);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(staffId)) {
      setError("Staff details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      setStaff(await getStaff(staffId));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load staff details."));
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !staff) return <LoadingState />;

  const photoUrl = staff ? getStaffPhotoUrl(staff) : "";

  return (
    <Screen title="Staff Details">
      <ResourceError message={error} />
      {staff ? (
        <>
          <View style={styles.profileCard}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="briefcase" color={colors.primaryDark} size={30} />
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{staff.full_name}</Text>
              <Text style={styles.muted}>{joinMeta([staff.prefixed_id, staff.email || "No email", staff.mobile_telephone])}</Text>
              <View style={styles.badges}>
                <StatusBadge tone={staff.is_departed ? "danger" : "success"} text={staff.is_departed ? "Departed" : "Active"} />
                {staff.is_sponsored !== undefined ? <StatusBadge tone={staff.is_sponsored ? "info" : "neutral"} text={staff.is_sponsored ? "Sponsored" : "Not sponsored"} /> : null}
              </View>
            </View>
          </View>

          <FeatureCard
            accent="#7c3aed"
            icon="briefcase"
            subtitle="Staff profile information from authorized operational records."
            title={staff.job_title || "Staff member"}
            meta={joinMeta([staff.prefixed_id, staff.email || null])}
          />

          <SectionHeader title="Contact" subtitle="Current staff contact details." />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Email</Text>
            <Text style={styles.muted}>{staff.email || "No email recorded"}</Text>
            <Text style={styles.cardTitle}>Phone</Text>
            <Text style={styles.muted}>{staff.mobile_telephone || "No phone recorded"}</Text>
          </View>
        </>
      ) : (
        <EmptyState text="Staff details are unavailable." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 36, height: 72, width: 72 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  profileCopy: { flex: 1 }
});
