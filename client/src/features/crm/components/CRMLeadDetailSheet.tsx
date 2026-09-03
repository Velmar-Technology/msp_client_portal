import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  Lead,
  LeadStage,
  LeadPriority,
  LeadActivity,
  Quotation,
  QuotationStatus,
  UpdateLeadPayload,
  ConvertLeadResult,
  UpdateActivityPayload,
} from "../api/crmService";
import type { Plan, Subscription } from "@/features/subscriptions";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  Sparkles,
  Check,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { CRM_VALID_STAGES as STAGES } from "@/constants/crm";
import { TAX_RATE as CRM_TAX_RATE } from "@/constants/billing";

import { QuotationTab } from "./detail/QuotationTab";
import { SubscriptionTab } from "./detail/SubscriptionTab";
import { FollowUpTab } from "./detail/FollowUpTab";
import { ActivityTimelineTab } from "./detail/ActivityTimelineTab";
import { EditActivityDialog } from "./detail/EditActivityDialog";
import { DeleteActivityDialog } from "./detail/DeleteActivityDialog";
import { DeleteLeadDialog } from "./detail/DeleteLeadDialog";

export { CRM_TAX_RATE };

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
  onUpdateActivity: (activityId: string, data: UpdateActivityPayload) => Promise<void>;
  onDeleteActivity?: (activityId: string) => Promise<void>;
  onModifySubscription: (subId: string, planId: string, count: number) => Promise<void>;
  onCancelSubscription?: (subId: string) => Promise<void>;
  onRequestCancelSubscription?: (subId: string) => void;
  onDeleteLead?: (id: string) => Promise<void>;
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
  onDeleteActivity,
  onModifySubscription,
  onCancelSubscription,
  onRequestCancelSubscription,
  onDeleteLead,
}: CRMLeadDetailSheetProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("quotation");

  // Lead editing state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    contactName: lead?.contact_name || "",
    contactEmail: lead?.contact_email || "",
    contactPhone: lead?.contact_phone || "",
    companyName: lead?.company_name || "",
    expectedRevenue: Number(lead?.expected_revenue ?? 0),
    probability: lead?.probability ?? 10,
    priority: (lead?.priority || "MEDIUM") as LeadPriority,
    notes: lead?.notes || "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showDeleteLeadConfirm, setShowDeleteLeadConfirm] = useState(false);

  // Activity Dialogs state
  const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<LeadActivity | null>(null);

  useEffect(() => {
    if (lead && !isEditingLead) {
      setLeadForm({
        contactName: lead.contact_name || "",
        contactEmail: lead.contact_email || "",
        contactPhone: lead.contact_phone || "",
        companyName: lead.company_name || "",
        expectedRevenue: Number(lead.expected_revenue ?? 0),
        probability: lead.probability ?? 10,
        priority: (lead.priority || "MEDIUM") as LeadPriority,
        notes: lead.notes || "",
      });
    }
  }, [lead, isEditingLead]);

  if (!lead) return null;

  const handleStartEdit = () => {
    setLeadForm({
      contactName: lead.contact_name || "",
      contactEmail: lead.contact_email || "",
      contactPhone: lead.contact_phone || "",
      companyName: lead.company_name || "",
      expectedRevenue: Number(lead.expected_revenue ?? 0),
      probability: lead.probability ?? 10,
      priority: (lead.priority || "MEDIUM") as LeadPriority,
      notes: lead.notes || "",
    });
    setEditErrors({});
    setIsEditingLead(true);
  };

  const handleSaveLeadInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateLead) return;

    const parsed = editLeadFormSchema.safeParse({
      contactName: leadForm.contactName.trim(),
      contactEmail: leadForm.contactEmail.trim(),
      contactPhone: leadForm.contactPhone.trim() || undefined,
      companyName: leadForm.companyName.trim() || undefined,
      expectedRevenue: Number(leadForm.expectedRevenue) || 0,
      probability: Math.min(100, Math.max(0, Number(leadForm.probability) || 0)),
      priority: leadForm.priority,
      notes: leadForm.notes.trim() || undefined,
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

  const handleConvertClick = async () => {
    try {
      const result = await onConvertLead(lead.id, {
        planId: lead.plan_id || plans[0]?.id || undefined,
        billingCycle: (lead.billing_cycle as "monthly" | "annual") || "monthly",
        equipmentCount: lead.equipment_count || 1,
      });
      if (result && "clientCreated" in result && result.clientCreated) {
        toast.success(
          t("crm.convertAndClientCreatedSuccess") ||
            "Lead converted! Client account created, invitation sent, and invoice ready for payment.",
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-2xl overflow-y-auto p-0 bg-background text-foreground border-l border-border"
      >
        <SheetHeader className="p-6 pr-12 sm:pr-14 pb-4 border-b border-border bg-card">
          <div className="flex flex-col gap-3.5">
            {/* Top Bar: Lead Identity & Financial Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg sm:text-xl font-bold font-heading text-foreground flex flex-wrap items-center gap-2">
                  <span className="truncate">{lead.contact_name}</span>
                  {lead.company_name && (
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60 shrink-0">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {lead.company_name}
                    </span>
                  )}
                </SheetTitle>
              </div>

              {!isEditingLead && (
                <div className="text-left sm:text-right font-mono shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    {t("crm.columns.expectedRevenue")}
                  </span>
                  <span className="text-base font-bold text-foreground font-heading">
                    ${Number(lead?.expected_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Lead Summary Contact Info or Inline Edit Form */}
            {isEditingLead ? (
              <form
                onSubmit={handleSaveLeadInfo}
                className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 mt-1"
                noValidate
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    {t("crm.editLead") || "Edit Lead Information"}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("crm.contactName")} *
                    </label>
                    <Input
                      value={leadForm.contactName}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, contactName: e.target.value }))}
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
                      value={leadForm.companyName}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, companyName: e.target.value }))}
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
                      value={leadForm.contactEmail}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
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
                      value={leadForm.contactPhone}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
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
                      value={leadForm.expectedRevenue}
                      onChange={(e) =>
                        setLeadForm((prev) => ({ ...prev, expectedRevenue: parseFloat(e.target.value) || 0 }))
                      }
                      className="h-8 text-xs bg-background text-foreground font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[14px] truncate">
                        Win Prob (%)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={leadForm.probability}
                        onChange={(e) =>
                          setLeadForm((prev) => ({
                            ...prev,
                            probability: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                          }))
                        }
                        className="h-8 text-xs bg-background text-foreground font-mono text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[14px] truncate">
                        {t("tickets.tablePriority") || "Priority"}
                      </label>
                      <Select
                        value={leadForm.priority}
                        onValueChange={(v) => setLeadForm((prev) => ({ ...prev, priority: v as LeadPriority }))}
                      >
                        <SelectTrigger size="lg" className="w-full text-xs bg-background text-foreground">
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
                    value={leadForm.notes}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t("crm.notesPlaceholder")}
                    className="text-xs bg-background text-foreground"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingLead(false)}
                    disabled={actionLoading}
                    className="h-8 px-3 text-xs cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t("crm.cancelEdit") || "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading}
                    className="h-8 px-4 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {actionLoading ? "..." : t("crm.saveLead") || "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground font-mono">
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
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                      {lead.probability ?? 10}% {t("crm.stats.winRate") || "Prob"}
                    </span>
                  </div>
                </div>
                {/* Stage Bar */}
                <div className="w-full">
                  <div className="grid grid-cols-5 gap-1 p-1 bg-muted/70 rounded-xl border border-border/80">
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
                          className={`h-7 px-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer truncate ${
                            isActive
                              ? isWon
                                ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-600 hover:text-white"
                                : isLost
                                  ? "bg-zinc-600 text-white shadow-xs hover:bg-zinc-600 hover:text-white"
                                  : "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                          }`}
                        >
                          {t(`crm.stages.${s.toLowerCase()}`) || s}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {!isEditingLead && lead.notes && (
              <p className="text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-2.5 italic leading-relaxed">
                "{lead.notes}"
              </p>
            )}
          </div>
        </SheetHeader>

        {/* Drawer Body: Actions Toolbar & Tabs */}
        <div className="p-6 pr-12 sm:pr-14 space-y-5">
          {/* Opportunity Actions Toolbar in Body */}
          {!isEditingLead && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
                  {t("crm.leadActions") || "Opportunity Actions"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {onUpdateLead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer bg-card hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>{t("crm.editLead") || "Edit Details"}</span>
                  </Button>
                )}

                {onDeleteLead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteLeadConfirm(true)}
                    className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer bg-card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("crm.deleteLead") || "Delete / Archive"}</span>
                  </Button>
                )}
              </div>
            </div>
          )}

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

            <QuotationTab
              lead={lead}
              plans={plans}
              quotations={quotations}
              actionLoading={actionLoading}
              onSendQuotation={onSendQuotation}
              onResendQuotation={onResendQuotation}
              onUpdateQuotationStatus={onUpdateQuotationStatus}
            />

            <SubscriptionTab
              lead={lead}
              customerSubscriptions={customerSubscriptions}
              actionLoading={actionLoading}
              onConvertClick={handleConvertClick}
              onModifySubscription={onModifySubscription}
              onCancelSubscription={onCancelSubscription}
              onRequestCancelSubscription={onRequestCancelSubscription}
            />

            <FollowUpTab
              lead={lead}
              activities={activities}
              actionLoading={actionLoading}
              onLogActivity={onLogActivity}
              onUpdateActivity={onUpdateActivity}
              onOpenEditActivity={(act) => setEditingActivity(act)}
              onOpenDeleteActivity={(act) => setDeletingActivity(act)}
            />

            <ActivityTimelineTab activities={activities} />
          </Tabs>
        </div>

        {/* Modal: Edit Follow-Up / Activity */}
        <EditActivityDialog
          activity={editingActivity}
          open={Boolean(editingActivity)}
          onOpenChange={(open) => {
            if (!open) setEditingActivity(null);
          }}
          actionLoading={actionLoading}
          onSave={onUpdateActivity}
        />

        {/* Modal: Delete Follow-Up / Activity Confirmation */}
        <DeleteActivityDialog
          activity={deletingActivity}
          open={Boolean(deletingActivity)}
          onOpenChange={(open) => {
            if (!open) setDeletingActivity(null);
          }}
          actionLoading={actionLoading}
          onConfirmDelete={async (id) => {
            if (onDeleteActivity) {
              await onDeleteActivity(id);
            }
          }}
        />

        {/* Confirmation Dialog: Delete Opportunity */}
        <DeleteLeadDialog
          lead={lead}
          open={showDeleteLeadConfirm}
          onOpenChange={setShowDeleteLeadConfirm}
          onConfirmDelete={async (id) => {
            if (onDeleteLead) {
              await onDeleteLead(id);
              onOpenChange(false);
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

export default CRMLeadDetailSheet;
