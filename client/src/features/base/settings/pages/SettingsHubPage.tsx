import { useTranslation } from "react-i18next";
import { Building2, User, Bell, Sparkles, KeyRound, Globe, Shield } from "lucide-react";
import { Page } from "@/components/Page";
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
 * an extensible compound page with hairline dividers and bubble tabs.
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

  return (
    <Page className="max-w-4xl mx-auto py-6">
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>{t("nav.settings", "Settings")}</Page.Title>
          <Page.Description>
            {t("settings.description", "Manage workspace defaults, user profile, and operational parameters.")}
          </Page.Description>
        </Page.TitleGroup>
      </Page.Header>

      <Page.Tabs
        variant="bubble"
        activeTab={activeTab}
        onTabChange={(tab) => setParam("tab", tab)}
        syncUrl
        paramKey="tab"
        className="mt-6 mb-8"
      >
        <Page.Tab id="general" label={t("settings.tabs.general", "General")} icon={Building2} />
        <Page.Tab id="profile" label={t("settings.tabs.profile", "Profile")} icon={User} />
        <Page.Tab id="notifications" label={t("settings.tabs.notifications", "Notifications")} icon={Bell} />
        {hasByok && <Page.Tab id="ai" label={t("settings.tabs.ai", "AI / BYOK")} icon={Sparkles} />}
      </Page.Tabs>

      {/* ---- TAB 1: General Workspace Settings ---- */}
      {activeTab === "general" && (
        <Page.SettingGroup title={t("settings.groups.workspace", "Workspace Identity")}>
          <Page.SettingRow
            icon={Building2}
            label={t("settings.rows.tenantName", "Organization Name")}
            description={t("settings.rows.tenantNameDesc", "Display name used across client portal, invoices, and SLA reports.")}
            action={
              <TenantBadge
                name={user?.tenantId ? `Tenant ${user.tenantId.slice(0, 8)}` : "Default Workspace"}
              />
            }
          />
          <Page.SettingRow
            icon={Globe}
            label={t("settings.rows.language", "Default Language")}
            description={t("settings.rows.languageDesc", "Preferred locale for reports, notifications, and portal UI.")}
            action={
              <Badge variant="outline" className="font-mono text-xs uppercase">
                {i18n.language || "en_US"}
              </Badge>
            }
          />
          <Page.SettingRow
            icon={Shield}
            label={t("settings.rows.clientType", "Client Segmentation")}
            description={t("settings.rows.clientTypeDesc", "Operational tier governing SLA target response times.")}
            action={
              <Badge variant="secondary" className="font-semibold text-xs uppercase">
                {user?.clientType || "STANDARD"}
              </Badge>
            }
          />
        </Page.SettingGroup>
      )}

      {/* ---- TAB 2: User Profile Settings ---- */}
      {activeTab === "profile" && (
        <Page.SettingGroup title={t("settings.groups.personal", "Personal Account")}>
          <Page.SettingRow
            icon={User}
            label={t("settings.rows.fullName", "Full Name")}
            description={user?.name || t("common.notSet", "Not specified")}
            action={<RoleBadge role={user?.role} />}
          />
          <Page.SettingRow
            icon={Globe}
            label={t("settings.rows.emailAddress", "Email Address")}
            description={user?.email || "—"}
            action={
              <Badge variant="outline" className="text-xs">
                {user?.accountStatus || "ACTIVE"}
              </Badge>
            }
          />
          <Page.SettingRow
            icon={KeyRound}
            label={t("settings.rows.password", "Account Password")}
            description={t("settings.rows.passwordDesc", "Last updated credentials used for portal authentication.")}
            action={
              <Button variant="outline" size="sm" className="h-7 text-xs">
                {t("settings.changePassword", "Change Password")}
              </Button>
            }
          />
          {/* Danger Zone per ADR-016: flat hairline divider with red text and red outline button */}
          <Page.SettingRow
            danger
            label={t("settings.rows.terminateSessions", "Revoke Active Sessions")}
            description={t("settings.rows.terminateSessionsDesc", "Log out of all other browsers and remote workstation clients.")}
            action={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {t("settings.revokeAll", "Revoke Sessions")}
              </Button>
            }
          />
        </Page.SettingGroup>
      )}

      {/* ---- TAB 3: Notification Preferences ---- */}
      {activeTab === "notifications" && (
        <Page.SettingGroup title={t("settings.groups.alerts", "Alert Channels")}>
          <Page.SettingRow
            icon={Bell}
            label={t("settings.rows.emailAlerts", "Email Digest")}
            description={t("settings.rows.emailAlertsDesc", "Receive critical ticket SLA alerts and weekly operational reports.")}
            action={<Badge variant="secondary">Active</Badge>}
          />
          <Page.SettingRow
            icon={Shield}
            label={t("settings.rows.securityAlerts", "Security Audit Notices")}
            description={t("settings.rows.securityAlertsDesc", "Immediate notification on role promotions or JIT elevation requests.")}
            action={<Badge variant="secondary">Mandatory</Badge>}
          />
        </Page.SettingGroup>
      )}

      {/* ---- TAB 4: AI / BYOK Settings ---- */}
      {activeTab === "ai" && hasByok && (
        <Page.SettingGroup title={t("settings.groups.ai", "AI / BYOK Credentials")}>
          <Page.SettingRow
            icon={Sparkles}
            label={t("settings.rows.byokStatus", "Bring-Your-Own-Key")}
            description={t("settings.rows.byokDesc", "Decoupled LLM provider credentials stored locally or proxied via zero-secret MCP.")}
            action={<Badge variant="outline">Configured</Badge>}
          />
        </Page.SettingGroup>
      )}
    </Page>
  );
}
