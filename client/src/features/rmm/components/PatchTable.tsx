import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw } from 'lucide-react';
import type { RmmPatchItem } from '@/features/rmm';
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
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400 gap-2 text-xs font-medium">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-400 dark:text-zinc-500" />
        <span>{t("rmm.modalScanning")}</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border max-h-[360px] overflow-y-auto bg-card">
      <Table>
        <TableHeader className="bg-muted/80 sticky top-0 z-10 border-b border-border">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="w-[36px] py-2 px-3">
              <Checkbox
                checked={isAllPendingSelected}
                disabled={pendingPatchesCount === 0 || applying}
                onCheckedChange={(checked) => onSelectAllPending(!!checked)}
                className="translate-y-[1px]"
              />
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("rmm.tableAdvisoryId")}
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("rmm.tableTitleDesc")}
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("rmm.tableSeverity")}
            </TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("rmm.tableStatus")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                {t("rmm.modalNoAdvisories")}
              </TableCell>
            </TableRow>
          ) : (
            patches.map((patch) => {
              const isSelected = selectedPatchIds.includes(patch.id);
              const isDisabled = patch.status === 'INSTALLED' || patch.status === 'INSTALLING' || applying;

              return (
                <TableRow
                  key={patch.id}
                  className="hover:bg-muted/50 border-b border-border transition-colors"
                >
                  <TableCell className="py-2 px-3">
                    <Checkbox
                      disabled={isDisabled}
                      checked={isSelected}
                      onCheckedChange={(checked) => onTogglePatch(patch.id, !!checked)}
                      className="translate-y-[1px]"
                    />
                  </TableCell>
                  <TableCell className="py-2 px-3 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                    {patch.patch_id}
                  </TableCell>
                  <TableCell className="py-2 px-3 max-w-[280px]">
                    <p className="font-medium text-xs text-foreground truncate">{patch.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {patch.installed_at
                        ? t("rmm.installedOn", { date: new Date(patch.installed_at).toLocaleDateString() })
                        : t("rmm.readyForDeployment")}
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
