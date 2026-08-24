import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Client } from "@/types";
import { formatCurrency, joinMeta } from "@/utils/format";
import { useClients } from "./useClients";

const clientViews = [
  { label: "All clients", value: "all" },
  { label: "Active loans", value: "active_loans" },
  { label: "Has savings", value: "has_savings" }
] as const;

function photoUrl(client: Client) {
  return client.thumbnail_url || client.current_picture_url || client.picture_url || client.photo_url || "";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";
}

function openClient(client: Client) {
  const url = photoUrl(client);
  if (url) void Image.prefetch(url);
  router.push(`/(tabs)/clients/${client.id}`);
}

function ClientCard({ client }: { client: Client }) {
  const url = photoUrl(client);
  return (
    <Pressable accessibilityRole="button" onPress={() => openClient(client)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          {url ? <Image fadeDuration={120} source={{ uri: url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials(client.full_name)}</Text>}
        </View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.clientName}>{client.full_name}</Text>
          <Text numberOfLines={1} style={styles.clientId}>{client.reg_number || client.prefixed_id || `Client #${client.id}`}</Text>
        </View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Ionicons color={colors.primaryDark} name="wallet-outline" size={17} />
          <View><Text style={styles.metricLabel}>Savings</Text><Text numberOfLines={1} style={styles.metricValue}>{formatCurrency(client.savings_balance)}</Text></View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Ionicons color={client.active_loans_count ? colors.warning : colors.muted} name="document-text-outline" size={17} />
          <View><Text style={styles.metricLabel}>Active loans</Text><Text style={styles.metricValue}>{client.active_loans_count || 0}</Text></View>
        </View>
      </View>
      {client.mobile_telephone || client.email ? <Text numberOfLines={1} style={styles.contact}>{joinMeta([client.mobile_telephone, client.email])}</Text> : null}
    </Pressable>
  );
}

export function ClientsScreen() {
  const [selectedView, setSelectedView] = useState("all");
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useClients(selectedView);
  if (loading && !items.length) return <LoadingState />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ClientCard client={item} />}
      ListHeaderComponent={(
        <>
          <View style={styles.headingRow}>
            <View><Text style={styles.title}>Clients</Text><Text style={styles.headingSubtitle}>Find and manage client records</Text></View>
            <View style={styles.countBadge}><Text style={styles.countValue}>{count}</Text><Text style={styles.countLabel}>records</Text></View>
          </View>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Search by name, ID or email" />
          <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
            {clientViews.map((view) => {
              const active = selectedView === view.value;
              return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={view.value} onPress={() => setSelectedView(view.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{view.label}</Text></Pressable>;
            })}
          </ScrollView>
          <ResourceError message={error} />
        </>
      )}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No clients match your search and selected view." : selectedView === "all" ? "No clients found." : "No clients are available in this view."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching clients are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more clients..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
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
  avatar: { alignItems: "center", backgroundColor: "#dff7f3", borderRadius: 24, height: 48, justifyContent: "center", overflow: "hidden", width: 48 },
  avatarImage: { height: "100%", width: "100%" },
  avatarText: { color: colors.primaryDark, fontSize: 15, fontWeight: "900" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden", padding: spacing.md },
  clientId: { color: colors.muted, fontSize: 12, marginTop: 3 },
  clientName: { color: colors.text, fontSize: 16, fontWeight: "900" },
  contact: { borderTopColor: colors.border, borderTopWidth: 1, color: colors.muted, fontSize: 12, marginTop: spacing.md, paddingTop: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: 36 },
  countBadge: { alignItems: "center", backgroundColor: "#dff7f3", borderRadius: radius.md, minWidth: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countLabel: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  countValue: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  headingSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  metric: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 },
  metricDivider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 2 },
  metricsRow: { backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, padding: spacing.sm },
  pressed: { opacity: 0.76, transform: [{ scale: 0.995 }] },
  root: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" }
});
