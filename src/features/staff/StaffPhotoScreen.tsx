import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { canChooseFromPhotoLibrary } from "@/features/shared/photoLibraryPermission";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { deleteStaffPhoto, uploadStaffPhoto } from "@/api/staff";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Staff } from "@/types";
import { joinMeta } from "@/utils/format";
import { router, useLocalSearchParams } from "expo-router";
import { useStaff } from "./useStaff";

function getStaffPhotoUrl(staff: Staff) {
  return staff.thumbnail_url || staff.current_picture_url || staff.picture_url || staff.photo_url || "";
}

function matchesScope(staff: Staff, scope: string) {
  if (scope === "sponsored") return staff.is_sponsored !== false;
  if (scope === "non-sponsored") return staff.is_sponsored === false;
  if (scope === "departed") return staff.is_departed === true;
  return true;
}

function scopeTitle(scope: string) {
  if (scope === "sponsored") return "Sponsored Staff";
  if (scope === "non-sponsored") return "Non-sponsored Staff";
  if (scope === "departed") return "Departed Staff";
  return "Staff";
}

const staffScopes = [
  { label: "All active", value: "" },
  { label: "Sponsored", value: "sponsored" },
  { label: "Non-sponsored", value: "non-sponsored" },
  { label: "Departed", value: "departed" }
] as const;

