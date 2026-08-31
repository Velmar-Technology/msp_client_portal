import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import { Radio, RefreshCw } from "lucide-react";

export interface RmmDashboardHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

// const GITHUB_RELEASE_BASE = "https://github.com/Velmar-Technology/msp_client_portal/releases/latest/download";

export const RmmDashboardHeader: React.FC<RmmDashboardHeaderProps> = memo(({ loading, onRefresh }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-full min-w-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse shrink-0" />
            {t("rmm.headerEngine")}
          </span>
        </div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{t("rmm.headerTitle")}</h2>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">{t("rmm.headerSubtitle")}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-8 px-3 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t("rmm.downloadAgent")}</span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <a
                href={`${GITHUB_RELEASE_BASE}/msp-agent-windows-x86_64.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer w-full text-xs font-medium"
              >
                <Monitor className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>{t("rmm.downloadWin64")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`${GITHUB_RELEASE_BASE}/msp-agent-windows-i686.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer w-full text-xs font-medium"
              >
                <Monitor className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>{t("rmm.downloadWin32")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`${GITHUB_RELEASE_BASE}/msp-agent_aarch64.dmg`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer w-full text-xs font-medium"
              >
                <Laptop className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span>{t("rmm.downloadMacArm")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`${GITHUB_RELEASE_BASE}/msp-agent_x64.dmg`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer w-full text-xs font-medium"
              >
                <Laptop className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>{t("rmm.downloadMacIntel")}</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}

        <Button
          onClick={onRefresh}
          disabled={loading}
          className="h-8 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md shadow-xs transition-opacity cursor-pointer shrink-0 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{t("rmm.headerRefresh")}</span>
        </Button>
      </div>
    </div>
  );
});

RmmDashboardHeader.displayName = "RmmDashboardHeader";
