import { useTranslation } from "react-i18next";
import { Building2, User, Bell, Sparkles, KeyRound, Globe, Shield } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader, ListGroup, ListItem } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUrlState } from "@/hooks/useUrlState";
import { RoleBadge, TenantBadge } from "@/features/base";
import { useEntitlements } from "@/hooks/useEntitlements";
import { FEATURE_CODES } from "@/constants/subscriptions";

/**
 * Modern Unified Settings Hub (ADR-016 / ADR-019).
 * Consolidates profile, workspace, notifications, and AI configuration into
 * Cal.com PageShell and ListGroup architecture without legacy wrappers.
 *
 * @see ADR-016
 * @see ADR-017
 * @see ADR-019
 */
export function SettingsHubPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { hasFeature } = useEntitlements();
  const { getParam, setParam } = useUrlState();

  const activeTab = getParam("tab", "general");
  const hasByok = hasFeature(FEATURE_CODES.CAF_EDUCATION_AGENT);

  const tabs = [
    { id: "general", label: t("settings.tabs.general", "General"), icon: Building2 },
    { id: "profile", label: t("settings.tabs.profile", "Profile"), icon: User },
    { id: "notifications", label: t("settings.tabs.notifications", "Notifications"), icon: Bell },
    ...(hasByok ? [{ id: "ai", label: t("settings.tabs.ai", "AI / BYOK"), icon: Sparkles }] : []),
  ];

  return (
    <PageShell
      variant="constrained"
      title={t("nav.settings", "Settings")}
      subtitle={t("settings.description", "Manage workspace defaults, user profile, and operational parameters.")}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setParam("tab", tab)}
      syncUrl
      tabParamKey="tab"
    >
      {/* ---- TAB 1: General Workspace Settings ---- */}
      {activeTab === "general" && (
        <div className="space-y-3">
          <SectionHeader title={t("settings.groups.workspace", "Workspace Identity")} />
          <ListGroup>
            <ListItem
              leading={<Building2 className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.tenantName", "Organization Name")}
              description={t("settings.rows.tenantNameDesc", "Display name used across client portal, invoices, and SLA reports.")}
              trailing={
                <TenantBadge
                  name={user?.tenantId ? `Tenant ${user.tenantId.slice(0, 8)}` : "Default Workspace"}
                />
              }
            />
            <ListItem
              leading={<Globe className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.language", "Default Language")}
              description={t("settings.rows.languageDesc", "Preferred locale for reports, notifications, and portal UI.")}
              trailing={
                <Badge variant="outline" className="font-mono text-xs uppercase">
                  {i18n.language || "en_US"}
                </Badge>
              }
            />
            <ListItem
              leading={<Shield className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.clientType", "Client Segmentation")}
              description={t("settings.rows.clientTypeDesc", "Operational tier governing SLA target response times.")}
              trailing={
                <Badge variant="secondary" className="font-semibold text-xs uppercase">
                  {user?.clientType || "STANDARD"}
                </Badge>
              }
            />
          </ListGroup>
        </div>
      )}

      {/* ---- TAB 2: User Profile Settings ---- */}
      {activeTab === "profile" && (
        <div className="space-y-3">
          <SectionHeader title={t("settings.groups.personal", "Personal Account")} />
          <ListGroup>
            <ListItem
              leading={<User className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.fullName", "Full Name")}
              description={user?.name || t("common.notSet", "Not specified")}
              trailing={<RoleBadge role={user?.role} />}
            />
            <ListItem
              leading={<Globe className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.emailAddress", "Email Address")}
              description={user?.email || "—"}
              trailing={
                <Badge variant="outline" className="text-xs">
                  {user?.accountStatus || "ACTIVE"}
                </Badge>
              }
            />
            <ListItem
              leading={<KeyRound className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.password", "Account Password")}
              description={t("settings.rows.passwordDesc", "Last updated credentials used for portal authentication.")}
              trailing={
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {t("settings.changePassword", "Change Password")}
                </Button>
              }
            />
            {/* Danger Zone per Cal.com: flat hairline divider with red text and red outline button */}
            <ListItem
              danger
              title={t("settings.rows.terminateSessions", "Revoke Active Sessions")}
              description={t("settings.rows.terminateSessionsDesc", "Log out of all other browsers and remote workstation clients.")}
              trailing={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {t("settings.revokeAll", "Revoke Sessions")}
                </Button>
              }
            />
          </ListGroup>
        </div>
      )}

      {/* ---- TAB 3: Notification Preferences ---- */}
      {activeTab === "notifications" && (
        <div className="space-y-3">
          <SectionHeader title={t("settings.groups.alerts", "Alert Channels")} />
          <ListGroup>
            <ListItem
              leading={<Bell className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.emailAlerts", "Email Digest")}
              description={t("settings.rows.emailAlertsDesc", "Receive critical ticket SLA alerts and weekly operational reports.")}
              trailing={<Badge variant="secondary">Active</Badge>}
            />
            <ListItem
              leading={<Shield className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.securityAlerts", "Security Audit Notices")}
              description={t("settings.rows.securityAlertsDesc", "Immediate notification on role promotions or JIT elevation requests.")}
              trailing={<Badge variant="secondary">Mandatory</Badge>}
            />
          </ListGroup>
        </div>
      )}

      {/* ---- TAB 4: AI / BYOK Settings ---- */}
      {activeTab === "ai" && hasByok && (
        <div className="space-y-3">
          <SectionHeader title={t("settings.groups.ai", "AI / BYOK Credentials")} />
          <ListGroup>
            <ListItem
              leading={<Sparkles className="h-4 w-4 text-muted-foreground" />}
              title={t("settings.rows.byokStatus", "Bring-Your-Own-Key")}
              description={t("settings.rows.byokDesc", "Decoupled LLM provider credentials stored locally or proxied via zero-secret MCP.")}
              trailing={<Badge variant="outline">Configured</Badge>}
            />
          </ListGroup>
        </div>
      )}
    </PageShell>
  );
}
