import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw } from 'lucide-react';
import type { RmmPatchItem } from '@/services/rmmService';
import { PatchSeverityBadge } from './PatchSeverityBadge';
import { PatchStatusBadge } from './PatchStatusBadge';

export interface PatchTableProps {
  patches: RmmPatchItem[];
  loading: boolean;
  applying: boolean;
  selectedPatchIds: string[];
  pendingPatchesCount: number;
  isAllPendingSelected: boolean;
  onSelectAllPending: (checked: boolean) => void;
  onTogglePatch: (id: string, checked: boolean) => void;
}

export const PatchTable: React.FC<PatchTableProps> = ({
  patches,
  loading,
  applying,
  selectedPatchIds,
  pendingPatchesCount,
  isAllPendingSelected,
  onSelectAllPending,
  onTogglePatch,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400 gap-2 text-xs font-medium">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-400 dark:text-zinc-500" />
        <span>Scanning device patch inventory via Zabbix agent...</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 max-h-[360px] overflow-y-auto bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader className="bg-zinc-50 dark:bg-zinc-900/90 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
          <TableRow className="hover:bg-transparent border-b border-zinc-200 dark:border-zinc-800">
            <TableHead className="w-[36px] py-2 px-3">
              <Checkbox
                checked={isAllPendingSelected}
                disabled={pendingPatchesCount === 0 || applying}
                onCheckedChange={(checked) => onSelectAllPending(!!checked)}
                className="translate-y-[1px]"
              />
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Advisory ID
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Title & Description
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Severity
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-xs text-zinc-500 dark:text-zinc-400">
                No patch advisories found for this device.
              </TableCell>
            </TableRow>
          ) : (
            patches.map((patch) => {
              const isSelected = selectedPatchIds.includes(patch.id);
              const isDisabled = patch.status === 'INSTALLED' || patch.status === 'INSTALLING' || applying;

              return (
                <TableRow
                  key={patch.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/60 transition-colors"
                >
                  <TableCell className="py-2 px-3">
                    <Checkbox
                      disabled={isDisabled}
                      checked={isSelected}
                      onCheckedChange={(checked) => onTogglePatch(patch.id, !!checked)}
                      className="translate-y-[1px]"
                    />
                  </TableCell>
                  <TableCell className="py-2 px-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {patch.patch_id}
                  </TableCell>
                  <TableCell className="py-2 px-3 max-w-[280px]">
                    <p className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">{patch.title}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {patch.installed_at
                        ? `Installed on ${new Date(patch.installed_at).toLocaleDateString()}`
                        : 'Ready for deployment'}
                    </p>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <PatchSeverityBadge severity={patch.severity} />
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <PatchStatusBadge status={patch.status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
