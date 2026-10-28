import React from 'react';
import { Bot, MoreVertical, Radio, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface AgentCardProps {
  name: string;
  description: string;
  voice: string;
  status: 'active' | 'draft' | 'training';
  lastEdited?: string;
  isStreaming?: boolean;
  conversationCount?: number;
  className?: string;
  onSelect?: () => void;
  onMoreActions?: (e: React.MouseEvent) => void;
}

export function AgentCard({
  name,
  description,
  voice,
  status,
  lastEdited = 'Just now',
  isStreaming = false,
  conversationCount,
  className,
  onSelect,
  onMoreActions,
}: AgentCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 text-card-foreground transition-all duration-200 select-none hover:border-foreground/25 hover:shadow-xs',
        onSelect && 'cursor-pointer',
        className
      )}
    >
      {/* Signature ElevenLabs Conic/Linear Spinning Highlight Ring when Active/Streaming */}
      {isStreaming && <div className="active-highlight-ring rounded-xl pointer-events-none" />}

      <div>
        {/* Card Header: Avatar & Status & Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground font-semibold shadow-2xs">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm text-foreground tracking-tight truncate">
                {name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status === 'active' && 'bg-emerald-500 animate-pulse',
                    status === 'training' && 'bg-amber-500',
                    status === 'draft' && 'bg-muted-foreground/40'
                  )}
                />
                <span className="text-[11px] text-muted-foreground capitalize font-normal">
                  {status}
                </span>
                {typeof conversationCount === 'number' && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-[11px] text-muted-foreground">
                      {conversationCount} chats
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              onMoreActions?.(e);
            }}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors hover:bg-muted/50"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mt-3.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Footer: Voice Tag & Last Edited */}
      <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
        <Badge variant="outline" className="gap-1.5 bg-muted/30 font-normal">
          {isStreaming ? (
            <Volume2 className="h-3 w-3 text-cyan-500 animate-pulse" />
          ) : (
            <Radio className="h-3 w-3 text-muted-foreground" />
          )}
          <span>{voice}</span>
        </Badge>
        <span className="text-[11px] text-muted-foreground/80">{lastEdited}</span>
      </div>
    </div>
  );
}
