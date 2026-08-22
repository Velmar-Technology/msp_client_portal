import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleFilter, StatusFilter } from "@/hooks/useUserManagement";

interface UserFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  total: number;
}

export function UserFiltersBar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  total,
}: UserFiltersBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3 w-full">
      {/* Search */}
      <div className="relative flex-1 min-w-50">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("userManagement.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-8 h-8 bg-card border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring/50 shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/80 transition-colors cursor-pointer"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Role Filter */}
        <Select
          value={roleFilter || "ALL"}
          onValueChange={(value) =>
            onRoleFilterChange(value === "ALL" ? "" : (value as RoleFilter))
          }
        >
          <SelectTrigger className="h-8 min-w-32.5 px-2.5 text-xs font-medium bg-card text-foreground border border-border shadow-2xs hover:bg-accent/40 hover:border-border/80 focus:ring-1 focus:ring-ring cursor-pointer gap-2">
            <SelectValue placeholder={t("userManagement.filterRole")} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border shadow-md rounded-md">
            <SelectItem value="ALL">{t("userManagement.allRoles")}</SelectItem>
            <SelectItem value="CLIENT">{t("userManagement.roleClient")}</SelectItem>
            <SelectItem value="TECHNICIAN">{t("userManagement.roleTech")}</SelectItem>
            <SelectItem value="ADMIN">{t("userManagement.roleAdmin")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
        >
          <SelectTrigger className="h-8 min-w-32.5 px-2.5 text-xs font-medium bg-card text-foreground border border-border shadow-2xs hover:bg-accent/40 hover:border-border/80 focus:ring-1 focus:ring-ring cursor-pointer gap-2">
            <SelectValue placeholder={t("userManagement.filterStatus")} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border shadow-md rounded-md">
            <SelectItem value="all">{t("userManagement.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("userManagement.statusActive") || t("userManagement.active")}</SelectItem>
            <SelectItem value="inactive">{t("userManagement.statusInactive") || t("userManagement.inactive")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Results count */}
        <span className="text-[10px] text-muted-foreground font-mono ml-auto pl-2 whitespace-nowrap">
          {total} {t("userManagement.results")}
        </span>
      </div>
    </div>
  );
}
