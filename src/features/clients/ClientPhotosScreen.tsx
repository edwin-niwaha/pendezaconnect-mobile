import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Client } from "@/types";
import { joinMeta } from "@/utils/format";
import { useClients } from "./useClients";

function getClientPhotoUrl(client: Client) {
  return client.thumbnail_url || client.current_picture_url || client.picture_url || client.photo_url || "";
}

function getClientFullPhotoUrl(client: Client) {
  return client.current_picture_url || client.picture_url || client.photo_url || client.thumbnail_url || "";
}

export function ClientPhotosScreen() {
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useClients();
  const [viewer, setViewer] = useState<Client | null>(null);
  if (loading && !items.length) return <LoadingState />;

  const photos = items.filter(getClientPhotoUrl);

  function renderHeader() {
    return (
      <>
        <Text style={styles.title}>Client Photos</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="people" color="white" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Authorized client gallery</Text>
            <Text style={styles.summaryText}>Total accessible clients: {count || items.length}.</Text>
          </View>
        </View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search clients" />
        <ResourceError message={error} />
      </>
    );
  }  

  function renderClient({ item }: { item: Client }) {
    const imageUrl = getClientPhotoUrl(item);
    return (
      <View style={styles.tile}>
        <Pressable disabled={!imageUrl} onPress={() => setViewer(item)} style={styles.photoButton}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="person" color={colors.primaryDark} size={24} />
            </View>
          )}
        </Pressable>
        <Text numberOfLines={1} style={styles.clientName}>{item.full_name}</Text>
        <Text numberOfLines={1} style={styles.clientMeta}>{joinMeta([item.reg_number || item.prefixed_id, item.email || "No email"])}</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={renderClient}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No clients match your search." : "No client photos available."} /> : null}
        ListFooterComponent={<PaginatedListFooter endText={photos.length ? "All matching client records are loaded." : "No client photo URLs are exposed by the current API."} error={loadMoreError} loading={loadingMore} loadingText="Loading more clients..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshing={refreshing}
        onRefresh={refresh}
        style={styles.root}
      />
      <Modal animationType="fade" visible={Boolean(viewer)} transparent onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo viewer" onPress={() => setViewer(null)} style={styles.closeButton}>
            <Ionicons name="close" color="white" size={24} />
          </Pressable>
          {viewer ? <Image resizeMode="contain" source={{ uri: getClientFullPhotoUrl(viewer) }} style={styles.viewerImage} /> : null}
          <Text style={styles.viewerTitle}>{viewer?.full_name}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  clientMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  clientName: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  closeButton: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.72)", borderRadius: 22, height: 44, justifyContent: "center", position: "absolute", right: spacing.lg, top: spacing.xl, width: 44, zIndex: 2 },
  columns: { gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  photo: { aspectRatio: 1, borderRadius: radius.md, width: "100%" },
  photoButton: { aspectRatio: 1, width: "100%" },
  photoFallback: { alignItems: "center", aspectRatio: 1, backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", width: "100%" },
  root: { backgroundColor: colors.background, flex: 1 },
  summary: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  summaryCopy: { flex: 1 },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  summaryText: { color: "#ccfbf1", lineHeight: 20, marginTop: spacing.xs },
  summaryTitle: { color: "white", fontSize: 17, fontWeight: "900" },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, marginBottom: spacing.md, padding: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  viewer: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.94)", flex: 1, justifyContent: "center", padding: spacing.lg },
  viewerImage: { height: "76%", width: "100%" },
  viewerTitle: { color: "white", fontSize: 18, fontWeight: "900", marginTop: spacing.lg, textAlign: "center" }
});
