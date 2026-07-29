import { useState, useEffect, useMemo } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnDef, RowSelectionState, SortingState, Column } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Inbox, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Canonical Column Header ────────────────────────────────────────────────
// Re-usable header component with standardized styling and optional sort toggle.
// Usage: header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();

  if (!canSort) {
    return (
      <span
        className={cn("text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider", className)}
      >
        {title}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none",
        className,
      )}
    >
      {title}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DataTableFilter {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export interface DataTableBulkAction<TData> {
  label: string;
  onClick: (selectedRows: TData[]) => void;
  variant?: "default" | "destructive" | "outline";
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showingText?: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  noDataMessage?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (selectedRows: TData[]) => void;
  bulkActions?: DataTableBulkAction<TData>[];
  pagination?: DataTablePagination;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: DataTableFilter[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  noDataMessage = "No results.",
  onRowClick,
  className,
  enableRowSelection = false,
  onSelectedRowsChange,
  bulkActions,
  pagination,
  search,
  filters,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const finalColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Clear selection if data changes (e.g. after paginating or reloading)
  useEffect(() => {
    setRowSelection({});
  }, [data]);

  useEffect(() => {
    if (onSelectedRowsChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
      onSelectedRowsChange(selectedRows);
    }
  }, [rowSelection, table, onSelectedRowsChange]);

  const hasSelectedRows = Object.keys(rowSelection).length > 0;

  // Compute default showing text
  const defaultShowingText = pagination
    ? `Showing ${pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.totalItems)} of ${pagination.totalItems}`
    : "";

  return (
    <div className={cn("space-y-3", className)}>
      {/* 1. Search & Dropdown Filters Bar */}
      {(search || (filters && filters.length > 0)) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {search && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                id={`${search.placeholder?.replace(/\s+/g, "-").toLowerCase() || "search"}-input`}
                type="text"
                placeholder={search.placeholder || "Search..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="w-full pl-8 pr-3 h-8.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-all"
              />
            </div>
          )}
          {filters &&
            filters.map((filter) => (
              <select
                key={filter.id}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-2.5 h-8.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs focus:outline-none focus:border-zinc-400 cursor-pointer text-zinc-900 dark:text-zinc-100 font-medium"
              >
                {filter.placeholder && <option value="">{filter.placeholder}</option>}
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
        </div>
      )}

      {/* 2. Selection Bulk Action Bar */}
      {enableRowSelection && bulkActions && hasSelectedRows && (
        <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-sm flex items-center justify-between animate-fade-in">
          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {Object.keys(rowSelection).length} selected
          </span>
          <div className="flex gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
                  action.onClick(selectedRows);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  action.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : action.variant === "outline"
                      ? "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-805 text-zinc-700 dark:text-zinc-300"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Data Table */}
      <div className="rounded-sm border overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {finalColumns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={finalColumns.length} className="p-0">
                  <Empty className="border-none py-12 bg-transparent">
                    <EmptyMedia variant="icon" className="bg-surface-container-high text-on-surface-variant">
                      <Inbox className="h-4 w-4" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-on-surface text-body-md font-semibold">{noDataMessage}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Footer Pagination controls */}
        {pagination && (
          <div className="flex items-center justify-between pt-2.5 pb-2.5 px-3.5 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/10">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 font-mono">
              {pagination.showingText || defaultShowingText}
            </span>
            <div className="flex items-center gap-2">
              {pagination.onLimitChange && (
                <select
                  value={pagination.limit}
                  onChange={(e) => pagination.onLimitChange?.(Number(e.target.value))}
                  className="px-2 h-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm text-[10px] focus:outline-none cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  disabled={pagination.page <= 1}
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
