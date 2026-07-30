import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";

// Shared table→card-list responsive pattern for table-heavy pages: renders
// the existing <Table> (desktop/tablet-landscape, ≥1024px, via Table's own
// `hidden lg:block`) alongside a card-per-item list for mobile/tablet
// portrait (<1024px). Mirrors how components/sidebar.tsx already splits
// desktop/mobile chrome, applied here to data instead of navigation.
export function ResponsiveDataList<T>({
  items,
  renderRow,
  renderCard,
  tableHead,
  getKey,
}: {
  items: T[];
  renderRow: (item: T) => ReactNode;
  renderCard: (item: T) => ReactNode;
  tableHead: ReactNode;
  getKey: (item: T) => string;
}) {
  return (
    <>
      <Table>
        <thead>{tableHead}</thead>
        <tbody>{items.map(renderRow)}</tbody>
      </Table>

      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => (
          <div key={getKey(item)}>{renderCard(item)}</div>
        ))}
      </div>
    </>
  );
}
