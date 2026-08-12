import { RowCard } from "@/components/Card";
import { LoadingState, Screen } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { joinMeta } from "@/utils/format";
import { useStaff } from "./useStaff";

export function StaffScreen() {
  const { error, items, loading, search, setSearch } = useStaff();
  if (loading && !items.length) return <LoadingState />;
  return (
    <Screen title="Staff">
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search staff" />
      <ResourceError message={error} />
      {items.length ? items.map((item) => (
        <RowCard key={item.id} title={item.full_name} subtitle={joinMeta([item.prefixed_id, item.email || "No email"])} meta={item.job_title || "Staff"} />
      )) : <ResourceEmpty text="No staff records available for your account." />}
    </Screen>
  );
}
