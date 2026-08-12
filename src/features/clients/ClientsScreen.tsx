import { RowCard } from "@/components/Card";
import { LoadingState, Screen } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, joinMeta } from "@/utils/format";
import { useClients } from "./useClients";

export function ClientsScreen() {
  const { error, items, loading, search, setSearch } = useClients();
  if (loading && !items.length) return <LoadingState />;
  return (
    <Screen title="Clients">
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search clients" />
      <ResourceError message={error} />
      {items.length ? items.map((item) => (
        <RowCard key={item.id} title={item.full_name} subtitle={joinMeta([item.reg_number || item.prefixed_id, item.email || "No email"])} meta={joinMeta([`Loans ${item.active_loans_count || 0}`, `Savings ${formatCurrency(item.savings_balance)}`])} />
      )) : <ResourceEmpty text="No clients found." />}
    </Screen>
  );
}
