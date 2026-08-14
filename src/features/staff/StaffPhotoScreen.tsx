import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
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

export function StaffPhotoScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const scope = typeof params.scope === "string" ? params.scope : "";
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useStaff(scope);
  const [busyStaffId, setBusyStaffId] = useState<number | null>(null);
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Photo library permission is required to choose a staff photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) await savePhoto(staff, result.assets[0]);
  }

  async function savePhoto(staff: Staff, asset: ImagePicker.ImagePickerAsset) {
    setBusyStaffId(staff.id);
    try {
      await uploadStaffPhoto(staff.id, asset);
      setPhotoMessage(`Updated ${staff.full_name}'s photo.`);
      await refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not upload this staff photo."));
    } finally {
      setBusyStaffId(null);
    }
  }

  function confirmDelete(staff: Staff) {
    Alert.alert("Delete photo", `Remove ${staff.full_name}'s staff photo?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => void removePhoto(staff), style: "destructive", text: "Delete" }
    ]);
  }

  async function removePhoto(staff: Staff) {
    setPhotoError("");
    setPhotoMessage("");
    setBusyStaffId(staff.id);
    try {
      await deleteStaffPhoto(staff.id);
      setPhotoMessage(`Removed ${staff.full_name}'s photo.`);
      await refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not delete this staff photo."));
    } finally {
      setBusyStaffId(null);
    }
  }

  function renderHeader() {
    return (
      <>
        <Text style={styles.title}>{scopeTitle(scope)}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="briefcase" color="white" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Staff photo management</Text>
            <Text style={styles.summaryText}>Add, update, or delete photos for authorized staff records.</Text>
          </View>
        </View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search staff" />
        <ResourceError message={error || photoError} />
        {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
        {scope ? <Text style={styles.resultCount}>Filtered view: {scopeTitle(scope)}</Text> : <Text style={styles.resultCount}>{count || items.length} staff records</Text>}
      </>
    );
  }

  function renderStaff({ item }: { item: Staff }) {
    const photoUrl = getStaffPhotoUrl(item);
    const busy = busyStaffId === item.id;
    return (
      <Pressable onPress={() => router.push(`/(tabs)/staff/${item.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" color={colors.primaryDark} size={24} />
          </View>
        )}
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.full_name}</Text>
          <Text style={styles.staffMeta}>{joinMeta([item.prefixed_id, item.email || "No email", item.job_title || "Staff"])}</Text>
          <View style={styles.actions}>
            <Pressable disabled={busy} onPress={() => chooseFromCamera(item)} style={styles.actionButton}>
              <Ionicons name="camera-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.actionText}>Camera</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => chooseFromLibrary(item)} style={styles.actionButton}>
              <Ionicons name="images-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.actionText}>Gallery</Text>
            </Pressable>
            {photoUrl ? (
              <Pressable disabled={busy} onPress={() => confirmDelete(item)} style={styles.deleteButton}>
                {busy ? <ActivityIndicator color={colors.danger} size="small" /> : <Ionicons name="trash-outline" color={colors.danger} size={18} />}
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
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
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      onRefresh={refresh}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  actionButton: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionText: { color: colors.primaryDark, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  avatar: { borderRadius: 34, height: 68, width: 68 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  deleteButton: { alignItems: "center", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 38, width: 42 },
  resultCount: { color: colors.muted, fontSize: 12, fontWeight: "800", marginBottom: spacing.md, textTransform: "uppercase" },
  pressed: { opacity: 0.78 },
  root: { backgroundColor: colors.background, flex: 1 },
  staffInfo: { flex: 1 },
  staffMeta: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  staffName: { color: colors.text, fontSize: 17, fontWeight: "900" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  summary: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  summaryCopy: { flex: 1 },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  summaryText: { color: "#ccfbf1", lineHeight: 20, marginTop: spacing.xs },
  summaryTitle: { color: "white", fontSize: 17, fontWeight: "900" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg }
});
