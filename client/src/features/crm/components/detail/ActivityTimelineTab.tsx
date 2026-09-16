import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import type { LeadActivity } from "../../api/crmService";
import { getActivityTypeLabel, resolveActivityTitle } from "../../utils/activityTitles";

interface ActivityTimelineTabProps {
  activities: LeadActivity[];
}

export function ActivityTimelineTab({ activities }: ActivityTimelineTabProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  return (
    <TabsContent value="chatter" className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          {t("crm.activityTimeline")}
        </h4>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
          {activities.length} {t("crm.totalRecords") || "records"}
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
          {t("crm.noActivities")}
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-4 ml-2">
          {activities.map((act) => {
            const isPending = act.status === "PENDING";
            return (
              <div key={act.id} className="relative group">
                <div
                  className={`absolute -left-7.75 top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    isPending
                      ? "bg-amber-500 ring-2 ring-amber-500/20"
                      : act.activity_type === "PLAN_ASSIGNED"
                        ? "bg-emerald-500"
                        : act.activity_type.includes("QUOTE")
                          ? "bg-blue-500"
                          : "bg-muted-foreground"
                  }`}
                />

                <div className="bg-card border border-border rounded-lg p-3 shadow-xs space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground font-heading flex items-center gap-1.5 flex-wrap">
                      {resolveActivityTitle(act.title, act.activity_type, t)}
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
                    </span>

                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {new Date(act.created_at).toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {act.summary && (
                    <p className="text-muted-foreground text-xs leading-relaxed">{act.summary}</p>
                  )}

                  {act.due_date && (
                    <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono border-t border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        {t("crm.due")}: {new Date(act.due_date).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
