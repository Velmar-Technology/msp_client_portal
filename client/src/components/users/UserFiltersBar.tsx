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
import type { RoleFilter, StatusFilter } from "../../hooks/useUserManagement";

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
    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          placeholder={t("userManagement.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-8 h-8 text-sm bg-card border"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Role Filter */}
      <Select
        value={roleFilter || "ALL"}
        onValueChange={(value) =>
          onRoleFilterChange(value === "ALL" ? "" : (value as RoleFilter))
        }
      >
        <SelectTrigger className="h-8 w-[140px] text-xs bg-card border">
          <SelectValue placeholder={t("userManagement.filterRole")} />
        </SelectTrigger>
        <SelectContent>
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
        <SelectTrigger className="h-8 w-[130px] text-xs bg-card border">
          <SelectValue placeholder={t("userManagement.filterStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("userManagement.allStatuses")}</SelectItem>
          <SelectItem value="active">{t("userManagement.active")}</SelectItem>
          <SelectItem value="inactive">{t("userManagement.inactive")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Results count */}
      <span className="text-[10px] text-zinc-400 font-mono ml-auto">
        {total} {t("userManagement.results")}
      </span>
    </div>
  );
}
