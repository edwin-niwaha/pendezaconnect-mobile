import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getChild } from "@/api/children";
import { SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Child } from "@/types";
import { formatDate, joinMeta } from "@/utils/format";

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.infoTile}><Ionicons color={colors.primaryDark} name={icon} size={18} /><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={2} style={styles.infoValue}>{value}</Text></View>;
}

export function ChildDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const childId = Number(params.id);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(childId)) {
      setError("Child details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      setChild(await getChild(childId));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load child details."));
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !child) return <LoadingState />;

  return (
    <Screen title="Child Details">
      <ResourceError message={error} />
      {child ? (
        <>
          <View style={styles.profileCard}>
            {child.current_picture_url ? (
              <Image source={{ uri: child.current_picture_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" color={colors.primaryDark} size={30} />
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{child.full_name}</Text>
              <Text style={styles.muted}>{joinMeta([child.prefixed_id, child.preferred_name ? `Prefers ${child.preferred_name}` : null, child.gender])}</Text>
              <View style={styles.badges}>
                <StatusBadge tone={child.is_departed ? "danger" : "success"} text={child.is_departed ? "Departed" : "Active"} />
                <StatusBadge tone={child.is_sponsored ? "info" : "warning"} text={child.is_sponsored ? "Sponsored" : "Needs sponsor"} />
              </View>
            </View>
          </View>

          <SectionHeader title="Child information" />
          <View style={styles.infoGrid}>
            <InfoTile icon="calendar-outline" label="Date of birth" value={child.date_of_birth ? formatDate(child.date_of_birth) : "Not recorded"} />
            <InfoTile icon="school-outline" label="Education" value={child.is_child_in_school ? "Attending school" : "Not in school"} />
            <InfoTile icon="location-outline" label="District" value={child.district || "Not recorded"} />
            <InfoTile icon="home-outline" label="Residence" value={child.residence || "Not recorded"} />
            <InfoTile icon="sparkles-outline" label="Aspiration" value={child.aspiration || "Not recorded"} />
            <InfoTile icon="fitness-outline" label="Health" value={child.health_status || "Not recorded"} />
          </View>

          <SectionHeader title="Guardian" />
          <View style={styles.guardianCard}>
            <View style={styles.guardianIcon}><Ionicons color={colors.primaryDark} name="people-outline" size={22} /></View>
            <View style={styles.guardianCopy}><Text style={styles.guardianName}>{child.guardian || "No guardian recorded"}</Text><Text style={styles.muted}>{child.relationship_with_guardian || "Relationship not recorded"}</Text></View>
            {child.guardian_contact ? <Pressable accessibilityLabel="Call guardian" onPress={() => void Linking.openURL(`tel:${child.guardian_contact}`)} style={styles.callButton}><Ionicons color="white" name="call" size={18} /></Pressable> : null}
          </View>

          {child.c_interest ? <><SectionHeader title="Interests and abilities" /><View style={styles.noteCard}><Text style={styles.noteText}>{child.c_interest}</Text></View></> : null}
        </>
      ) : (
        <EmptyState text="Child details are unavailable." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 36, height: 72, width: 72 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  callButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  guardianCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.md },
  guardianCopy: { flex: 1 },
  guardianIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  guardianName: { color: colors.text, fontSize: 15, fontWeight: "900" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  infoTile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexGrow: 1, minWidth: 130, padding: spacing.md },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "900", lineHeight: 18, marginTop: 3 },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  noteCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  noteText: { color: colors.text, lineHeight: 21 },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  profileCopy: { flex: 1 }
});
