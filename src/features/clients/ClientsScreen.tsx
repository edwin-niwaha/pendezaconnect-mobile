import { RowCard } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, joinMeta } from "@/utils/format";
import { router } from "expo-router";
import { FlatList, StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/constants/theme";
import { useClients } from "./useClients";

export function ClientsScreen() {
  const { error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useClients();
  if (loading && !items.length) return <LoadingState />;
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <RowCard onPress={() => router.push(`/(tabs)/clients/${item.id}`)} title={item.full_name} subtitle={joinMeta([item.reg_number || item.prefixed_id, item.email || "No email"])} meta={joinMeta([`Loans ${item.active_loans_count || 0}`, `Savings ${formatCurrency(item.savings_balance)}`])} />
      )}
      ListHeaderComponent={(
        <>
          <Text style={styles.title}>Clients</Text>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Search clients" />
          <ResourceError message={error} />
        </>
      )}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No clients match your search." : "No clients found."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching clients are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more clients..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
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
  root: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 36 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg }
});
