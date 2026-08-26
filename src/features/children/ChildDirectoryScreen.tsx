import { memo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolveResourceUrl } from "@/api/client";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Child } from "@/types";
import { joinMeta } from "@/utils/format";
import { useChildren } from "./useChildren";

const childViews = [
  { label: "All active", value: "" },
  { label: "Sponsored", value: "sponsored" },
  { label: "Needs sponsor", value: "non-sponsored" },
  { label: "Departed", value: "departed" }
] as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";
}

const ChildCard = memo(function ChildCard({ child }: { child: Child }) {
  const photo = resolveResourceUrl(child.current_picture_url);
  const status = child.is_departed ? "Departed" : child.is_sponsored ? "Sponsored" : "Needs sponsor";
  const statusColor = child.is_departed ? colors.danger : child.is_sponsored ? colors.success : colors.warning;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/(tabs)/children/${child.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}>{photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.initials}>{initials(child.full_name)}</Text>}</View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.name}>{child.full_name}</Text>
          <Text numberOfLines={1} style={styles.identifier}>{joinMeta([child.prefixed_id, child.preferred_name ? `Prefers ${child.preferred_name}` : ""])}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: `${statusColor}14` }]}><Text style={[styles.statusText, { color: statusColor }]}>{status}</Text></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={19} />
      </View>
      <View style={styles.dataGrid}>
        <View style={styles.dataItem}><Ionicons color={colors.primaryDark} name="location-outline" size={16} /><View style={styles.dataCopy}><Text style={styles.dataLabel}>Location</Text><Text numberOfLines={1} style={styles.dataValue}>{child.district || child.residence || "Not recorded"}</Text></View></View>
        <View style={styles.dataItem}><Ionicons color={colors.primaryDark} name="school-outline" size={16} /><View style={styles.dataCopy}><Text style={styles.dataLabel}>School</Text><Text style={styles.dataValue}>{child.is_child_in_school ? "In school" : "Not in school"}</Text></View></View>
      </View>
      <View style={styles.footerRow}><Ionicons color={colors.muted} name="people-outline" size={14} /><Text numberOfLines={1} style={styles.footerText}>{joinMeta([child.guardian || "Guardian not recorded", child.relationship_with_guardian])}</Text></View>
    </Pressable>
  );
});

function renderChild({ item }: { item: Child }) {
  return <ChildCard child={item} />;
}

export function ChildDirectoryScreen() {
  const [scope, setScope] = useState("");
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useChildren(scope);
  if (loading && !items.length) return <LoadingState />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderChild}
      ListHeaderComponent={<>
        <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={styles.title}>Children</Text><Text style={styles.subtitle}>Child profiles and programme information</Text></View><View style={styles.countBadge}><Text style={styles.countValue}>{count}</Text><Text style={styles.countLabel}>records</Text></View></View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search children by name or ID" />
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/child-photos")} style={styles.photoLink}><Ionicons color={colors.primaryDark} name="camera-outline" size={19} /><View style={styles.photoLinkCopy}><Text style={styles.photoLinkTitle}>Manage child photos</Text><Text style={styles.photoLinkText}>Capture or upload profile pictures</Text></View><Ionicons color={colors.primaryDark} name="arrow-forward" size={18} /></Pressable>
        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>{childViews.map((view) => { const active = scope === view.value; return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={view.value || "all"} onPress={() => setScope(view.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{view.label}</Text></Pressable>; })}</ScrollView>
        <ResourceError message={error} />
      </>}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No children match your search." : "No child records found."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching children are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more children..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
      contentContainerStyle={styles.content}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      onRefresh={refresh}
      refreshing={refreshing}
      removeClippedSubviews
      style={styles.root}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 28, height: 56, justifyContent: "center", overflow: "hidden", width: 56 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  countBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, minWidth: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countLabel: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  countValue: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  dataCopy: { flex: 1, minWidth: 0 },
  dataGrid: { backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, padding: spacing.sm },
  dataItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 },
  dataLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  dataValue: { color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 2 },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  footerRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm },
  footerText: { color: colors.muted, flex: 1, fontSize: 12 },
  headingCopy: { flex: 1 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg },
  identifier: { color: colors.muted, fontSize: 12, marginTop: 3 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  initials: { color: colors.primaryDark, fontSize: 15, fontWeight: "900" },
  name: { color: colors.text, fontSize: 16, fontWeight: "900" },
  photo: { height: "100%", width: "100%" },
  photoLink: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  photoLinkCopy: { flex: 1 },
  photoLinkText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  photoLinkTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.76 },
  root: { backgroundColor: colors.background, flex: 1 },
  status: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" }
});
