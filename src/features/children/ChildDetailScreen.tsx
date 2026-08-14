import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { getChild } from "@/api/children";
import { FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Child } from "@/types";
import { joinMeta } from "@/utils/format";

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

          <FeatureCard
            accent={colors.primaryDark}
            icon="camera"
            subtitle="Child profile information and current photo visibility."
            title="Profile"
            meta={joinMeta([child.district, child.residence])}
          />

          <SectionHeader title="Location" subtitle="Residence details recorded for this child." />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>District</Text>
            <Text style={styles.muted}>{child.district || "No district recorded"}</Text>
            <Text style={styles.cardTitle}>Residence</Text>
            <Text style={styles.muted}>{child.residence || "No residence recorded"}</Text>
          </View>
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
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  profileCopy: { flex: 1 }
});
