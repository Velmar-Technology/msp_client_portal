import React from "react";
import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, Minus, Plus, Ban } from "lucide-react";
import type { Lead } from "@/services/crmService";
import type { Subscription } from "@/services/subscriptionService";

interface SubscriptionTabProps {
  lead: Lead;
  customerSubscriptions: Subscription[];
  actionLoading: boolean;
  onConvertClick: () => void;
  onModifySubscription: (subId: string, planId: string, count: number) => Promise<void>;
  onCancelSubscription?: (subId: string) => Promise<void>;
  onRequestCancelSubscription?: (subId: string) => void;
}

export function SubscriptionTab({
  lead,
  customerSubscriptions,
  actionLoading,
  onConvertClick,
  onModifySubscription,
  onCancelSubscription,
  onRequestCancelSubscription,
}: SubscriptionTabProps) {
  const { t } = useTranslation();

  const handleCancelSub = (subId: string) => {
    if (onRequestCancelSubscription) {
      onRequestCancelSubscription(subId);
    } else if (onCancelSubscription) {
      onCancelSubscription(subId).catch((err: unknown) => {
        console.error("Failed to cancel subscription", err);
      });
    }
  };

  return (
    <TabsContent value="subscription" className="space-y-5 pt-4">
      {/* Apply Plan to Customer Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          {t("plans.applyPlanToCustomer")}
        </h4>
        <p className="text-xs text-muted-foreground leading-normal">{t("crm.applyPlanHelp")}</p>
        {lead.stage !== "WON" && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
            <span>{t("crm.mustBeWonToActivate") || "The lead must be in the WON stage to activate a subscription."}</span>
          </div>
        )}
        <Button
          onClick={onConvertClick}
          disabled={actionLoading || lead.stage !== "WON"}
          title={lead.stage !== "WON" ? t("crm.mustBeWonToActivate") : undefined}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
