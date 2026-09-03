import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  UserPlus,
  Building2,
  SlidersHorizontal,
  FileText,
  X,
  UserCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/features/subscriptions";
import type { AuthUser } from "@/store/useAuthStore";
import type { LeadPriority } from "@/services/crmService";

const createLeadSchema = z.object({
  clientId: z.string().uuid().optional(),
  contactName: z.string().min(1, "crm.validation.contactNameRequired").max(255),
  contactEmail: z.string().email("crm.validation.contactEmailInvalid").max(255),
  contactPhone: z.string().max(50).optional(),
  companyName: z.string().max(255).optional(),
  planId: z.string().min(1, "crm.validation.planRequired"),
  equipmentCount: z.coerce.number().int().min(1).max(500),
  billingCycle: z.enum(["monthly", "annual"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().optional(),
});

export type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

export interface CRMNewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  clients: AuthUser[];
  onSubmit: (data: CreateLeadFormValues) => Promise<void>;
}

export function CRMNewLeadModal({
  open,
  onOpenChange,
  plans,
  clients,
  onSubmit,
}: CRMNewLeadModalProps) {
  const { t } = useTranslation();

  const [selectedClientId, setSelectedClientId] = useState<string>("custom");
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [equipmentCount, setEquipmentCount] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [priority, setPriority] = useState<LeadPriority>("MEDIUM");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectivePlanId = planId || plans[0]?.id || "";

  const handleClientChange = (clientId: string): void => {
    setSelectedClientId(clientId);
    if (clientId !== "custom") {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        setContactName(client.name);
        setContactEmail(client.email);
      }
    }
  };

  const resetForm = (): void => {
    setSelectedClientId("custom");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setCompanyName("");
    setNotes("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = createLeadSchema.safeParse({
      clientId: selectedClientId !== "custom" ? selectedClientId : undefined,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || undefined,
      companyName: companyName.trim() || undefined,
      planId: effectivePlanId,
      equipmentCount,
      billingCycle,
      priority,
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(parsed.data);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-lg md:max-w-xl h-full p-0 flex flex-col bg-background text-foreground border-l border-border shadow-2xl overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-lg data-[side=right]:md:max-w-xl"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border flex flex-row justify-between items-center bg-zinc-50/70 dark:bg-zinc-900/40 space-y-0 text-left shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <UserPlus className="size-3.5" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                {t("crm.newLeadTitle")}
              </SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground">
                {t("crm.newLeadSubtitle")}
              </SheetDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer text-muted-foreground hover:text-foreground rounded-md"
            aria-label={t("common.close")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </SheetHeader>

        {/* Form Body with Flat Semantic Sections & Hairline Dividers */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" noValidate>
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Section 1: Prospect & Account Association */}
            <section aria-label={t("crm.accountAssociation")} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  {t("crm.accountAssociation")}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="crm-client-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("plans.selectCustomer")}
                </Label>
                <Select value={selectedClientId} onValueChange={handleClientChange}>
                  <SelectTrigger id="crm-client-select" size="lg" className="w-full text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{t("crm.unregisteredProspect")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Section 2: Contact & Company Details */}
            <section aria-label={t("crm.contactDetails")} className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {t("crm.contactDetails")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-1">
                  <Label htmlFor="crm-contact-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.contactName")} *
                  </Label>
                  <Input
                    id="crm-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t("crm.contactNamePlaceholder")}
                    aria-invalid={Boolean(errors.contactName)}
                    className="h-8 text-xs"
                  />
                  {errors.contactName && (
                    <p className="text-[10px] text-destructive font-medium">{t(errors.contactName)}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="crm-contact-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.contactEmail")} *
                  </Label>
                  <Input
                    id="crm-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t("crm.contactEmailPlaceholder")}
                    aria-invalid={Boolean(errors.contactEmail)}
                    className="h-8 text-xs"
                  />
                  {errors.contactEmail && (
                    <p className="text-[10px] text-destructive font-medium">{t(errors.contactEmail)}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-1">
                  <Label htmlFor="crm-company-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.companyName")}
                  </Label>
                  <Input
                    id="crm-company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("crm.companyNamePlaceholder")}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="crm-contact-phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.contactPhone")}
                  </Label>
                  <Input
                    id="crm-contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t("crm.contactPhonePlaceholder")}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Plan & Sizing Specifications */}
            <section aria-label={t("crm.opportunitySpecs")} className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  {t("crm.opportunitySpecs")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="crm-plan-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("plans.plan")} *
                  </Label>
                  <Select value={effectivePlanId} onValueChange={setPlanId}>
                    <SelectTrigger id="crm-plan-select" size="lg" className="w-full text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {typeof p.name === "object" && p.name !== null
                            ? p.name.en_US || p.name.es_DO || Object.values(p.name)[0]
                            : p.name || p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="crm-devices-count" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.devices")}
                  </Label>
                  <Input
                    id="crm-devices-count"
                    type="number"
                    min={1}
                    max={500}
                    value={equipmentCount}
                    onChange={(e) => setEquipmentCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="font-mono text-xs h-8"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="crm-billing-cycle" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("plans.billingCycle")}
                  </Label>
                  <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "annual")}>
                    <SelectTrigger id="crm-billing-cycle" size="lg" className="w-full text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t("plans.monthly")}</SelectItem>
                      <SelectItem value="annual">{t("plans.annual")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="crm-priority-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("crm.columns.priority")}
                  </Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                    <SelectTrigger id="crm-priority-select" size="lg" className="w-full text-xs font-medium">
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
            </section>

            {/* Section 4: Internal Notes & Requirements */}
            <section aria-label={t("crm.opportunityNotes")} className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {t("crm.opportunityNotes")}
                </span>
              </div>

              <div className="space-y-1">
                <Textarea
                  id="crm-notes-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("crm.notesPlaceholder")}
                  className="text-xs bg-background text-foreground resize-none min-h-[64px]"
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-3.5 border-t border-border flex flex-row justify-end items-center gap-2 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0 mt-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs font-semibold cursor-pointer shadow-xs"
            >
              {loading ? t("common.saving") : t("crm.createLead")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default CRMNewLeadModal;
