import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";

import type { ColumnDef, RowSelectionState, SortingState, Column, OnChangeFn } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Inbox, Search, X, RotateCcw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Canonical Column Header ────────────────────────────────────────────────
// Re-usable header component with standardized styling and optional sort toggle.
// Usage: header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
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
        className={cn("text-[10px] uppercase font-bold text-muted-foreground tracking-wider", className)}
      >
        {title}
      </span>
    );
  }

  const isSorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider cursor-pointer hover:text-foreground transition-colors select-none group",
        className,
      )}
    >
      {title}
      {isSorted === "asc" ? (
        <ArrowUp className="h-3 w-3 text-foreground" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="h-3 w-3 text-foreground" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-70" />
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
  sorting?: SortingState;
  defaultSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  enableSorting?: boolean;
  manualSorting?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  noDataMessage,
  onRowClick,
  className,
  enableRowSelection = false,
  onSelectedRowsChange,
  bulkActions,
  pagination,
  search,
  filters,
  sorting: sortingProp,
  defaultSorting,
  onSortingChange,
  enableSorting = true,
  manualSorting = false,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting || []);

  const sorting = sortingProp !== undefined ? sortingProp : internalSorting;

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const nextSorting = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
    if (sortingProp === undefined) {
      setInternalSorting(nextSorting);
    }
    onSortingChange?.(nextSorting);
  };

  const finalColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("common.table.selectAll", "Select all")}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("common.table.selectRow", "Select row")}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectColumn, ...columns];
  }, [columns, enableRowSelection, t]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection,
    enableSorting,
    manualSorting,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  // Clear selection if data changes (e.g. after paginating or reloading)
  useEffect(() => {
    setRowSelection((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, [data]);

  useEffect(() => {
    if (onSelectedRowsChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
      onSelectedRowsChange(selectedRows);
    }
  }, [rowSelection, onSelectedRowsChange]);

  const hasSelectedRows = Object.keys(rowSelection).length > 0;

  // Compute default showing text
  const defaultShowingText = pagination
    ? t("common.table.showing", "Showing {{start}}–{{end}} of {{total}}", {
        start: pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1,
        end: Math.min(pagination.page * pagination.limit, pagination.totalItems),
        total: pagination.totalItems,
      })
    : "";


  const hasActiveFilters = useMemo(() => {
    const hasSearch = Boolean(search?.value && search.value.trim().length > 0);
    const hasFilter = Boolean(filters?.some((f) => f.value && f.value !== "all" && f.value !== "ALL"));
    return hasSearch || hasFilter;
  }, [search?.value, filters]);

  const handleResetFilters = () => {
    if (search?.onChange && search.value) {
      search.onChange("");
    }
    if (filters) {
      filters.forEach((f) => {
        if (f.value && f.value !== "all" && f.value !== "ALL") {
          f.onChange("");
        }
      });
    }
  };

  return (
    <div className={cn("w-full max-w-full min-w-0 space-y-3", className)}>
      {/* 1. Search & Dropdown Filters Bar */}
      {(search || (filters && filters.length > 0)) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full max-w-full min-w-0">
          {search && (
            <InputGroup className="flex-1 min-w-50">
              <InputGroupInput
                id={`${search.placeholder?.replace(/\s+/g, "-").toLowerCase() || "search"}-input`}
                placeholder={search.placeholder || t("common.table.search", "Search...")}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              {search.value && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    aria-label={t("common.table.clearSearch", "Clear search")}
                    onClick={() => search.onChange("")}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          )}
          {filters && filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {filters.map((filter) => {
                const activeVal = filter.value || "all";
                return (
                  <Select
                    key={filter.id}
                    value={activeVal}
                    onValueChange={(val) => filter.onChange(val === "all" ? "" : val)}
                  >
                    <SelectTrigger
                      id={`filter-${filter.id}`}
                      size="lg"
                      aria-label={filter.placeholder || filter.id}
                      className="min-w-32.5 rounded-md text-xs font-medium bg-card text-foreground border border-border shadow-2xs hover:bg-accent/40 hover:border-border/80 focus:ring-1 focus:ring-ring cursor-pointer gap-2"
                    >
                      <SelectValue placeholder={filter.placeholder || "Select..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border shadow-md rounded-md">
                      {filter.placeholder && (
                        <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                          {filter.placeholder}
                        </SelectItem>
                      )}
                      {filter.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer transition-colors"
                  title={t("common.table.resetFilters", "Reset filters")}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">{t("common.table.resetFilters", "Reset")}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Selection Bulk Action Bar */}
      {enableRowSelection && bulkActions && hasSelectedRows && (
        <div className="px-3 py-1.5 bg-muted/60 border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in min-w-0">
          <span className="text-xs font-mono font-bold text-foreground">
            {Object.keys(rowSelection).length} selected
          </span>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant === "destructive" ? "destructive" : action.variant === "outline" ? "outline" : "default"}
                onClick={() => {
                  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
                  action.onClick(selectedRows);
                }}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Data Table */}
      <div className="w-full max-w-full min-w-0 rounded-lg border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const rawHeader = header.column.columnDef.header;
                  const isStringHeader = typeof rawHeader === "string";

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : isStringHeader ? (
                        <DataTableColumnHeader column={header.column} title={rawHeader} />
                      ) : (
                        flexRender(rawHeader, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
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
                    <EmptyMedia variant="icon" className="bg-muted text-muted-foreground">
                      <Inbox className="h-4 w-4" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-foreground text-sm font-semibold">
                        {noDataMessage || t("common.table.noResults", "No results.")}
                      </EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Footer Pagination controls */}
        {pagination && (
          <div className="flex items-center justify-between pt-2.5 pb-2.5 px-3.5 border-t border-border bg-muted/30">
            <span className="text-[10px] font-medium text-muted-foreground font-mono">
              {pagination.showingText || defaultShowingText}
            </span>
            <div className="flex items-center gap-2">
              {pagination.onLimitChange && (
                <Select
                  value={String(pagination.limit)}
                  onValueChange={(val) => pagination.onLimitChange?.(Number(val))}
                >
                  <SelectTrigger
                    data-testid="pagination-limit-trigger"
                    aria-label={t("common.table.pageSize", "Page size")}
                    size="xs"
                    className="px-2 text-[10px] font-semibold bg-background border-border min-w-14 cursor-pointer"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border min-w-14">
                    <SelectItem value="5" className="text-[10px] font-semibold">5</SelectItem>
                    <SelectItem value="10" className="text-[10px] font-semibold">10</SelectItem>
                    <SelectItem value="20" className="text-[10px] font-semibold">20</SelectItem>
                    <SelectItem value="50" className="text-[10px] font-semibold">50</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.table.prevPage", "Previous page")}
                  className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
                  disabled={pagination.page <= 1}
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.table.nextPage", "Next page")}
                  className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
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


