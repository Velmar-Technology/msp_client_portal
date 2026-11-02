import React from "react";
import { Bot, MoreVertical, Radio, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GlowCard,
  GlowCardHeader,
  GlowCardIcon,
  GlowCardTitleGroup,
  GlowCardTitle,
  GlowCardStatus,
  GlowCardStatusDot,
  GlowCardAction,
  GlowCardContent,
  GlowCardDivider,
  GlowCardFooter,
  GlowCardBadge,
  type GlowCardVariant,
} from "@/components/ui/glow-card";

export interface AgentCardProps {
  name: string;
  description: string;
  voice: string;
  status: "active" | "draft" | "training";
  lastEdited?: string;
  isStreaming?: boolean;
  conversationCount?: number;
  className?: string;
  onSelect?: () => void;
  onMoreActions?: (e: React.MouseEvent) => void;
}

/**
 * Signature Agent Card with neon top-left gradient outline and ambient backlight glow.
 */
export function AgentCard({
  name,
  description,
  voice,
  status,
  lastEdited = "Just now",
  isStreaming = false,
  conversationCount,
  className,
  onSelect,
  onMoreActions,
}: AgentCardProps) {
  const variant: GlowCardVariant =
    status === "active" ? "neon" : status === "training" ? "amber" : "slate";

  const dotColor =
    status === "active" ? "emerald" : status === "training" ? "amber" : "muted";

  return (
    <GlowCard
      variant={variant}
      onClick={onSelect}
      className={cn(
        "cursor-default select-none",
        onSelect && "cursor-pointer",
        className
      )}
    >
      {/* Signature ElevenLabs Conic/Linear Spinning Highlight Ring when Active/Streaming */}
      {isStreaming && (
        <div className="active-highlight-ring rounded-2xl pointer-events-none" />
      )}

      {/* Header: Icon, Title & Status, Actions Menu */}
      <GlowCardHeader>
        <div className="flex items-center gap-3 min-w-0">
          <GlowCardIcon>
            <Bot className="h-5 w-5" />
          </GlowCardIcon>
          <GlowCardTitleGroup>
            <GlowCardTitle>{name}</GlowCardTitle>
            <GlowCardStatus>
              <GlowCardStatusDot color={dotColor} pulse={status === "active"} />
              <span className="capitalize">{status}</span>
              {typeof conversationCount === "number" && (
                <>
                  <span>•</span>
                  <span>{conversationCount} chats</span>
                </>
              )}
            </GlowCardStatus>
          </GlowCardTitleGroup>
        </div>

        <GlowCardAction>
          <button
            type="button"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              onMoreActions?.(e);
            }}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </GlowCardAction>
      </GlowCardHeader>

      {/* Description */}
      <GlowCardContent>
        <p className="line-clamp-2">{description}</p>
      </GlowCardContent>

      <GlowCardDivider />

      {/* Footer: Voice Tag & Last Activity */}
      <GlowCardFooter>
        <GlowCardBadge>
          {isStreaming ? (
            <Volume2 className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          ) : (
            <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span>{voice}</span>
        </GlowCardBadge>
        <span className="text-[11px] font-mono text-muted-foreground/80">{lastEdited}</span>
      </GlowCardFooter>
    </GlowCard>
  );
}
