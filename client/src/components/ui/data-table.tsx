import { useState, useEffect, useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Inbox } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from "@/components/ui/empty"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  noDataMessage?: string
  onRowClick?: (row: TData) => void
  className?: string
  enableRowSelection?: boolean
  onSelectedRowsChange?: (selectedRows: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  noDataMessage = "No results.",
  onRowClick,
  className,
  enableRowSelection = false,
  onSelectedRowsChange,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const finalColumns = useMemo(() => {
    if (!enableRowSelection) return columns

    const selectColumn: ColumnDef<TData, any> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
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
    }

    return [selectColumn, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      rowSelection,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  // Clear selection if data changes (e.g. after paginating or reloading)
  useEffect(() => {
    setRowSelection({})
  }, [data])

  useEffect(() => {
    if (onSelectedRowsChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
      onSelectedRowsChange(selectedRows)
    }
  }, [rowSelection, table, onSelectedRowsChange])

  return (
    <div className={cn("rounded-md border border-outline-variant", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={finalColumns.length} className="h-24 text-center">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
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
    </div>
  )
}
