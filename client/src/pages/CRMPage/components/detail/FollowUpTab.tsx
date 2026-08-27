import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared";
import { Calendar, Clock, Pencil, Trash2, Check } from "lucide-react";
import type { Lead, LeadActivity, UpdateActivityPayload } from "@/services/crmService";
import { getActivityTypeLabel, resolveActivityTitle } from "../../utils/activityTitles";
import { toast } from "sonner";

const activityFormSchema = z.object({
  activityType: z.enum([
    "EMAIL_SENT",
    "QUOTE_SENT",
    "QUOTE_REMINDER",
    "QUOTE_STATUS_CHANGE",
    "CALL",
    "MEETING",
    "NOTE",
    "STAGE_CHANGE",
    "PLAN_ASSIGNED",
    "SUB_MODIFIED",
  ]),
  title: z.string().min(1, "crm.validation.activityTitleRequired").max(255),
  summary: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
});

interface FollowUpTabProps {
  lead: Lead;
  activities: LeadActivity[];
  actionLoading: boolean;
  onLogActivity: (payload: {
    activityType: LeadActivity["activity_type"];
    title: string;
    summary?: string;
    dueDate?: string;
    status?: "PENDING" | "COMPLETED";
  }) => Promise<void>;
  onUpdateActivity: (activityId: string, data: UpdateActivityPayload) => Promise<void>;
  onOpenEditActivity: (act: LeadActivity) => void;
  onOpenDeleteActivity?: (act: LeadActivity) => void;
}

export function FollowUpTab({
  lead: _lead,
  activities,
  actionLoading,
  onLogActivity,
  onUpdateActivity,
  onOpenEditActivity,
  onOpenDeleteActivity,
}: FollowUpTabProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  const [activityType, setActivityType] = useState<LeadActivity["activity_type"]>("CALL");
  const [activityTitle, setActivityTitle] = useState<string>("");
  const [activitySummary, setActivitySummary] = useState<string>("");
  const [activityDueDate, setActivityDueDate] = useState<string>("");
  const [activityIsPending, setActivityIsPending] = useState<boolean>(false);
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});

  const handleLogActivityClick = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = activityFormSchema.safeParse({
      activityType,
      title: activityTitle.trim(),
      summary: activitySummary.trim() || undefined,
      dueDate: activityDueDate ? new Date(`${activityDueDate}T09:00:00.000Z`).toISOString() : undefined,
    });

    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!errMap[field]) {
          errMap[field] = issue.message;
        }
      }
      setActivityErrors(errMap);
      return;
    }

    setActivityErrors({});

    try {
      await onLogActivity({
        activityType: parsed.data.activityType,
        title: parsed.data.title,
        summary: parsed.data.summary,
        dueDate: parsed.data.dueDate,
        status: activityIsPending ? "PENDING" : "COMPLETED",
      });
      setActivityTitle("");
      setActivitySummary("");
      setActivityDueDate("");
      setActivityIsPending(false);
      toast.success(t("crm.activityLogged"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log activity.";
      toast.error(message);
    }
  };

  const followUpActivities = activities.filter((a) => a.due_date || a.status === "PENDING");

  return (
    <TabsContent value="followup" className="space-y-5 pt-4">
      <form
        onSubmit={handleLogActivityClick}
        className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3.5"
        noValidate
      >
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          {t("crm.scheduleFollowUp")}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("crm.activityType")}
            </label>
            <Select
              value={activityType}
              onValueChange={(v) => setActivityType(v as LeadActivity["activity_type"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">{t("crm.activities.call")}</SelectItem>
                <SelectItem value="MEETING">{t("crm.activities.meeting")}</SelectItem>
                <SelectItem value="EMAIL_SENT">{t("crm.activities.email")}</SelectItem>
                <SelectItem value="NOTE">{t("crm.activities.note")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("crm.dueDate")}
            </label>
            <DatePicker
              value={activityDueDate}
              onChange={(v) => {
                setActivityDueDate(v);
                if (v) setActivityIsPending(true);
              }}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("crm.activityTitle")} *
          </label>
          <Input
            value={activityTitle}
            onChange={(e) => setActivityTitle(e.target.value)}
            placeholder={t("crm.activityTitlePlaceholder")}
            aria-invalid={Boolean(activityErrors.title)}
          />
          {activityErrors.title && (
            <p className="text-[10px] text-destructive mt-1">{t(activityErrors.title)}</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("crm.activitySummary")}
          </label>
          <Textarea
            rows={2}
            value={activitySummary}
            onChange={(e) => setActivitySummary(e.target.value)}
            placeholder={t("crm.activitySummaryPlaceholder")}
            className="text-xs bg-background text-foreground"
          />
        </div>

        <Button
          type="submit"
          disabled={actionLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 cursor-pointer shadow-xs"
        >
          {t("crm.recordActivity")}
        </Button>
      </form>

      {/* List of Scheduled Follow-ups for this Lead */}
      <div className="pt-2 space-y-3">
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {t("crm.scheduledFollowUps") || "Scheduled Follow-ups"}
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {followUpActivities.length}
          </Badge>
        </h4>

        {followUpActivities.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
            {t("crm.noScheduledFollowUps") || "No pending follow-ups scheduled for this lead."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {followUpActivities.map((act) => {
              const isPending = act.status === "PENDING";
              return (
                <div
                  key={act.id}
                  className="bg-card border border-border rounded-xl p-3 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground font-heading">
                          {resolveActivityTitle(act.title, act.activity_type, t)}
                        </span>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono px-1">
                          {getActivityTypeLabel(act.activity_type, t)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold uppercase ${
                            isPending
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : act.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {act.status}
                        </Badge>
                      </div>
                      {act.summary && (
                        <p className="text-muted-foreground text-xs leading-relaxed">{act.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenEditActivity(act)}
                        title={t("crm.editActivity") || "Edit Follow-up"}
                        className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>{t("common.edit") || "Edit"}</span>
                      </Button>
                      {onOpenDeleteActivity && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenDeleteActivity(act)}
                          title={t("crm.deleteActivity") || "Delete Follow-up"}
                          className="h-6 px-2 text-[10px] gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{t("common.delete") || "Delete"}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] font-mono">
                    {act.due_date ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        {t("crm.due")}: {new Date(act.due_date).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {new Date(act.created_at).toLocaleDateString(isSpanish ? "es-DO" : "en-US")}
                      </span>
                    )}
                    {isPending && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => onUpdateActivity(act.id, { status: "COMPLETED" })}
                        className="h-auto p-0 text-emerald-600 font-semibold cursor-pointer text-[10px] gap-1"
                      >
                        <Check className="h-3 w-3" />
                        {t("crm.markCompleted")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
