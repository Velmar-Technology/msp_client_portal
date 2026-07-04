import { useTranslation } from "react-i18next";
import type { UserStats } from "../../services/userService";
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border">
      <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider leading-none">
          {label}
        </span>
        <span
          className={`text-base font-extrabold leading-tight ${accent ?? "text-zinc-900 dark:text-zinc-50"}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {value}
        </span>
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
      <StatItem
        icon={<Users className="h-3.5 w-3.5" />}
        label={t("userManagement.totalUsers")}
        value={stats.total}
      />
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