export function StaffPhotoScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const initialScope = typeof params.scope === "string" ? params.scope : "";
  const [scope, setScope] = useState(initialScope);
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useStaff(scope);
  const [busyStaffId, setBusyStaffId] = useState<number | null>(null);
  const [busyOperation, setBusyOperation] = useState<"remove" | "upload" | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const visibleItems = useMemo(() => items.filter((item) => matchesScope(item, scope)), [items, scope]);

  if (loading && !items.length) return <LoadingState />;

  async function chooseFromCamera(staff: Staff) {
    setPhotoError("");
    setPhotoMessage("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Camera permission is required to take a staff photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) await savePhoto(staff, result.assets[0]);
  }

  async function chooseFromLibrary(staff: Staff) {
    setPhotoError("");
    setPhotoMessage("");
    if (!await canChooseFromPhotoLibrary()) {
      setPhotoError("Photo library permission is required to choose a staff photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) await savePhoto(staff, result.assets[0]);
  }

  async function savePhoto(staff: Staff, asset: ImagePicker.ImagePickerAsset) {
    setBusyStaffId(staff.id);
    setBusyOperation("upload");
    try {
      await uploadStaffPhoto(staff.id, asset);
      setPhotoMessage(`Updated ${staff.full_name}'s photo.`);
      await refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not upload this staff photo."));
    } finally {
      setBusyStaffId(null);
      setBusyOperation(null);
    }
  }

  function confirmDelete(staff: Staff) {
    Alert.alert("Remove staff photo", `Remove ${staff.full_name}'s staff photo? The staff record will not be deleted.`, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => void removePhoto(staff), style: "destructive", text: "Remove photo" }
    ]);
  }

  async function removePhoto(staff: Staff) {
    setPhotoError("");
    setPhotoMessage("");
    setBusyStaffId(staff.id);
    setBusyOperation("remove");
    try {
      await deleteStaffPhoto(staff.id);
      setPhotoMessage(`Removed ${staff.full_name}'s photo.`);
      await refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not delete this staff photo."));
    } finally {
      setBusyStaffId(null);
      setBusyOperation(null);
    }
  }

  function renderHeader() {
    return (
      <>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}><Text style={styles.title}>Staff</Text><Text style={styles.headingSubtitle}>Team directory and staff records</Text></View>
          <View style={styles.countBadge}><Text style={styles.countValue}>{count}</Text><Text style={styles.countLabel}>records</Text></View>
        </View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search staff" />
        <View style={styles.filterHeading}><Text style={styles.filterLabel}>Staff view</Text><Text style={styles.filterCount}>{scopeTitle(scope)}</Text></View>
        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {staffScopes.map((item) => {
            const active = scope === item.value;
            return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.value || "all"} onPress={() => setScope(item.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>;
          })}
        </ScrollView>
        <ResourceError message={error || photoError} />
        {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
      </>
    );
  }

  function renderStaff({ item }: { item: Staff }) {
    const photoUrl = getStaffPhotoUrl(item);
    const busy = busyStaffId === item.id;
    const removing = busy && busyOperation === "remove";
    function openDetails() {
      if (photoUrl) void Image.prefetch(photoUrl);
      router.push(`/(tabs)/staff/${item.id}`);
    }
    return (
      <View style={styles.card}>
        <Pressable accessibilityLabel={`Open ${item.full_name}'s staff details`} accessibilityRole="button" onPress={openDetails} style={({ pressed }) => [styles.staffHeader, pressed && styles.pressed]}>
          {photoUrl ? (
            <Image fadeDuration={180} source={{ cache: "force-cache", uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" color={colors.primaryDark} size={24} />
            </View>
          )}
          <View style={styles.staffInfo}>
            <View style={styles.nameRow}><Text numberOfLines={1} style={styles.staffName}>{item.full_name}</Text>{busy ? <ActivityIndicator color={colors.primaryDark} size="small" /> : null}</View>
            <Text numberOfLines={1} style={styles.staffRole}>{item.job_title || "Staff member"}</Text>
            <Text numberOfLines={1} style={styles.staffMeta}>{joinMeta([item.prefixed_id, item.department])}</Text>
            <View style={[styles.statusPill, item.is_departed ? styles.statusDeparted : item.is_sponsored ? styles.statusSponsored : styles.statusStandard]}><Text style={[styles.statusText, item.is_departed ? styles.statusTextDeparted : item.is_sponsored ? styles.statusTextSponsored : null]}>{item.is_departed ? "Departed" : item.is_sponsored ? "Sponsored" : "Active"}</Text></View>
          </View>
          <View style={styles.chevron}><Ionicons name="chevron-forward" color={colors.muted} size={17} /></View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable accessibilityLabel={`Take a photo for ${item.full_name}`} accessibilityRole="button" disabled={busy} onPress={() => chooseFromCamera(item)} style={styles.actionButton}>
            <Ionicons name="camera-outline" color={colors.primaryDark} size={17} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.actionText}>Camera</Text>
          </Pressable>
          <Pressable accessibilityLabel={`Choose a photo for ${item.full_name}`} accessibilityRole="button" disabled={busy} onPress={() => chooseFromLibrary(item)} style={styles.actionButton}>
            <Ionicons name="images-outline" color={colors.primaryDark} size={17} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.actionText}>Gallery</Text>
          </Pressable>
          {photoUrl ? (
            <Pressable accessibilityLabel={`Remove ${item.full_name}'s staff photo`} accessibilityRole="button" disabled={busy} onPress={() => confirmDelete(item)} style={styles.deleteButton}>
              {removing ? <ActivityIndicator color={colors.danger} size="small" /> : <Ionicons name="trash-outline" color={colors.danger} size={17} />}
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.deleteText}>{removing ? "Removing..." : "Remove photo"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderStaff}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No staff match your search." : "No staff records available for your account."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching staff are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more staff..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
      contentContainerStyle={styles.content}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      removeClippedSubviews
      onRefresh={refresh}
      style={styles.root}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  actionButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexBasis: "30%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: "center", minHeight: 40, minWidth: 0, paddingHorizontal: spacing.xs },
  actionText: { color: colors.primaryDark, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  actions: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  avatar: { borderRadius: 30, height: 60, width: 60 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden", shadowColor: "#0f172a", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.05, shadowRadius: 10 },
  chevron: { alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  content: { padding: spacing.lg, paddingBottom: 36 },
  countBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, minWidth: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countLabel: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  countValue: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterCount: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  filterHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  filterLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  headingCopy: { flex: 1 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg },
  headingSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  deleteButton: { alignItems: "center", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, flexBasis: "30%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: "center", minHeight: 40, minWidth: 0, paddingHorizontal: spacing.xs },
  deleteText: { color: colors.danger, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  nameRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  pressed: { opacity: 0.78 },
  root: { backgroundColor: colors.background, flex: 1 },
  staffHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.md },
  staffInfo: { flex: 1 },
  staffMeta: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 2 },
  staffName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "900" },
  staffRole: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.xs },
  statusDeparted: { backgroundColor: "#fef2f2" },
  statusPill: { alignSelf: "flex-start", borderRadius: 999, marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusSponsored: { backgroundColor: "#fdf2f8" },
  statusStandard: { backgroundColor: "#ecfdf5" },
  statusText: { color: colors.success, fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  statusTextDeparted: { color: colors.danger },
  statusTextSponsored: { color: "#be185d" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" }
});
