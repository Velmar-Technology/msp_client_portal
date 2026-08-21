import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type { Plan } from "@/services/planService";
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

type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

interface CRMNewLeadModalProps {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card text-foreground border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-bold font-heading">
            {t("crm.newLeadTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("plans.selectCustomer")}
            </Label>
            <Select value={selectedClientId} onValueChange={handleClientChange}>
              <SelectTrigger className="w-full h-8.5 text-xs bg-background">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.contactName")} *
              </Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("crm.contactNamePlaceholder")}
                aria-invalid={Boolean(errors.contactName)}
                className="h-8.5 text-xs bg-background text-foreground"
              />
              {errors.contactName && (
                <p className="text-[10px] text-destructive">{t(errors.contactName)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.contactEmail")} *
              </Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("crm.contactEmailPlaceholder")}
                aria-invalid={Boolean(errors.contactEmail)}
                className="h-8.5 text-xs bg-background text-foreground"
              />
              {errors.contactEmail && (
                <p className="text-[10px] text-destructive">{t(errors.contactEmail)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.companyName")}
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("crm.companyNamePlaceholder")}
                className="h-8.5 text-xs bg-background text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.contactPhone")}
              </Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t("crm.contactPhonePlaceholder")}
                className="h-8.5 text-xs bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("plans.plan")}
              </Label>
              <Select value={effectivePlanId} onValueChange={setPlanId}>
                <SelectTrigger className="w-full h-8.5 text-xs bg-background">
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

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.devices")}
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={equipmentCount}
                onChange={(e) => setEquipmentCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8.5 text-xs bg-background text-foreground font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("plans.billingCycle")}
              </Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "annual")}>
                <SelectTrigger className="w-full h-8.5 text-xs bg-background font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("plans.monthly")}</SelectItem>
                  <SelectItem value="annual">{t("plans.annual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("crm.columns.priority")}
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                <SelectTrigger className="w-full h-8.5 text-xs bg-background font-mono">
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

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("crm.notes")}
            </Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("crm.notesPlaceholder")}
              className="text-xs bg-background text-foreground"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer text-xs"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="cursor-pointer text-xs font-semibold"
            >
              {loading ? t("common.saving") : t("crm.createLead")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
