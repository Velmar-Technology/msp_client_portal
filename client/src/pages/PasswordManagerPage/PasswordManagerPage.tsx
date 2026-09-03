import { useState } from "react";
import {
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Globe,
  Laptop,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { systemService } from "@/services/systemService";

export function PasswordManagerPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Custom subpath server URL for Bitwarden clients
  const vaultUrl = `${window.location.origin}/vault/`;

  const copyServerUrl = () => {
    navigator.clipboard.writeText(vaultUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetVault = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      const res = await systemService.resetVaultAccess();
      toast.success(t("passwordManager.resetSuccessTitle", "Invitation Dispatched"), {
        description:
          res.message ||
          t(
            "passwordManager.resetSuccessDesc",
            "A fresh Bitwarden invitation email has been sent. Please check your inbox to set a new Master Password."
          ),
      });
      setIsDialogOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to reset vault access";
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const extensionLinks = [
    {
      name: "Google Chrome / Brave",
      icon: Globe,
      url: "https://chromewebstore.google.com/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb",
    },
    {
      name: "Microsoft Edge",
      icon: Globe,
      url: "https://microsoftedge.microsoft.com/addons/detail/bitwarden-free-password/jbkfoedolllekgbhcbcoahefnbanhhlh",
    },
    {
      name: "Mozilla Firefox",
      icon: Globe,
      url: "https://addons.mozilla.org/en-US/firefox/addon/bitwarden-password-manager/",
    },
    {
      name: "Apple iOS (App Store)",
      icon: Smartphone,
      url: "https://apps.apple.com/app/bitwarden-password-manager/id1137397744",
    },
    {
      name: "Google Play (Android)",
      icon: Smartphone,
      url: "https://play.google.com/store/apps/details?id=com.x8bit.bitwarden",
    },
    {
      name: "Windows Desktop App",
      icon: Laptop,
      url: "https://vault.bitwarden.com/download/?app=desktop&platform=windows",
    },
  ];

  return (
    <Page
      title={t("passwordManager.pageTitle", "Password Manager")}
      subtitle={t("passwordManager.pageDescription", "Enterprise zero-knowledge password vault for your team.")}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Hero Vault Access Card */}
        <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-card to-card p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                <KeyRound className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-heading text-foreground">
                    {t("passwordManager.vaultTitle", "Hosted Vaultwarden Enterprise")}
                  </h2>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {t("passwordManager.activeStatus", "Active & Zero-Knowledge")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "passwordManager.vaultSubtitle",
                    "Your organization's encrypted vault is active. Master passwords are never shared or stored on our servers."
                  )}
                </p>
              </div>
            </div>

            <Button
              asChild
              className="h-8 gap-1.5 px-4 font-semibold text-xs shrink-0"
            >
              <a href={vaultUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("passwordManager.launchVault", "Open Web Vault")}
              </a>
            </Button>
          </div>

          {/* Quick Copy Server URL */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{t("passwordManager.serverUrlLabel", "Custom Server URL:")}</span>{" "}
              <code className="bg-muted px-2 py-0.5 rounded font-mono text-[11px] text-foreground border border-border">
                {vaultUrl}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyServerUrl}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("passwordManager.copied", "Copied!") : t("passwordManager.copyUrl", "Copy Server URL")}
            </Button>
          </div>
        </Card>

        {/* Setup Instructions & Extensions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Setup Guide */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold font-heading">
                {t("passwordManager.setupGuideTitle", "How to Connect Your Apps")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("passwordManager.setupGuideDesc", "Configure official Bitwarden browser extensions and mobile apps in 3 steps.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                  1
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{t("passwordManager.step1Title", "Install Extension or App:")}</strong>{" "}
                  {t("passwordManager.step1Text", "Download the official Bitwarden extension or app for your devices.")}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                  2
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{t("passwordManager.step2Title", "Set Custom Server:")}</strong>{" "}
                  {t(
                    "passwordManager.step2Text",
                    "On the login screen, click the Settings Gear icon and set Server URL to:"
                  )}{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
                    {vaultUrl}
                  </code>
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                  3
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{t("passwordManager.step3Title", "Accept Invite & Login:")}</strong>{" "}
                  {t("passwordManager.step3Text", "Click the invitation link sent to your email to create your Master Password and join your company vault.")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Download Official Clients */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold font-heading">
                {t("passwordManager.clientsTitle", "Official Bitwarden Clients")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("passwordManager.clientsDesc", "Compatible with all official Bitwarden extensions, mobile, and desktop apps.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {extensionLinks.map((ext) => (
                <a
                  key={ext.name}
                  href={ext.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/70 transition-colors border border-transparent hover:border-border text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <ext.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-foreground">{ext.name}</span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Trouble Logging In / Reset Vault Access */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-bold font-heading">
                    {t("passwordManager.troubleTitle", "Trouble Logging In?")}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {t(
                    "passwordManager.troubleDesc",
                    "Lost your Master Password? Learn how recovery works in a zero-knowledge architecture."
                  )}
                </CardDescription>
              </div>

              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-7 text-xs font-medium gap-1.5 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 text-foreground cursor-pointer shrink-0"
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {t("passwordManager.resetButton", "Reset Vault Access")}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-sm font-bold">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      {t("passwordManager.resetDialogTitle", "Reset Vault Access & Re-Invite")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground space-y-2 text-left pt-2" asChild>
                      <div>
                        <p>
                          {t(
                            "passwordManager.resetDialogDesc",
                            "Are you sure you want to reset your vault access? Your current locked account will be purged and a fresh invitation email will be dispatched immediately."
                          )}
                        </p>
                        <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-destructive font-medium text-[11px] leading-relaxed">
                          {t(
                            "passwordManager.resetDialogWarning",
                            "Warning: Any personal, unshared passwords stored in your locked vault will be permanently lost. All company organization collections will remain unaffected."
                          )}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-7 text-xs" disabled={isResetting}>
                      {t("passwordManager.resetDialogCancel", "Cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetVault}
                      disabled={isResetting}
                      className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isResetting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      {t("passwordManager.resetDialogConfirm", "Yes, Reset & Send Invite")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1">
              <span className="font-semibold text-foreground text-[11px] block">
                {t("passwordManager.zeroKnowledgeNoticeTitle", "Zero-Knowledge Security Policy")}
              </span>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t(
                  "passwordManager.zeroKnowledgeNoticeDesc",
                  "Because your vault is end-to-end encrypted, administrators cannot view or recover your Master Password. If you are locked out, resetting your vault will permanently delete your unshared private items, but all shared company collections (IT, Finance, Operations) will remain safe."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

export default PasswordManagerPage;

