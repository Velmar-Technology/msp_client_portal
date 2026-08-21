import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon } from "lucide-react";
import { enUS, es } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  id?: string;
  /** Selected date as a local YYYY-MM-DD string; empty string means no selection. */
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Days before this date are not selectable. */
  disabledBefore?: Date;
  className?: string;
}

const toYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseYMD = (value: string | undefined) => {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  disabledBefore,
  className,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const selected = parseYMD(value);
  const isSpanish = i18n.language.startsWith("es");
  const locale = isSpanish ? es : enUS;

  const displayDate = selected
    ? selected.toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          data-empty={!displayDate}
          className={cn(
            "justify-start px-2.5 font-normal",
            !displayDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {displayDate || t("common.pickDate")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          onSelect={(day) => {
            onChange(day ? toYMD(day) : "");
            setOpen(false);
          }}
          disabled={
            disabledBefore ? [{ before: disabledBefore }] : undefined
          }
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}
