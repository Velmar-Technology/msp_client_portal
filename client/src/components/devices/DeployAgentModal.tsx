import { useEffect, useState, useMemo } from "react";
import { Terminal, Loader2, Copy, Check, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { equipmentService } from "@/features/equipment";
import type { SubscriptionEquipment } from "@shared/contracts";
import { getAuthItem } from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DeployAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equip: Partial<SubscriptionEquipment> | null;
}

export function DeployAgentModal({ isOpen, onClose, equip }: DeployAgentModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [deployScriptUrl, setDeployScriptUrl] = useState<string>("");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const subId = equip?.subscription_id;
  const slotIndex = equip?.slot_index;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const wsProtocol = isHttps ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3001";
  const defaultGatewayUrl = `${wsProtocol}//${host}/agent-ws`;
  const token = equip?.otp || "dev-token";

  useEffect(() => {
    if (!isOpen || !subId || slotIndex === null || slotIndex === undefined) {
      setDeployScriptUrl("");
      return;
    }

    let isMounted = true;
    const fetchDeployUrl = async () => {
      setLoading(true);
      try {
        const url = await equipmentService.getAgentDeployScriptUrl(subId, slotIndex);
        if (isMounted) {
          setDeployScriptUrl(url);
        }
      } catch (err) {
        console.error("Failed to generate agent deploy script URL:", err);
        // Fallback to URL with stored accessToken
        if (isMounted) {
          const storedToken = getAuthItem("accessToken");
          const tokenParam = storedToken ? `?token=${encodeURIComponent(storedToken)}` : "";
          setDeployScriptUrl(
            `${origin}/api/v1/equipment/subscriptions/${subId}/slots/${slotIndex}/agent-deploy-script${tokenParam}`,
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDeployUrl();

    return () => {
      isMounted = false;
    };
  }, [isOpen, subId, slotIndex, origin]);

  const irmCommand = useMemo(() => {
    if (!deployScriptUrl) {
      const storedToken = getAuthItem("accessToken");
      const tokenParam = storedToken ? `?token=${encodeURIComponent(storedToken)}` : "";
      return `irm "${origin}/api/v1/equipment/subscriptions/${subId || ":subId"}/slots/${slotIndex ?? 0}/agent-deploy-script${tokenParam}" | iex`;
    }
    return `irm "${deployScriptUrl}" | iex`;
  }, [deployScriptUrl, origin, subId, slotIndex]);

  const msiDownloadUrl = '/uploads/binaries/msp-endpoint-suite.msi';

  const msiCommand = useMemo(() => {
    const baseOrigin = origin || 'https://helpdesk.velmartech.com.do';
    return `msiexec.exe /i "${baseOrigin}${msiDownloadUrl}" /qn GATEWAY_URL="${defaultGatewayUrl}" AGENT_TOKEN="${token}"`;
  }, [origin, defaultGatewayUrl, token]);

  const rmmCommand = useMemo(() => {
    return `powershell.exe -ExecutionPolicy Bypass -File .\\Install-MspAgent.ps1 -GatewayUrl "${defaultGatewayUrl}" -AgentToken "${token}" -Silent`;
  }, [defaultGatewayUrl, token]);

  const cliCommand = useMemo(() => {
    return `.\\msp-agent.exe --install-service --gateway "${defaultGatewayUrl}" --token "${token}"`;
  }, [defaultGatewayUrl, token]);

  const handleDownloadMsi = () => {
    window.open(msiDownloadUrl, '_blank');
  };

  const handleCopy = (text: string, tabKey: string) => {
    if (tabKey === "irm" && loading) {
      toast.info(t("devices.deployCommandGenerating", "Generating secure deployment token..."));
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedTab(tabKey);
    toast.success(t("devices.deployCommandCopied") || "Deployment command copied to clipboard!");
    setTimeout(() => setCopiedTab(null), 2500);
  };

  const handleDownloadScript = () => {
    if (deployScriptUrl) {
      window.open(deployScriptUrl, "_blank");
    } else {
      toast.error(t("devices.deployCommandFailed") || "Download URL unavailable");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-card text-foreground border border-border shadow-xl p-0 gap-0 overflow-hidden rounded-xl">
        {/* Header with Subtle Tonal Contrast */}
        <div className="p-4 sm:p-5 bg-muted/40 border-b border-border">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-cyan-50 dark:bg-cyan-500/10 p-1.5 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
                  <Terminal className="h-4 w-4" />
                </div>
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  {t("devices.deployAgentTitle", "Deploy MSP Endpoint Agent")}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "devices.deployAgentDesc",
                "Seamless 1-line installation for background telemetry, SMBIOS hardware audit, and remote remediation.",
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Slot Metadata Panel */}
          <div className="mt-3.5 grid grid-cols-6 gap-2.5 p-2.5 bg-card rounded-md border border-border text-[11px]">
            <div className="min-w-0 col-span-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                {t("devices.tableSlot", "Slot")}
              </span>
              <span className="font-bold text-foreground">
                #{equip?.slot_index !== undefined ? equip.slot_index + 1 : 1}
              </span>
            </div>
            <div className="min-w-0 col-span-3">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                {t("devices.deviceName", "Device")}
              </span>
              <span className="font-medium text-foreground truncate block">
                {equip?.device_name || equip?.agent_hostname || "Auto-detected"}
              </span>
            </div>
            <div className="min-w-0 col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                {t("devices.serialNumber", "Serial Number")}
              </span>
              <span className="font-medium text-foreground truncate block">
                {equip?.device_serial || equip?.agent_serial || "Auto-detected"}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <Tabs defaultValue="irm" className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-8 bg-muted p-0.5 rounded-lg border border-border">
              <TabsTrigger value="irm" className="text-xs font-semibold h-7 cursor-pointer">
                {t("devices.tabIrmOneLiner", "PowerShell 1-Liner")}
              </TabsTrigger>
              <TabsTrigger value="rmm" className="text-xs font-semibold h-7 cursor-pointer">
                {t("devices.tabRmmSilent", "Intune / GPO / RMM")}
              </TabsTrigger>
              <TabsTrigger value="cli" className="text-xs font-semibold h-7 cursor-pointer">
                {t("devices.tabManualCli", "Manual Binary CLI")}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: IRM / IEX One-Liner */}
            <TabsContent value="irm" className="space-y-3 mt-3.5 focus-visible:outline-hidden">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "devices.irmInstruction",
                  "Open an elevated Administrator PowerShell prompt on the target machine and run:",
                )}
              </p>

              <div className="relative group bg-muted/80 rounded-lg border border-border p-3 font-mono text-xs text-foreground shadow-xs">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-xs">
                      {t("common.loading", "Generating secure one-time deployment URL...")}
                    </span>
                  </div>
                ) : (
                  <code className="block break-all select-all pr-10 text-[11.5px] leading-relaxed text-foreground font-mono">
                    {irmCommand}
                  </code>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => handleCopy(irmCommand, "irm")}
                  className="absolute top-2 right-2 h-7 w-7 border border-border cursor-pointer shadow-xs"
                  aria-label={t("common.copy", "Copy Command")}
                >
                  {copiedTab === "irm" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Intune / GPO / RMM Silent */}
            <TabsContent value="rmm" className="space-y-3.5 mt-3.5 focus-visible:outline-hidden">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "devices.rmmInstruction",
                  "For silent mass rollouts via Microsoft Intune, Group Policy, NinjaOne, or Datto RMM:",
                )}
              </p>

              {/* 1. MSI Package Deployment (Recommended) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {t("devices.msiSilentTitle", "1. Windows Installer MSI (Intune / GPO / Silent)")}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-semibold">
                    .msi
                  </span>
                </div>
                <div className="relative group bg-muted/80 rounded-lg border border-border p-3 font-mono text-xs text-foreground shadow-xs">
                  <code className="block break-all select-all pr-10 text-[11.5px] leading-relaxed text-foreground font-mono">
                    {msiCommand}
                  </code>

                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => handleCopy(msiCommand, "msi")}
                    className="absolute top-2 right-2 h-7 w-7 border border-border cursor-pointer shadow-xs"
                    aria-label={t("common.copy", "Copy Command")}
                  >
                    {copiedTab === "msi" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 2. PowerShell Script (RMM) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("devices.psSilentTitle", "2. PowerShell Script (RMM / NinjaOne / Datto)")}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-semibold">
                    .ps1
                  </span>
                </div>
                <div className="relative group bg-muted/80 rounded-lg border border-border p-2.5 font-mono text-xs text-foreground shadow-xs">
                  <code className="block break-all select-all pr-10 text-[11px] leading-relaxed text-foreground font-mono">
                    {rmmCommand}
                  </code>

                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => handleCopy(rmmCommand, "rmm")}
                    className="absolute top-2 right-2 h-6 w-6 border border-border cursor-pointer shadow-xs"
                    aria-label={t("common.copy", "Copy Command")}
                  >
                    {copiedTab === "rmm" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Direct MSI Download in Tab 2 */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {t("devices.downloadMsiDirect", "Need the enterprise MSI package for Intune/GPO?")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadMsi}
                  className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t("devices.downloadMsiBtn", "Download MSI Bundle (.msi)")}</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: Manual Binary CLI */}
            <TabsContent value="cli" className="space-y-3 mt-3.5 focus-visible:outline-hidden">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "devices.cliInstruction",
                  "If running the standalone executable directly from command line (Command Prompt / PowerShell):",
                )}
              </p>

              <div className="relative group bg-muted/80 rounded-lg border border-border p-3 font-mono text-xs text-foreground shadow-xs">
                <code className="block break-all select-all pr-10 text-[11.5px] leading-relaxed text-foreground font-mono">
                  {cliCommand}
                </code>

                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => handleCopy(cliCommand, "cli")}
                  className="absolute top-2 right-2 h-7 w-7 border border-border cursor-pointer shadow-xs"
                  aria-label={t("common.copy", "Copy Command")}
                >
                  {copiedTab === "cli" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {t("devices.downloadBinaryDirect", "Need the standalone msp-agent.exe?")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/uploads/binaries/msp-agent.exe", "_blank")}
                  className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t("devices.downloadBinaryBtn", "Download msp-agent.exe")}</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer with standard buttons and height */}
        <DialogFooter className="p-3 bg-muted/40 border-t border-border flex items-center justify-between sm:justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadMsi}
              className="h-7 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("devices.downloadMsiBtn", "Download MSI Bundle (.msi)")}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadScript}
              disabled={loading || !deployScriptUrl}
              className="h-7 px-3 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("devices.downloadPs1Btn", "Download Script (.ps1)")}</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs font-semibold cursor-pointer"
          >
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
