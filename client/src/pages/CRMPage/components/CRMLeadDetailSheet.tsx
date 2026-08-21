import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Lead, LeadStage, LeadPriority, LeadActivity, Quotation, QuotationStatus, UpdateLeadPayload, ConvertLeadResult } from "@/services/crmService";
import { DatePicker } from "@/components/shared";
import { getActivityTypeLabel, resolveActivityTitle } from "../utils/activityTitles";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import { toast } from "sonner";
import {
  FileText,
  Send,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  Building2,
  Clock,
  Plus,
  Minus,
  MessageSquare,
  Sparkles,
  Ban,
  UserCheck,
  Check,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const CRM_TAX_RATE = 0.18;

const editLeadFormSchema = z.object({
  contactName: z.string().min(1, "crm.validation.contactNameRequired").max(255),
  contactEmail: z.string().email("crm.validation.invalidEmail").max(255),
  contactPhone: z.string().max(50).optional(),
  companyName: z.string().max(255).optional(),
  expectedRevenue: z.number().min(0),
  probability: z.number().min(0).max(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().max(2000).optional(),
});

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

interface CRMLeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  activities: LeadActivity[];
  quotations: Quotation[];
  customerSubscriptions: Subscription[];
  actionLoading: boolean;
  onUpdateLead?: (id: string, payload: UpdateLeadPayload) => Promise<void>;
  onUpdateStage: (id: string, stage: LeadStage, lostReason?: string | null) => Promise<void>;
  onSendQuotation: (payload: {
    leadId: string;
    clientId?: string | null;
    recipientName: string;
    recipientEmail: string;
    planId: string;
    billingCycle: "monthly" | "annual";
    equipmentCount: number;
    notes?: string;
  }) => Promise<void>;
  onResendQuotation: (quotationId: string, customMessage?: string) => Promise<void>;
  onUpdateQuotationStatus?: (quotationId: string, status: QuotationStatus) => Promise<void>;
  onConvertLead: (
    leadId: string,
    payload: { planId?: string; billingCycle?: "monthly" | "annual"; equipmentCount?: number },
  ) => Promise<ConvertLeadResult | void>;
  onLogActivity: (payload: {
    activityType: LeadActivity["activity_type"];
    title: string;
    summary?: string;
    dueDate?: string;
    status?: "PENDING" | "COMPLETED";
  }) => Promise<void>;
  onUpdateActivity: (activityId: string, data: { status?: string; summary?: string }) => Promise<void>;
  onModifySubscription: (subId: string, planId: string, count: number) => Promise<void>;
  onCancelSubscription?: (subId: string) => Promise<void>;
  onRequestCancelSubscription?: (subId: string) => void;
  onDeleteLead?: (id: string) => Promise<void>;
}

const STAGES: LeadStage[] = ["NEW", "QUALIFIED", "PROPOSITION", "WON", "LOST"];

function getQuotationBadgeVariant(status: QuotationStatus) {
  switch (status) {
    case "ACCEPTED":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "DECLINED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "SENT":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "EXPIRED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "DRAFT":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function CRMLeadDetailSheet({
  lead,
  open,
  onOpenChange,
  plans,
  activities,
  quotations,
  customerSubscriptions,
  actionLoading,
  onUpdateLead,
  onUpdateStage,
  onSendQuotation,
  onResendQuotation,
  onUpdateQuotationStatus,
  onConvertLead,
  onLogActivity,
  onUpdateActivity,
  onModifySubscription,
  onCancelSubscription,
  onRequestCancelSubscription,
  onDeleteLead,
}: CRMLeadDetailSheetProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  // Edit lead state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editContactName, setEditContactName] = useState(() => lead?.contact_name || "");
  const [editContactEmail, setEditContactEmail] = useState(() => lead?.contact_email || "");
  const [editContactPhone, setEditContactPhone] = useState(() => lead?.contact_phone || "");
  const [editCompanyName, setEditCompanyName] = useState(() => lead?.company_name || "");
  const [editExpectedRevenue, setEditExpectedRevenue] = useState<number>(() => lead?.expected_revenue ?? 0);
  const [editProbability, setEditProbability] = useState<number>(() => lead?.probability ?? 10);
  const [editPriority, setEditPriority] = useState<LeadPriority>(() => lead?.priority || "MEDIUM");
  const [editNotes, setEditNotes] = useState(() => lead?.notes || "");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Quotation form initial state derived on mount
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => lead?.plan_id || plans[0]?.id || "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    () => (lead?.billing_cycle as "monthly" | "annual") || "monthly",
  );
  const [equipmentCount, setEquipmentCount] = useState<number>(() => lead?.equipment_count || 1);
  const [quoteNotes, setQuoteNotes] = useState<string>("");

  // Activity form state
  const [activityType, setActivityType] = useState<LeadActivity["activity_type"]>("CALL");
  const [activityTitle, setActivityTitle] = useState<string>("");
  const [activitySummary, setActivitySummary] = useState<string>("");
  const [activityDueDate, setActivityDueDate] = useState<string>("");
  const [activityIsPending, setActivityIsPending] = useState<boolean>(false);
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("quotation");

  const effectivePlanId = selectedPlanId || plans[0]?.id || "";

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === effectivePlanId) || plans[0];
  }, [plans, effectivePlanId]);

  const priceMultiplier = billingCycle === "annual" ? 12 * 0.8 : 1;
  const unitPrice = currentPlan ? (billingCycle === "annual" ? currentPlan.price * 0.8 : currentPlan.price) : 0;
  const subtotal = currentPlan ? Math.round(currentPlan.price * priceMultiplier * equipmentCount * 100) / 100 : 0;
  const tax = Math.round(subtotal * CRM_TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handleSendQuoteClick = async () => {
    if (!lead || !currentPlan) return;
    try {
      await onSendQuotation({
        leadId: lead.id,
        clientId: lead.client_id,
        recipientName: lead.contact_name,
        recipientEmail: lead.contact_email,
        planId: currentPlan.id,
        billingCycle,
        equipmentCount,
        notes: quoteNotes || undefined,
      });
      toast.success(t("crm.quoteSentSuccess"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.quoteSentError");
      toast.error(message);
    }
  };

  const handleConvertClick = async () => {
    if (!lead) return;
    try {
      const result = await onConvertLead(lead.id, {
        planId: effectivePlanId,
        billingCycle,
        equipmentCount,
      });
      if (result && "clientCreated" in result && result.clientCreated) {
        toast.success(
          t("crm.convertAndClientCreatedSuccess") ||
            "Lead converted! Client account created, invitation sent, and invoice ready for payment."
        );
      } else {
        toast.success(t("crm.convertSuccess"));
      }
      onOpenChange(false);
      const invoiceId = result && "invoice" in result && result.invoice ? result.invoice.id : undefined;
      if (invoiceId) {
        navigate(`/billing?invoiceId=${invoiceId}`, { state: { invoiceId } });
      } else {
        navigate("/billing");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.convertError");
      toast.error(message);
    }
  };

  const handleQuotationStatusChange = async (quotationId: string, status: QuotationStatus) => {
    if (!onUpdateQuotationStatus) return;
    try {
      await onUpdateQuotationStatus(quotationId, status);
      if (status === "ACCEPTED") {
        toast.success(t("crm.quotationActions.acceptedSuccess"));
      } else if (status === "DECLINED") {
        toast.success(t("crm.quotationActions.declinedSuccess"));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.quotationActions.statusUpdateError");
      toast.error(message);
    }
  };

  const handleLogActivityClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

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

  const handleStartEdit = () => {
    if (!lead) return;
    setEditContactName(lead.contact_name);
    setEditContactEmail(lead.contact_email);
    setEditContactPhone(lead.contact_phone || "");
    setEditCompanyName(lead.company_name || "");
    setEditExpectedRevenue(lead.expected_revenue ?? 0);
    setEditProbability(lead.probability ?? 10);
    setEditPriority(lead.priority || "MEDIUM");
    setEditNotes(lead.notes || "");
    setEditErrors({});
    setIsEditingLead(true);
  };

  const handleSaveLeadInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !onUpdateLead) return;

    const parsed = editLeadFormSchema.safeParse({
      contactName: editContactName.trim(),
      contactEmail: editContactEmail.trim(),
      contactPhone: editContactPhone.trim() || undefined,
      companyName: editCompanyName.trim() || undefined,
      expectedRevenue: Number(editExpectedRevenue) || 0,
      probability: Math.min(100, Math.max(0, Number(editProbability) || 0)),
      priority: editPriority,
      notes: editNotes.trim() || undefined,
    });

    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!errMap[field]) {
          errMap[field] = issue.message;
        }
      }
      setEditErrors(errMap);
      return;
    }

    setEditErrors({});

    try {
      await onUpdateLead(lead.id, {
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        companyName: parsed.data.companyName,
        expectedRevenue: parsed.data.expectedRevenue,
        probability: parsed.data.probability,
        priority: parsed.data.priority,
        notes: parsed.data.notes,
      });
      setIsEditingLead(false);
      toast.success(t("crm.leadUpdatedSuccess") || "Lead details updated successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.leadUpdateError") || "Failed to update lead details.";
      toast.error(message);
    }
  };

  const handleCancelSub = (subId: string) => {
    if (onRequestCancelSubscription) {
      onRequestCancelSubscription(subId);
    } else if (onCancelSubscription) {
      onCancelSubscription(subId).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to cancel subscription.";
        toast.error(message);
      });
    }
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-2xl overflow-y-auto p-0 bg-background text-foreground border-l border-border"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex flex-col gap-3">
            {/* Pipeline Stage Bar */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
                {STAGES.map((s) => {
                  const isActive = lead.stage === s;
                  const isWon = s === "WON";
                  const isLost = s === "LOST";

                  return (
                    <Button
                      key={s}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateStage(lead.id, s)}
                      className={`h-7 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        isActive
                          ? isWon
                            ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-600 hover:text-white"
                            : isLost
                              ? "bg-zinc-600 text-white shadow-xs hover:bg-zinc-600 hover:text-white"
                              : "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(`crm.stages.${s.toLowerCase()}`) || s}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isEditingLead && onUpdateLead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>{t("crm.editLead") || "Edit Details"}</span>
                  </Button>
                )}

                {!isEditingLead && onDeleteLead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-7 px-2 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("crm.deleteLead") || "Delete / Archive"}</span>
                  </Button>
                )}

                {lead.stage !== "WON" && (
                  <Button
                    size="sm"
                    onClick={handleConvertClick}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shrink-0 cursor-pointer shadow-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {t("crm.wonAndSubscribe")}
                  </Button>
                )}
              </div>
            </div>

            {/* Lead Summary Header Info or Edit Form */}
            {isEditingLead ? (
              <form onSubmit={handleSaveLeadInfo} className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 mt-1" noValidate>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    {t("crm.editLead") || "Edit Lead Information"}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingLead(false)}
                      disabled={actionLoading}
                      className="h-7 px-2 text-xs cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      {t("crm.cancelEdit") || "Cancel"}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      onClick={handleSaveLeadInfo}
                      disabled={actionLoading}
                      className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer bg-primary text-primary-foreground shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {actionLoading ? "..." : t("crm.saveLead") || "Save Changes"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.contactName")} *
                    </label>
                    <Input
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                      placeholder={t("crm.contactNamePlaceholder")}
                      aria-invalid={Boolean(editErrors.contactName)}
                      className="h-8 text-xs bg-background text-foreground"
                    />
                    {editErrors.contactName && (
                      <p className="text-[10px] text-destructive mt-1">{t(editErrors.contactName)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.companyName")}
                    </label>
                    <Input
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      placeholder={t("crm.companyNamePlaceholder")}
                      className="h-8 text-xs bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.contactEmail")} *
                    </label>
                    <Input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      placeholder={t("crm.contactEmailPlaceholder")}
                      aria-invalid={Boolean(editErrors.contactEmail)}
                      className="h-8 text-xs bg-background text-foreground"
                    />
                    {editErrors.contactEmail && (
                      <p className="text-[10px] text-destructive mt-1">{t(editErrors.contactEmail)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.contactPhone")}
                    </label>
                    <Input
                      type="tel"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      placeholder={t("crm.contactPhonePlaceholder")}
                      className="h-8 text-xs bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.columns.expectedRevenue")} ($)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editExpectedRevenue}
                      onChange={(e) => setEditExpectedRevenue(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-background text-foreground font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Win Prob (%)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editProbability}
                        onChange={(e) => setEditProbability(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className="h-8 text-xs bg-background text-foreground font-mono text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("tickets.tablePriority") || "Priority"}
                      </label>
                      <Select value={editPriority} onValueChange={(v) => setEditPriority(v as LeadPriority)}>
                        <SelectTrigger className="w-full h-8 text-xs bg-background text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">{t("crm.priorities.low")}</SelectItem>
                          <SelectItem value="MEDIUM">{t("crm.priorities.medium")}</SelectItem>
                          <SelectItem value="HIGH">{t("crm.priorities.high")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("crm.notes")}
                  </label>
                  <Textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t("crm.notesPlaceholder")}
                    className="text-xs bg-background text-foreground"
                  />
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <div>
                  <SheetTitle className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                    {lead.contact_name}
                    {lead.company_name && (
                      <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                        {lead.company_name}
                      </span>
                    )}
                  </SheetTitle>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-zinc-400" />
                      {lead.contact_email}
                    </span>
                    {lead.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-zinc-400" />
                        {lead.contact_phone}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-mono font-bold ${
                        lead.priority === "HIGH"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : lead.priority === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {t(`crm.priorities.${(lead.priority || "medium").toLowerCase()}`) || lead.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {lead.probability ?? 10}% {t("crm.stats.winRate") || "Prob"}
                    </span>
                  </div>
                  {lead.notes && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-md p-2 mt-2 italic leading-relaxed">
                      "{lead.notes}"
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right font-mono shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    {t("crm.columns.expectedRevenue")}
                  </span>
                  <span className="text-base font-bold text-foreground font-heading">
                    ${lead.expected_revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Drawer Tabs */}
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-lg border border-border">
              <TabsTrigger value="quotation" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <FileText className="h-3.5 w-3.5" />
                {t("crm.tabs.quote")}
              </TabsTrigger>
              <TabsTrigger value="subscription" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <Sparkles className="h-3.5 w-3.5" />
                {t("crm.tabs.subscription")}
              </TabsTrigger>
              <TabsTrigger value="followup" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <Calendar className="h-3.5 w-3.5" />
                {t("crm.tabs.followup")}
              </TabsTrigger>
              <TabsTrigger value="chatter" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("crm.tabs.timeline")}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Quotation Engine */}
            <TabsContent value="quotation" className="space-y-5 pt-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
                <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  {t("crm.quotationBuilder")}
                </h4>

                {/* Plan Selection with shadcn Select */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("plans.selectPlan")}
                  </label>
                  <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="w-full h-9 text-xs bg-background text-foreground">
                      <SelectValue placeholder={t("plans.selectPlan")} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => {
                        const name =
                          typeof p.name === "object" && p.name !== null
                            ? p.name[isSpanish ? "es_DO" : "en_US"] || Object.values(p.name)[0]
                            : p.name || p.id;
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {name} (${p.price}/mo per device)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Equipment Counter & Billing Cycle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("plans.equipmentCount")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8.5 w-8.5 cursor-pointer"
                        disabled={equipmentCount <= 1}
                        onClick={() => setEquipmentCount((c) => Math.max(1, c - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={equipmentCount}
                        onChange={(e) => setEquipmentCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="h-8.5 text-center font-mono font-bold text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8.5 w-8.5 cursor-pointer"
                        onClick={() => setEquipmentCount((c) => c + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("plans.billingCycle")}
                    </label>
                    <div className="flex items-center bg-muted p-0.5 rounded-md border border-border h-8.5">
                      <Button
                        type="button"
                        variant={billingCycle === "monthly" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setBillingCycle("monthly")}
                        className="flex-1 h-7 text-xs font-semibold cursor-pointer"
                      >
                        {t("plans.monthly")}
                      </Button>
                      <Button
                        type="button"
                        variant={billingCycle === "annual" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setBillingCycle("annual")}
                        className="flex-1 h-7 text-xs font-semibold cursor-pointer"
                      >
                        {t("plans.annual")} (-20%)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Live Pricing Breakdown Card */}
                <div className="bg-muted/40 rounded-lg p-3.5 border border-border font-mono text-xs space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("plans.unitPrice")}:</span>
                    <span>${unitPrice.toFixed(2)}/mo</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("plans.subtotal")}:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("plans.taxes")}:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-border font-bold text-sm text-foreground">
                    <span>{t("plans.total")}:</span>
                    <span className="text-primary">${total.toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Optional Quote Notes with shadcn Textarea */}
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("crm.quoteNotes")}
                  </label>
                  <Textarea
                    rows={2}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder={t("crm.quoteNotesPlaceholder")}
                    className="text-xs bg-background text-foreground"
                  />
                </div>

                {/* Send Quote Action Button */}
                <Button
                  onClick={handleSendQuoteClick}
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {actionLoading ? t("plans.quoteSending") : t("crm.sendOfficialQuote")}
                </Button>
              </div>

              {/* Quotation History & Actions */}
              {quotations.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
                    {t("crm.quotationHistory")}
                  </h4>
                  <div className="space-y-2">
                    {quotations.map((quote) => (
                      <div
                        key={quote.id}
                        className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs text-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-foreground">{quote.quotation_number}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase font-mono font-bold ${getQuotationBadgeVariant(
                                quote.status,
                              )}`}
                            >
                              {t(`crm.quotationStatus.${quote.status.toLowerCase()}`) || quote.status}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ${quote.total.toFixed(2)} • {quote.equipment_count} {t("crm.devices")} •{" "}
                            {new Date(quote.sent_at).toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {quote.status === "SENT" && onUpdateQuotationStatus && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuotationStatusChange(quote.id, "ACCEPTED")}
                                disabled={actionLoading}
                                title={t("crm.quotationActions.accept")}
                                className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {t("crm.quotationActions.accept")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuotationStatusChange(quote.id, "DECLINED")}
                                disabled={actionLoading}
                                title={t("crm.quotationActions.decline")}
                                className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                {t("crm.quotationActions.decline")}
                              </Button>
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResendQuotation(quote.id)}
                            disabled={actionLoading}
                            className="text-xs gap-1 cursor-pointer h-7 px-2"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {t("crm.resendReminder")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Plan Subscription Management */}
            <TabsContent value="subscription" className="space-y-5 pt-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  {t("plans.applyPlanToCustomer")}
                </h4>
                <p className="text-xs text-muted-foreground leading-normal">
                  {t("crm.applyPlanHelp")}
                </p>
                <Button
                  onClick={handleConvertClick}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {actionLoading ? t("plans.applyingStatus") : t("crm.confirmAndActivate")}
                </Button>
              </div>

              {/* Customer Existing Subscriptions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
                  {t("plans.customerSubsTitle")}
                </h4>
                {customerSubscriptions.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-5 text-center text-xs text-muted-foreground">
                    {t("plans.noCustomerSubs")}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerSubscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground font-heading">{sub.service_name}</span>
                            <Badge variant="outline" className="ml-2 text-[9px] font-mono font-bold uppercase">
                              {sub.plan}
                            </Badge>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold uppercase ${
                              sub.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {sub.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">
                              {t("plans.devicesLimit")}:
                            </span>
                            <span className="font-bold font-mono text-foreground">{sub.equipment_count}</span>
                            <div className="flex items-center gap-1 ml-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6 cursor-pointer"
                                disabled={sub.equipment_count <= 1}
                                onClick={() => onModifySubscription(sub.id, sub.plan, sub.equipment_count - 1)}
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6 cursor-pointer"
                                onClick={() => onModifySubscription(sub.id, sub.plan, sub.equipment_count + 1)}
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelSub(sub.id)}
                            className="h-7 text-[11px] gap-1 cursor-pointer"
                          >
                            <Ban className="h-3 w-3" />
                            {t("plans.cancelSubscription")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Follow-Up Scheduler */}
            <TabsContent value="followup" className="space-y-5 pt-4">
              <form onSubmit={handleLogActivityClick} className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3.5" noValidate>
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
                      <SelectTrigger className="w-full h-8.5 text-xs bg-background">
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
                      className="w-full h-8.5 text-xs bg-background"
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
                    className="h-8.5 text-xs bg-background text-foreground"
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
            </TabsContent>

            {/* TAB 4: Chatter / Timeline */}
            <TabsContent value="chatter" className="space-y-4 pt-4">
              <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                {t("crm.activityTimeline")}
              </h4>

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
                          className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                            isPending
                              ? "bg-amber-500 ring-2 ring-amber-500/20"
                              : act.activity_type === "PLAN_ASSIGNED"
                                ? "bg-emerald-500"
                                : act.activity_type.includes("QUOTE")
                                  ? "bg-blue-500"
                                  : "bg-zinc-400"
                          }`}
                        />

                        <div className="bg-card border border-border rounded-lg p-3 shadow-xs space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground font-heading flex items-center gap-1.5">
                              {resolveActivityTitle(act.title, act.activity_type, t)}
                              <Badge variant="outline" className="text-[9px] uppercase font-mono px-1">
                                {getActivityTypeLabel(act.activity_type, t)}
                              </Badge>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
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
                            <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-zinc-400" />
                                {t("crm.due")}: {new Date(act.due_date).toLocaleString()}
                              </span>
                              {isPending && (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  onClick={() => onUpdateActivity(act.id, { status: "COMPLETED" })}
                                  className="h-auto p-0 text-emerald-600 font-semibold cursor-pointer text-[10px]"
                                >
                                  {t("crm.markCompleted")}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirmation Dialog: Delete Opportunity */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                {t("crm.deleteLeadConfirmTitle") || "Delete Opportunity?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
                {t("crm.deleteLeadConfirmDesc", { name: lead.contact_name }) ||
                  `Are you sure you want to delete the opportunity for ${lead.contact_name}?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
              <AlertDialogCancel
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs cursor-pointer"
              >
                {t("common.cancel") || "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (onDeleteLead) {
                    await onDeleteLead(lead.id);
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  }
                }}
                className="text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
              >
                {t("common.delete") || "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

export default CRMLeadDetailSheet;
