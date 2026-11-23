import React from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  className = "",
  emptyMessage = "No items found",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500 bg-white border border-ice-300 rounded-card">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`w-full overflow-hidden border border-ice-300 rounded-card bg-white ${className}`}
    >
      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ice-300 bg-ice-50 sticky top-0 z-10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-ink-600 uppercase tracking-wider ${
                    col.align === "right" || col.isNumeric
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ice-100">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="h-14 hover:bg-ice-100 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-ink-800 ${
                      col.align === "right" || col.isNumeric
                        ? "text-right tabular-nums font-medium"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (< 768px per U4 / U5) */}
      <div className="md:hidden divide-y divide-ice-100">
        {data.map((item) => (
          <div key={keyExtractor(item)} className="p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-center text-sm">
                <span className="text-xs font-medium text-ink-600">{col.header}</span>
                <span
                  className={`${col.isNumeric ? "tabular-nums font-semibold" : "font-medium"} text-ink-800`}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? "")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
