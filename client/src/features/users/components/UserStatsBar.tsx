import { useTranslation } from "react-i18next";
import type { UserStats } from "../api/userService";
import { Users, Shield, Wrench, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared";

interface UserStatsBarProps {
  stats: UserStats | null;
  loading: boolean;
}

export function UserStatsBar({ stats, loading }: UserStatsBarProps) {
  const { t } = useTranslation();

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      <StatCard
        icon={<Users className="h-3.5 w-3.5" />}
        title={t("userManagement.totalUsers")}
        value={stats.total}
      />
      <StatCard
        icon={<User className="h-3.5 w-3.5" />}
        title={t("userManagement.roleClient")}
        value={stats.byRole.CLIENT ?? 0}
      />
      <StatCard
        icon={<Wrench className="h-3.5 w-3.5" />}
        title={t("userManagement.roleTech")}
        value={stats.byRole.TECHNICIAN ?? 0}
      />
      <StatCard
        icon={<Shield className="h-3.5 w-3.5" />}
        title={t("userManagement.roleAdmin")}
        value={stats.byRole.ADMIN ?? 0}
      />
      <StatCard
        icon={
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </span>
        }
        title={`${stats.active} / ${stats.inactive}`}
        value={stats.active}
      />
    </div>
  );
}
