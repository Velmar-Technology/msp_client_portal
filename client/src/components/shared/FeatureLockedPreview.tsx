import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Laptop,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURE_CODES, type FeatureCode } from "@/constants/subscriptions";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";
import { useEntitlements } from "@/hooks/useEntitlements";

interface FeatureMetadata {
  icon: LucideIcon;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  tierKey: string;
  defaultTier: string;
  perks: { key: string; defaultText: string }[];
}

const FEATURE_METADATA_MAP: Record<string, FeatureMetadata> = {
  [FEATURE_CODES.CAF_EDUCATION_AGENT]: {
    icon: Sparkles,
    titleKey: "featureLocked.cafEducation.title",
    defaultTitle: "Agente de Calidad Educativa CAF & AIaaS",
    descKey: "featureLocked.cafEducation.desc",
    defaultDesc:
      "Autoevaluación continua bajo los 9 criterios del modelo CAF, filtro de privacidad en memoria Ley 172-13 y generación automática del Plan de Mejora Institucional (PMI).",
    tierKey: "featureLocked.cafEducation.tier",
    defaultTier: "Plan Pro CAF o Enterprise",
    perks: [
      { key: "featureLocked.cafEducation.perk1", defaultText: "Auditoría autónoma de los 9 criterios CAF con matriz FODA" },
      { key: "featureLocked.cafEducation.perk2", defaultText: "Sanitización en memoria de PII bajo Ley 172-13 (Cédula, RNC, Matrícula)" },
      { key: "featureLocked.cafEducation.perk3", defaultText: "Bring-Your-Own-Key para OpenAI, Anthropic o modelos locales" },
      { key: "featureLocked.cafEducation.perk4", defaultText: "Conexión remota cero-secreto para Claude Desktop y Cursor" },
    ],
  },
  [FEATURE_CODES.PASSWORD_MANAGER]: {
    icon: KeyRound,
    titleKey: "featureLocked.passwordManager.title",
    defaultTitle: "Enterprise Password Manager",
    descKey: "featureLocked.passwordManager.desc",
    defaultDesc:
      "Zero-knowledge encrypted password and secret vault powered by Bitwarden/Vaultwarden. Store, generate, and securely share credentials across your team.",
    tierKey: "featureLocked.passwordManager.tier",
    defaultTier: "Advanced Plan (PL-003) or Corporate (PL-004)",
    perks: [
      { key: "featureLocked.passwordManager.perk1", defaultText: "AES-256 zero-knowledge end-to-end encryption" },
      { key: "featureLocked.passwordManager.perk2", defaultText: "Personal and shared organizational collections" },
      { key: "featureLocked.passwordManager.perk3", defaultText: "Self-service vault access recovery and reset" },
    ],
  },
  [FEATURE_CODES.RMM_PATCH_MANAGEMENT]: {
    icon: Laptop,
    titleKey: "featureLocked.rmm.title",
    defaultTitle: "Remote Monitoring & Patch Management",
    descKey: "featureLocked.rmm.desc",
    defaultDesc:
      "Automated telemetry tracking, Windows update patching, and remote execution across all corporate assets.",
    tierKey: "featureLocked.rmm.tier",
    defaultTier: "Basic Plan (PL-001) or higher",
    perks: [
      { key: "featureLocked.rmm.perk1", defaultText: "Real-time hardware performance and agent telemetry" },
      { key: "featureLocked.rmm.perk2", defaultText: "Automated security updates and patch scheduling" },
      { key: "featureLocked.rmm.perk3", defaultText: "Proactive maintenance logs and diagnostic telemetry" },
    ],
  },
  [FEATURE_CODES.CLOUD_STORAGE]: {
    icon: HardDrive,
    titleKey: "featureLocked.storage.title",
    defaultTitle: "Cloud Storage & Resource Sync",
    descKey: "featureLocked.storage.desc",
    defaultDesc:
      "Dedicated Nextcloud enterprise cloud storage with collaborative synchronization and automated backup storage.",
    tierKey: "featureLocked.storage.tier",
    defaultTier: "Basic Plan (PL-001) or higher",
    perks: [
      { key: "featureLocked.storage.perk1", defaultText: "25 GB to 100 GB dedicated Nextcloud storage" },
      { key: "featureLocked.storage.perk2", defaultText: "Encrypted desktop and mobile sync" },
      { key: "featureLocked.storage.perk3", defaultText: "Direct software resource catalog downloads" },
    ],
  },
};

export interface FeatureLockedPreviewProps {
  requiredFeature: FeatureCode;
  className?: string;
}

/**
 * High-conversion preview banner displayed when a client attempts to access
 * an unentitled feature page. Explains the feature value and provides a direct upgrade CTA.
 */
export function FeatureLockedPreview({ requiredFeature, className = "" }: FeatureLockedPreviewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getRequiredTierForFeature } = useEntitlements();

  const catalogItem = FEATURE_CATALOG.find((item) => item.code === requiredFeature);

  const meta = FEATURE_METADATA_MAP[requiredFeature] || {
    icon: ShieldCheck,
    titleKey: catalogItem?.labelKey || "featureLocked.default.title",
    defaultTitle: catalogItem?.code ? catalogItem.code.replace(/_/g, " ") : "Premium Service Feature",
    descKey: "featureLocked.default.desc",
    defaultDesc: "This feature is available on qualifying MSP subscription tiers.",
    tierKey: "featureLocked.default.tier",
    defaultTier: "Qualifying Service Plan",
    perks: [
      { key: "featureLocked.default.perk1", defaultText: "Priority resolution and guaranteed SLA response" },
      { key: "featureLocked.default.perk2", defaultText: "Enterprise security and continuous monitoring" },
    ],
  };

  const Icon = meta.icon;
  const targetPlanId = getRequiredTierForFeature(requiredFeature);

  const handleUpgrade = () => {
    navigate(`/plans?highlight=${targetPlanId}`);
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div
      data-testid="feature-locked-preview"
      className={`min-h-[70vh] flex items-center justify-center p-4 sm:p-6 ${className}`}
    >
      <Card className="max-w-xl w-full border-border/80 bg-card/60 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs py-0.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("featureLocked.badge", "Plan Upgrade Required")}
            </Badge>
          </div>

          <CardTitle className="text-xl font-bold text-foreground">
            {t(meta.titleKey, meta.defaultTitle)}
          </CardTitle>

          <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {t(meta.descKey, meta.defaultDesc)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 pb-4">
          <div className="rounded-lg bg-muted/40 p-3.5 border border-border/50">
            <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{t("featureLocked.whatsIncluded", "What you unlock with this feature:")}</span>
            </div>

            <ul className="space-y-2">
              {meta.perks.map((perk, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t(perk.key, perk.defaultText)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            <span>{t("featureLocked.availableOn", "Available on:")} </span>
            <span className="font-medium text-foreground">{t(meta.tierKey, meta.defaultTier)}</span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="w-full sm:w-auto h-7 text-xs gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t("featureLocked.backToDashboard", "Return to Dashboard")}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleUpgrade}
            className="w-full sm:w-auto h-7 text-xs gap-1.5 cursor-pointer font-medium"
          >
            {t("featureLocked.viewPlans", "View Plans & Upgrade")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
