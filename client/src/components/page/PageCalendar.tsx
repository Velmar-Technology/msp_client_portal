import * as React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PageCalendarProps,
  PageCalendarEvent,
} from "./types";

const variantClasses: Record<
  NonNullable<PageCalendarEvent["variant"]>,
  string
> = {
  default: "bg-muted text-muted-foreground hover:bg-muted/80 border-border",
  primary: "bg-primary/15 text-primary hover:bg-primary/25 border-primary/30",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30",
  destructive: "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 border-rose-500/30",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400 hover:bg-sky-500/25 border-sky-500/30",
};

/**
 * Enterprise Calendar / Date view for temporal records (maintenance schedules, ticket SLAs, due dates).
 * Built with date-fns and standard compact UI controls.
 *
 * @param props - Calendar configuration and events list.
 * @returns Responsive calendar view component.
 */
export function PageCalendar<T extends PageCalendarEvent = PageCalendarEvent>({
  currentDate: controlledDate,
  onDateChange,
  events = [],
  onEventClick,
  onDateClick,
  renderEvent,
  className,
  ...props
}: PageCalendarProps<T>) {
  const [internalDate, setInternalDate] = React.useState<Date>(() => controlledDate || new Date());
  const activeDate = controlledDate || internalDate;

  const handleDateChange = React.useCallback(
    (newDate: Date) => {
      if (!controlledDate) {
        setInternalDate(newDate);
      }
      onDateChange?.(newDate);
    },
    [controlledDate, onDateChange]
  );

  const handlePrevMonth = () => handleDateChange(subMonths(activeDate, 1));
  const handleNextMonth = () => handleDateChange(addMonths(activeDate, 1));
  const handleToday = () => handleDateChange(new Date());

  // Generate calendar grid days (from start of first week in month to end of last week)
  const monthStart = startOfMonth(activeDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = React.useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  const weekDayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      data-slot="page-calendar"
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4",
        className
      )}
      {...props}
    >
      {/* Calendar Header: Month/Year navigation & Today button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary shrink-0" />
          <h2 className="text-base font-bold text-foreground font-heading tracking-tight">
            {format(activeDate, "MMMM yyyy")}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
          >
            Today
          </Button>
          <div className="flex items-center rounded-sm border border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="h-7 w-7 p-0 rounded-none cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="h-7 w-7 p-0 rounded-none cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekday column headers */}
      <div className="grid grid-cols-7 gap-px text-center">
        {weekDayHeaders.map((dayName) => (
          <div
            key={dayName}
            className="py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* 7-Day Month Grid */}
      <div className="grid grid-cols-7 gap-px rounded-md border border-border/70 overflow-hidden bg-border/40">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, activeDate);
          const isCurrentDay = isToday(day);

          // Find events for this specific day
          const dayEvents = events.filter((e) => {
            const eventDate = typeof e.date === "string" ? new Date(e.date) : e.date;
            return isSameDay(eventDate, day);
          });

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={cn(
                "min-h-24 sm:min-h-28 p-1.5 sm:p-2 bg-card flex flex-col justify-between transition-colors select-none",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground/60",
                onDateClick && "cursor-pointer hover:bg-muted/20"
              )}
            >
              {/* Day header: day number */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold rounded-full size-6 flex items-center justify-center font-mono",
                    isCurrentDay && "bg-primary text-primary-foreground font-bold shadow-xs",
                    !isCurrentDay && isCurrentMonth && "text-foreground",
                    !isCurrentDay && !isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 2 && (
                  <span className="text-[10px] font-mono text-muted-foreground/70 hidden sm:inline">
                    {dayEvents.length} items
                  </span>
                )}
              </div>

              {/* Day event markers */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  if (renderEvent) {
                    return (
                      <div key={event.id} onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}>
                        {renderEvent(event)}
                      </div>
                    );
                  }

                  const variantClass = variantClasses[event.variant || "primary"];

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate transition-all flex items-center gap-1 cursor-pointer",
                        variantClass
                      )}
                      title={event.title}
                    >
                      <span className="truncate">{event.title}</span>
                    </button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
