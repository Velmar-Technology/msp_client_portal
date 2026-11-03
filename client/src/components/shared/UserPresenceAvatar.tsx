import { useTranslation } from "react-i18next";
import { useConnectionStatus, type ConnectionStatus } from "@/hooks/useConnectionStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface UserPresenceAvatarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  status?: ConnectionStatus;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  sm: {
    outer: "size-7 p-[2.5px]",
    inner: "size-5.5 text-[11px]",
    dot: "size-2 -top-0.5 -right-0.5 ring-[1.5px]",
  },
  md: {
    outer: "size-9 p-[3px]",
    inner: "size-7.5 text-xs",
    dot: "size-2.5 -top-0.5 -right-0.5 ring-2",
  },
  lg: {
    outer: "size-12 p-[4px]",
    inner: "size-10 text-base",
    dot: "size-3.5 top-0 right-0 ring-2",
  },
};

/**
 * Reusable user avatar with whitespace gap ring and real-time presence/connectivity indicator.
 * Matches the high-density SaaS design specification.
 *
 * @param props - UserPresenceAvatarProps
 * @returns JSX.Element
 */
export function UserPresenceAvatar({
  user,
  status: explicitStatus,
  size = "sm",
  showTooltip = false,
  className = "",
  onClick,
}: UserPresenceAvatarProps) {
  const { t } = useTranslation();
  const liveStatus = useConnectionStatus();
  const activeStatus = explicitStatus || liveStatus;

  const initial = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "S";
  const { outer, inner, dot } = sizeConfig[size] || sizeConfig.sm;

  let dotColor = "bg-[#00c853]";
  let statusLabel = t("presence.online") || "Live Connection: Online";

  if (activeStatus === "reconnecting") {
    dotColor = "bg-amber-500 animate-pulse";
    statusLabel = t("presence.reconnecting") || "Live Sync: Reconnecting...";
  } else if (activeStatus === "offline") {
    dotColor = "bg-neutral-400 dark:bg-neutral-500";
    statusLabel = t("presence.offline") || "Connection: Offline";
  }

  const avatarElement = (
    <div
      onClick={onClick}
      className={`relative rounded-full border border-border/80 bg-background flex items-center justify-center shrink-0 transition-transform active:scale-95 ${outer} ${className}`}
      data-testid="presence-avatar"
    >
      {/* Inner Avatar Circle */}
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name || "User"}
          className={`rounded-full object-cover ${inner}`}
        />
      ) : (
        <div
          className={`rounded-full bg-[#48342f] dark:bg-[#5a413a] text-white flex items-center justify-center font-bold select-none ${inner}`}
        >
          {initial}
        </div>
      )}

      {/* Dynamic Presence Dot with ring cutout matching screenshot */}
      <span
        data-testid="presence-dot"
        data-status={activeStatus}
        className={`absolute rounded-full ring-background shadow-2xs ${dot} ${dotColor}`}
        aria-label={statusLabel}
      />
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px] font-medium py-1 px-2">
            {statusLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarElement;
}
