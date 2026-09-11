import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DataTableFilter, type DataTableBulkAction } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { Lead, LeadStage, LeadPriority } from "../api/crmService";
import {
  Calendar,
  Phone,
  Mail,
  Building2,
  User,
  ChevronRight,
  MoreHorizontal,
  ArrowUpRight,
  Ban,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface CRMDataTableProps {
  leads: Lead[];
  total: number;
  loading: boolean;
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (id: string, stage: LeadStage) => void;
  onBulkUpdateStage?: (ids: string[], stage: LeadStage) => void;
  onDeleteLead?: (id: string) => void;
  onBulkDeleteLeads?: (ids: string[]) => void;
  search: string;
  onSearchChange: (val: string) => void;
  stageFilter: string;
  onStageFilterChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function CRMDataTable({
  leads,
  total,
  loading,
  onSelectLead,
  onUpdateStage,
  onBulkUpdateStage,
  onDeleteLead,
  onBulkDeleteLeads,
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  page,
  limit,
  onPageChange,
}: CRMDataTableProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [bulkToDelete, setBulkToDelete] = useState<string[] | null>(null);

  const getStageBadge = (stage: LeadStage) => {
    switch (stage) {
      case "NEW":
        return {
          badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20",
          dotClass: "bg-blue-500",
        };
      case "QUALIFIED":
        return {
          badgeClass:
            "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-500/20",
          dotClass: "bg-purple-500",
        };
      case "PROPOSITION":
        return {
          badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20",
          dotClass: "bg-amber-500",
        };
      case "WON":
        return {
          badgeClass:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20",
          dotClass: "bg-emerald-500",
        };
      case "LOST":
        return {
          badgeClass:
            "bg-muted text-muted-foreground border border-border",
          dotClass: "bg-muted-foreground",
        };
      default:
        return {
          badgeClass: "bg-muted text-muted-foreground border border-border",
          dotClass: "bg-muted-foreground",
        };
    }
  };

  const getPriorityBadge = (priority: LeadPriority) => {
    switch (priority) {
      case "HIGH":
        return "text-destructive font-bold";
      case "MEDIUM":
        return "text-amber-600 dark:text-amber-400 font-semibold";
      case "LOW":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const [now] = useState(() => Date.now());

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "contact_name",
        header: t("crm.columns.leadName"),
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-xs font-heading flex items-center gap-1.5">
                {lead.contact_name}
                {lead.company_name && (
                  <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-0.5">
                    <Building2 className="h-2.5 w-2.5" />
                    {lead.company_name}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                <span className="flex items-center gap-0.5">
                  <Mail className="h-2.5 w-2.5 text-zinc-400" />
                  {lead.contact_email}
                </span>
                {lead.contact_phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="h-2.5 w-2.5 text-zinc-400" />
                    {lead.contact_phone}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "stage",
        header: t("crm.columns.stage"),
        cell: ({ row }) => {
          const stage = row.getValue("stage") as LeadStage;
          const { badgeClass, dotClass } = getStageBadge(stage);
          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${badgeClass}`}>
              <span className={`mr-1 h-1 w-1 rounded-full ${dotClass}`} />
              {t(`crm.stages.${stage.toLowerCase()}`) || stage}
            </span>
          );
        },
      },
      {
        accessorKey: "expected_revenue",
        header: t("crm.columns.expectedRevenue"),
        cell: ({ row }) => {
          const val = Number(row.getValue("expected_revenue") || 0);
          const cycle = row.original.billing_cycle;
          return (
            <div className="flex flex-col font-mono text-xs">
              <span className="font-bold text-foreground">${val.toFixed(2)}</span>
              <span className="text-[9px] text-muted-foreground uppercase">
                {cycle === "annual" ? t("plans.annual") : t("plans.monthly")}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "plan_name",
        header: t("crm.columns.plan"),
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground font-heading">
                {lead.plan_name || lead.plan_id || "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("plans.devicesCount", { count: lead.equipment_count })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: t("crm.columns.priority"),
        cell: ({ row }) => {
          const priority = row.getValue("priority") as LeadPriority;
          return (
            <span className={`text-[10px] uppercase font-mono tracking-wider ${getPriorityBadge(priority)}`}>
              {t(`crm.priorities.${priority.toLowerCase()}`) || priority}
            </span>
          );
        },
      },
      {
        accessorKey: "next_follow_up_date",
        header: t("crm.columns.nextFollowUp"),
        cell: ({ row }) => {
          const dateStr = row.getValue("next_follow_up_date") as string | null;
          if (!dateStr) return <span className="text-xs text-zinc-400">—</span>;
          const d = new Date(dateStr);
          const isOverdue = d.getTime() < now;
          return (
            <div className="flex items-center gap-1 text-xs font-mono">
              <Calendar className={`h-3 w-3 ${isOverdue ? "text-red-500" : "text-zinc-400"}`} />
              <span className={isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                {d.toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
                  month: "short",
                  day: "2-digit",
                })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "assigned_user_name",
        header: t("crm.columns.assignedTo"),
        cell: ({ row }) => {
          const name = row.getValue("assigned_user_name") as string | null;
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 text-zinc-400" />
              <span>{name || t("crm.unassigned")}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: t("plans.actions"),
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onSelectLead(lead);
                }}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t("crm.openLead")}</span>
                <ChevronRight className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="h-7 w-7 cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    {t("crm.quickStage")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => onUpdateStage(lead.id, "WON")}
                    className="text-xs text-emerald-600 font-semibold cursor-pointer"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                    {t("crm.stages.won")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateStage(lead.id, "LOST")}
                    className="text-xs text-amber-600 cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    {t("crm.stages.lost")}
                  </DropdownMenuItem>

                  {onDeleteLead && (
                    <>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => setLeadToDelete(lead)}
                        className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                        {t("crm.deleteLead") || "Delete / Archive"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, isSpanish, onSelectLead, onUpdateStage, onDeleteLead, now],
  );

  const filters: DataTableFilter[] = useMemo(
    () => [
      {
        id: "stage",
        value: stageFilter,
        onChange: onStageFilterChange,
        placeholder: t("crm.allStages"),
        options: [
          { value: "NEW", label: t("crm.stages.new") },
          { value: "QUALIFIED", label: t("crm.stages.qualified") },
          { value: "PROPOSITION", label: t("crm.stages.proposition") },
          { value: "WON", label: t("crm.stages.won") },
          { value: "LOST", label: t("crm.stages.lost") },
        ],
      },
      {
        id: "priority",
        value: priorityFilter,
        onChange: onPriorityFilterChange,
        placeholder: t("crm.allPriorities"),
        options: [
          { value: "HIGH", label: t("crm.priorities.high") },
          { value: "MEDIUM", label: t("crm.priorities.medium") },
          { value: "LOW", label: t("crm.priorities.low") },
        ],
      },
    ],
    [t, stageFilter, onStageFilterChange, priorityFilter, onPriorityFilterChange],
  );

  const bulkActions: DataTableBulkAction<Lead>[] = useMemo(
    () => [
      {
        label: t("crm.bulkWon"),
        onClick: (selectedRows) => {
          if (onBulkUpdateStage) {
            onBulkUpdateStage(
              selectedRows.map((row) => row.id),
              "WON",
            );
          } else {
            selectedRows.forEach((row) => onUpdateStage(row.id, "WON"));
          }
        },
      },
      {
        label: t("crm.bulkLost"),
        variant: "destructive",
        onClick: (selectedRows) => {
          if (onBulkUpdateStage) {
            onBulkUpdateStage(
              selectedRows.map((row) => row.id),
              "LOST",
            );
          } else {
            selectedRows.forEach((row) => onUpdateStage(row.id, "LOST"));
          }
        },
      },
      ...(onBulkDeleteLeads
        ? [
            {
              label: t("crm.bulkDelete") || "Delete Selected",
              variant: "destructive" as const,
              onClick: (selectedRows: Lead[]) => {
                setBulkToDelete(selectedRows.map((row) => row.id));
              },
            },
          ]
        : []),
    ],
    [t, onUpdateStage, onBulkUpdateStage, onBulkDeleteLeads],
  );

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        onRowClick={onSelectLead}
        enableRowSelection
        bulkActions={bulkActions}
        search={{
          value: search,
          onChange: onSearchChange,
          placeholder: t("crm.searchPlaceholder"),
        }}
        filters={filters}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit,
          onPageChange,
        }}
        noDataMessage={t("crm.noLeadsFound")}
      />

      {/* Confirmation Dialog: Single Delete */}
      <AlertDialog open={Boolean(leadToDelete)} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("crm.deleteLeadConfirmTitle") || "Delete Opportunity?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              {leadToDelete &&
                (t("crm.deleteLeadConfirmDesc", { name: leadToDelete.contact_name }) ||
                  `Are you sure you want to delete the opportunity for ${leadToDelete.contact_name}?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
            <AlertDialogCancel onClick={() => setLeadToDelete(null)} className="text-xs cursor-pointer">
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leadToDelete && onDeleteLead) {
                  onDeleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }
              }}
              className="text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
            >
              {t("common.delete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Bulk Delete */}
      <AlertDialog open={Boolean(bulkToDelete)} onOpenChange={(open) => !open && setBulkToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("crm.bulkDeleteConfirmTitle") || "Delete Selected Opportunities?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              {bulkToDelete &&
                (t("crm.bulkDeleteConfirmDesc", { count: bulkToDelete.length }) ||
                  `Are you sure you want to delete ${bulkToDelete.length} selected opportunities?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
            <AlertDialogCancel onClick={() => setBulkToDelete(null)} className="text-xs cursor-pointer">
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkToDelete && onBulkDeleteLeads) {
                  onBulkDeleteLeads(bulkToDelete);
                  setBulkToDelete(null);
                }
              }}
              className="text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
            >
              {t("crm.bulkDelete") || "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
