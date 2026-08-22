import { useTranslation } from "react-i18next";
import type { UserStats } from "@/services/userService";
import { Users, Shield, Wrench, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStatsBarProps {
  stats: UserStats | null;
  loading: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}

function StatItem({ icon, label, value, accent }: StatItemProps) {
  return (
    <div className="group rounded-lg border border-zinc-200 bg-white p-3 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 flex items-center justify-between gap-2">
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate leading-tight">
          {label}
        </span>
        <span className={`text-xl font-bold tracking-tight font-heading mt-0.5 leading-tight ${accent ?? "text-zinc-900 dark:text-zinc-50"}`}>
          {value}
        </span>
      </div>
      <div className="rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900 shrink-0">
        {icon}
      </div>
    </div>
  );
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
      <StatItem icon={<Users className="h-3.5 w-3.5" />} label={t("userManagement.totalUsers")} value={stats.total} />
      <StatItem
        icon={<User className="h-3.5 w-3.5" />}
        label={t("userManagement.roleClient")}
        value={stats.byRole.CLIENT ?? 0}
      />
      <StatItem
        icon={<Wrench className="h-3.5 w-3.5" />}
        label={t("userManagement.roleTech")}
        value={stats.byRole.TECHNICIAN ?? 0}
      />
      <StatItem
        icon={<Shield className="h-3.5 w-3.5" />}
        label={t("userManagement.roleAdmin")}
        value={stats.byRole.ADMIN ?? 0}
      />
      <StatItem
        icon={
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          </span>
        }
        label={`${stats.active} / ${stats.inactive}`}
        value={stats.active}
        accent="text-emerald-600 dark:text-emerald-400"
      />
    </div>
  );
}
