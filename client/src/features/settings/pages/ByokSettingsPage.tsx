import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FeatureLockedPreview } from "@/components/shared/FeatureLockedPreview";
import { FEATURE_CODES } from "@/constants/subscriptions";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useUrlState } from "@/hooks/useUrlState";
import { useTenantByokStatus, useSaveTenantByok, useTestByokConnection } from "../api/byok";
import type { ByokProvider } from "@shared/contracts";

export function ByokSettingsPage() {
  const { t } = useTranslation();
  const { isFeatureLocked } = useEntitlements();
  const { getParam, setParam } = useUrlState();
  const [activeTab, setActiveTab] = useState(() => getParam("tab") || "web-config");

  const isLocked = isFeatureLocked(FEATURE_CODES.CAF_EDUCATION_AGENT);

  const { data: byokStatus, isLoading: isStatusLoading } = useTenantByokStatus({
    enabled: !isLocked,
  });
  const saveMutation = useSaveTenantByok();
  const testMutation = useTestByokConnection();

  const [provider, setProvider] = useState<ByokProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlTab = getParam("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [getParam, activeTab]);

  // Initialize form from current status
  useEffect(() => {
    if (byokStatus?.isConfigured) {
      setProvider(byokStatus.provider);
      if (byokStatus.model) setModel(byokStatus.model);
      if (byokStatus.baseUrl) setBaseUrl(byokStatus.baseUrl);
    }
  }, [byokStatus]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setParam("tab", val);
  };

  // Entitlement guard per BL-204
  if (isLocked) {
    return <FeatureLockedPreview requiredFeature={FEATURE_CODES.CAF_EDUCATION_AGENT} />;
  }

  const handleProviderChange = (val: ByokProvider) => {
    setProvider(val);
    setTestResult(null);
    if (val === "openai") {
      setModel("gpt-4o");
      setBaseUrl("");
    } else if (val === "anthropic") {
      setModel("claude-3-5-sonnet-20241022");
      setBaseUrl("");
    } else if (val === "custom") {
      setModel("");
      setBaseUrl("http://localhost:11434/v1");
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error(t("byok.keyRequired", "Please enter an API key to test"));
      return;
    }

    try {
      const res = await testMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });

      setTestResult({
        success: res.success,
        latencyMs: res.latencyMs,
        message: res.message,
      });

      if (res.success) {
        toast.success(t("byok.testSuccess", "Connection verified successfully!"));
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Connection test failed",
      });
      toast.error(err?.message || "Connection test failed");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error(t("byok.keyRequired", "API key is required"));
      return;
    }

    try {
      await saveMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });
      toast.success(t("byok.saveSuccess", "Credentials encrypted and saved!"));
      setApiKey(""); // clear plain input after saving
      setShowKey(false);
      setTestResult(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save configuration");
    }
  };

  const desktopConfigJson = JSON.stringify(
    {
      mcpServers: {
        "caf-quality-agent": {
          url: "https://helpdesk.velmartech.com.do/mcp/caf",
          headers: {
            "X-Tenant-Id": byokStatus?.tenantId || "<your-tenant-id>",
          },
        },
      },
    },
    null,
    2,
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(desktopConfigJson);
    setCopied(true);
    toast.success(t("byok.copied", "Copied to clipboard!"));
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {t("byok.pageTitle", "Inteligencia Artificial & Calidad CAF")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "byok.pageDesc",
              "Configure su propia clave de API (OpenAI o Anthropic). Sus datos están protegidos bajo la Ley 172-13 con anonimización en memoria.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStatusLoading ? (
            <Badge variant="secondary" className="h-7">
              {t("common.loading", "Cargando...")}
            </Badge>
          ) : byokStatus?.isConfigured ? (
            <Badge variant="default" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("byok.statusConfigured", "Configurado:")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-7 gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
            >
              <XCircle className="h-3.5 w-3.5" />
              {t("byok.statusPending", "Sin Configurar")}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-9">
          <TabsTrigger value="web-config" className="text-xs">
            {t("byok.tabWeb", "Configuración Web")}
          </TabsTrigger>
          <TabsTrigger value="desktop-mcp" className="text-xs">
            {t("byok.tabDesktop", "Claude Desktop / Cursor")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Web Portal Configuration */}
        <TabsContent value="web-config" className="space-y-4 pt-2">
          <Card>
            <form onSubmit={handleSaveConfig}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  {t("byok.formTitle", "Credenciales del Centro Educativo")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    "byok.formDesc",
                    "Velmar Technology nunca le cobrará por el consumo de tokens. El consumo se factura directamente a la cuenta de su institución en OpenAI o Anthropic.",
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Provider Selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="byok-provider" className="text-xs font-medium">
                      {t("byok.providerLabel", "Proveedor de Inteligencia Artificial")}
                    </Label>
                    <Select value={provider} onValueChange={(val) => handleProviderChange(val as ByokProvider)}>
                      <SelectTrigger id="byok-provider" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="custom">Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="byok-model" className="text-xs font-medium">
                      {t("byok.modelLabel", "Modelo a Ejecutar")}
                    </Label>
                    <Input
                      id="byok-model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. gpt-4o"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Base URL for Custom */}
                {provider === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="byok-baseurl" className="text-xs font-medium">
                      {t("byok.baseUrlLabel", "URL Base del Servidor Local / Proxy")}
                    </Label>
                    <Input
                      id="byok-baseurl"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434/v1"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                )}

                {/* API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="byok-key" className="text-xs font-medium">
                      {t("byok.apiKeyLabel", "Clave Secreta de API (API Key)")}
                    </Label>
                    {byokStatus?.isConfigured && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {t("byok.currentKey", "Actual:")} {byokStatus.keyMasked}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="byok-key"
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder={
                        byokStatus?.isConfigured
                          ? "•••••••••••••••••••••••••••••••• (Ingrese nueva para cambiar)"
                          : provider === "openai"
                            ? "sk-proj-..."
                            : "sk-ant-..."
                      }
                      className="h-7 text-xs font-mono pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Test Feedback */}
                {testResult && (
                  <Alert variant={testResult.success ? "default" : "destructive"} className="py-2 px-3 text-xs">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <div>
                        <AlertTitle className="text-xs font-semibold">
                          {testResult.success
                            ? t("byok.testSuccessTitle", "Conexión Exitosa")
                            : t("byok.testFailTitle", "Error de Validación")}
                          {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
                        </AlertTitle>
                        <AlertDescription className="text-[11px]">{testResult.message}</AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Privacy Badge Guarantee */}
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 text-muted-foreground text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {t(
                      "byok.privacyNotice",
                      "Garantía Ley 172-13: Su clave se cifra con AES-256-GCM en el servidor. Todas las peticiones son anonimizadas localmente antes de enviarse al proveedor.",
                    )}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending || !apiKey.trim()}
                  className="h-7 text-xs"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1" />
                  {testMutation.isPending ? t("byok.testing", "Probando...") : t("byok.testBtn", "Probar Conexión")}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={saveMutation.isPending || !apiKey.trim()}
                  className="h-7 text-xs"
                >
                  {saveMutation.isPending
                    ? t("byok.saving", "Guardando...")
                    : t("byok.saveBtn", "Guardar Credenciales")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 2: Desktop MCP Zero-Secret Setup */}
        <TabsContent value="desktop-mcp" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                {t("byok.mcpSetupTitle", "Conexión de Escritorio (Cero-Secreto)")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t(
                  "byok.mcpSetupDesc",
                  "Configure Claude Desktop o Cursor para auditar documentos CAF directamente desde su entorno de trabajo. ¡Nunca coloque sus claves maestras de OpenAI en archivos JSON locales!",
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>
                  {t("byok.mcpStep1Prefix", "1. Abra el archivo de configuración de Claude Desktop (")}
                  <code className="text-[11px] bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>
                  {t("byok.mcpStep1Suffix", ").")}
                </p>
                <p>
                  {t(
                    "byok.mcpStep2",
                    "2. Pegue el siguiente bloque pre-autenticado con el identificador de su centro:",
                  )}
                </p>
              </div>

              <div className="relative">
                <pre className="p-3 bg-muted text-foreground rounded-md text-xs font-mono overflow-x-auto border border-border">
                  {desktopConfigJson}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyJson}
                  className="absolute top-2 right-2 h-6 px-2 text-[11px] gap-1"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? t("common.copied", "Copied") : t("common.copy", "Copy")}
                </Button>
              </div>

              <div className="p-2.5 rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 text-xs">
                <p className="font-semibold mb-0.5">
                  🛡️ {t("byok.zeroSecretGuarantee", "Garantía de Seguridad Cero-Secreto:")}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {t(
                    "byok.zeroSecretDetail",
                    "El servidor MCP de Velmar resuelve su clave de API cifrada bajo demanda utilizando la conexión web de arriba. Si cambia de clave o revoca accesos, se actualiza automáticamente sin tocar su computadora.",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
