import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, RefreshCw, Plus, Minus, Check, X } from "lucide-react";
import type { Lead, Quotation, QuotationStatus } from "@/services/crmService";
import type { Plan } from "@/services/planService";
import { TAX_RATE as CRM_TAX_RATE } from "@/constants/billing";
import { QUOTATION_STATUS_BADGES } from "@/constants/crm";
import { toast } from "sonner";

interface QuotationTabProps {
  lead: Lead;
  plans: Plan[];
  quotations: Quotation[];
  actionLoading: boolean;
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
}

export function QuotationTab({
  lead,
  plans,
  quotations,
  actionLoading,
  onSendQuotation,
  onResendQuotation,
  onUpdateQuotationStatus,
}: QuotationTabProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => lead.plan_id || plans[0]?.id || "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    () => (lead.billing_cycle as "monthly" | "annual") || "monthly",
  );
  const [equipmentCount, setEquipmentCount] = useState<number>(() => lead.equipment_count || 1);
  const [quoteNotes, setQuoteNotes] = useState<string>("");

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
    if (!currentPlan) return;
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

  return (
    <TabsContent value="quotation" className="space-y-5 pt-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          {t("crm.quotationBuilder")}
        </h4>

        {/* Plan Selection */}
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
                const name: string =
                  typeof p.name === "object" && p.name !== null
                    ? String((p.name as Record<string, string>)[isSpanish ? "es_DO" : "en_US"] || Object.values(p.name)[0] || p.id)
                    : typeof p.name === "string"
                      ? p.name
                      : String(p.id);
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
                className="cursor-pointer"
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
                className="text-center font-mono font-bold text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="cursor-pointer"
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
            <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
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

        {/* Optional Quote Notes */}
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
                      className={`text-[9px] uppercase font-mono font-bold ${
                        QUOTATION_STATUS_BADGES[quote.status] || "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {t(`crm.quotationStatus.${quote.status.toLowerCase()}`) || quote.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ${Number(quote.total || 0).toFixed(2)} • {quote.equipment_count ?? 0} {t("crm.devices")} •{" "}
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
  );
}
