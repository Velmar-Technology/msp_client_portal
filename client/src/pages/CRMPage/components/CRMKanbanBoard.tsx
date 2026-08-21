import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Lead, LeadStage, CrmPipelineStats } from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Building2, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

interface CRMKanbanBoardProps {
  leads: Lead[];
  stats: CrmPipelineStats | null;
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (id: string, stage: LeadStage) => void;
}

const STAGES: { key: LeadStage; color: string; border: string; headerBg: string }[] = [
  { key: "NEW", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", headerBg: "bg-blue-500/10" },
  { key: "QUALIFIED", color: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30", headerBg: "bg-purple-500/10" },
  { key: "PROPOSITION", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", headerBg: "bg-amber-500/10" },
  { key: "WON", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", headerBg: "bg-emerald-500/10" },
  { key: "LOST", color: "text-zinc-500 dark:text-zinc-400", border: "border-zinc-500/30", headerBg: "bg-zinc-500/10" },
];

const NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  NEW: "QUALIFIED",
  QUALIFIED: "PROPOSITION",
  PROPOSITION: "WON",
};

export function CRMKanbanBoard({
  leads,
  stats,
  onSelectLead,
  onUpdateStage,
}: CRMKanbanBoardProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const leadsByStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      NEW: [],
      QUALIFIED: [],
      PROPOSITION: [],
      WON: [],
      LOST: [],
    };
    for (const lead of leads) {
      if (map[lead.stage]) {
        map[lead.stage].push(lead);
      }
    }
    return map;
  }, [leads]);

  const handleDrop = (stage: LeadStage): void => {
    if (draggingLeadId) {
      const lead = leads.find((l) => l.id === draggingLeadId);
      if (lead && lead.stage !== stage) {
        onUpdateStage(draggingLeadId, stage);
      }
    }
    setDraggingLeadId(null);
    setDragOverStage(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px] items-start">
        {STAGES.map(({ key, color, border, headerBg }) => {
          const stageLeads = leadsByStage[key] || [];
          const stageStats = stats?.stageBreakdown?.[key];
          const totalVal = stageStats ? stageStats.value : stageLeads.reduce((acc, l) => acc + l.expected_revenue, 0);
          const isDropTarget = dragOverStage === key && draggingLeadId !== null;

          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(key);
              }}
              onDragLeave={() => setDragOverStage((prev) => (prev === key ? null : prev))}
              onDrop={() => handleDrop(key)}
              className={`flex-1 min-w-[220px] rounded-xl p-3 flex flex-col gap-3 shadow-xs transition-colors ${
                isDropTarget
                  ? "bg-primary/5 border-2 border-dashed border-primary/50"
                  : "bg-muted/40 dark:bg-zinc-900/40 border border-border"
              }`}
            >
              {/* Column Header */}
              <div className={`p-2.5 rounded-lg border ${border} ${headerBg} flex items-center justify-between`}>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold font-heading uppercase tracking-wider ${color}`}>
                    {t(`crm.stages.${key.toLowerCase()}`)}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-foreground mt-0.5">
                    ${totalVal.toFixed(2)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-background border border-border text-[10px] font-bold text-foreground font-mono">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="flex flex-col gap-2.5 min-h-[300px]">
                {stageLeads.length === 0 ? (
                  <div className="h-32 border border-dashed border-border rounded-lg flex items-center justify-center text-[11px] text-muted-foreground">
                    {t("crm.emptyStage")}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const nextStage = NEXT_STAGE[lead.stage];
                    const isDragging = draggingLeadId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingLeadId(lead.id)}
                        onDragEnd={() => {
                          setDraggingLeadId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => onSelectLead(lead)}
                        className={`bg-card hover:bg-card/80 border border-border hover:border-primary/50 transition-all rounded-lg p-3 shadow-xs cursor-pointer flex flex-col gap-2 group relative ${
                          isDragging ? "opacity-40" : ""
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-xs text-foreground font-heading group-hover:text-primary transition-colors line-clamp-1">
                            {lead.contact_name}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-mono px-1 rounded border ${
                              lead.priority === "HIGH"
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : lead.priority === "MEDIUM"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {t(`crm.priorities.${lead.priority.toLowerCase()}`)}
                          </span>
                        </div>

                        {/* Company / Contact */}
                        {lead.company_name && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0 text-zinc-400" />
                            <span className="truncate">{lead.company_name}</span>
                          </span>
                        )}

                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 truncate">
                          <Mail className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
                          <span className="truncate">{lead.contact_email}</span>
                        </div>

                        {/* Target Plan & Expected Revenue */}
                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground truncate">
                            {lead.plan_name || lead.plan_id || t("crm.noPlan")}
                          </span>
                          <span className="text-xs font-bold font-mono text-foreground">
                            ${lead.expected_revenue.toFixed(2)}
                          </span>
                        </div>

                        {/* Follow-up & Quick Stage Buttons */}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          {lead.next_follow_up_date ? (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                              <Calendar className="h-2.5 w-2.5 text-zinc-400" />
                              {new Date(lead.next_follow_up_date).toLocaleDateString(
                                isSpanish ? "es-DO" : "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {nextStage && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title={t("crm.moveTo", { stage: t(`crm.stages.${nextStage.toLowerCase()}`) })}
                                onClick={() => onUpdateStage(lead.id, nextStage)}
                                className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                            {lead.stage !== "WON" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title={t("crm.markWon")}
                                onClick={() => onUpdateStage(lead.id, "WON")}
                                className="h-6 w-6 text-muted-foreground hover:text-emerald-600 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            )}
                            {lead.stage !== "LOST" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title={t("crm.markLost")}
                                onClick={() => onUpdateStage(lead.id, "LOST")}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
