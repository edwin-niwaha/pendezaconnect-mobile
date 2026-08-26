import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolveResourceUrl } from "@/api/client";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Staff } from "@/types";
import { joinMeta } from "@/utils/format";
import { useStaff } from "./useStaff";

const staffViews = [
  { label: "All active", value: "" },
  { label: "Sponsored", value: "sponsored" },
  { label: "Non-sponsored", value: "non-sponsored" },
  { label: "Departed", value: "departed" }
] as const;

function staffPhoto(staff: Staff) {
  return resolveResourceUrl(staff.current_picture_url || staff.picture_url || staff.photo_url || staff.thumbnail_url);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

const StaffCard = memo(function StaffCard({ staff }: { staff: Staff }) {
  const photo = staffPhoto(staff);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [photo]);
  const status = staff.is_departed ? "Departed" : staff.is_sponsored ? "Sponsored" : "Active";
  const statusColor = staff.is_departed ? colors.danger : staff.is_sponsored ? "#be185d" : colors.success;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/(tabs)/staff/${staff.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardAccent} />
      <View style={styles.identityRow}>
        <View style={styles.avatar}>{photo && !imageFailed ? <Image fadeDuration={160} onError={() => setImageFailed(true)} resizeMode="cover" source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.initials}>{initials(staff.full_name)}</Text>}</View>
        <View style={styles.identityCopy}><Text numberOfLines={1} style={styles.name}>{staff.full_name}</Text><Text numberOfLines={1} style={styles.identifier}>{staff.prefixed_id || `Staff #${staff.id}`}</Text></View>
        <View style={[styles.status, { backgroundColor: `${statusColor}14` }]}><Text style={[styles.statusText, { color: statusColor }]}>{status}</Text></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={19} />
      </View>
      <View style={styles.dataGrid}>
        <View style={styles.dataItem}><Ionicons color={colors.primaryDark} name="briefcase-outline" size={16} /><View style={styles.dataCopy}><Text style={styles.dataLabel}>Position</Text><Text numberOfLines={1} style={styles.dataValue}>{staff.job_title || "Staff member"}</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.dataItem}><Ionicons color={colors.primaryDark} name="business-outline" size={16} /><View style={styles.dataCopy}><Text style={styles.dataLabel}>Department</Text><Text numberOfLines={1} style={styles.dataValue}>{staff.department || "Not recorded"}</Text></View></View>
      </View>
      {(staff.mobile_telephone || staff.email) ? <View style={styles.contactRow}><Ionicons color={colors.muted} name={staff.mobile_telephone ? "call-outline" : "mail-outline"} size={14} /><Text numberOfLines={1} style={styles.contact}>{joinMeta([staff.mobile_telephone, staff.email])}</Text></View> : null}
    </Pressable>
  );
});

function renderStaff({ item }: { item: Staff }) {
  return <StaffCard staff={item} />;
}

export function StaffDirectoryScreen() {
  const [scope, setScope] = useState("");
  const hasFocused = useRef(false);
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useStaff(scope);
  useFocusEffect(useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }
    void refresh();
  }, [refresh]));
  if (loading && !items.length) return <LoadingState />;

  return <FlatList
    data={items}
    keyExtractor={(item) => String(item.id)}
    renderItem={renderStaff}
    ListHeaderComponent={<>
      <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={styles.title}>Staff</Text><Text style={styles.subtitle}>Team directory and workforce records</Text></View><View style={styles.countBadge}><Text style={styles.countValue}>{count}</Text><Text style={styles.countLabel}>records</Text></View></View>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search staff by name, ID or role" />
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/staff-photos")} style={styles.photoLink}><Ionicons color={colors.primaryDark} name="camera-outline" size={19} /><View style={styles.photoLinkCopy}><Text style={styles.photoLinkTitle}>Manage staff photos</Text><Text style={styles.photoLinkText}>Capture, upload, or remove profile pictures</Text></View><Ionicons color={colors.primaryDark} name="arrow-forward" size={18} /></Pressable>
      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>{staffViews.map((view) => { const active = scope === view.value; return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={view.value || "all"} onPress={() => setScope(view.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{view.label}</Text></Pressable>; })}</ScrollView>
      <ResourceError message={error} />
    </>}
    ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No staff match your search." : "No staff records found."} /> : null}
    ListFooterComponent={<PaginatedListFooter endText="All matching staff are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more staff..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
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
  />;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#b9eee6", borderRadius: 29, borderWidth: 2, height: 58, justifyContent: "center", overflow: "hidden", width: 58 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden", padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.04, shadowRadius: 10 },
  cardAccent: { backgroundColor: colors.primary, height: 3, left: 0, position: "absolute", right: 0, top: 0 },
  contact: { color: colors.muted, flex: 1, fontSize: 12 },
  contactRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: 36 },
  countBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, minWidth: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countLabel: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  countValue: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  dataCopy: { flex: 1, minWidth: 0 },
  dataGrid: { backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, padding: spacing.sm },
  dataItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 },
  dataLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  dataValue: { color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 2 },
  divider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
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
