import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ListGroup, ListItem } from "@/components/shared/ListGroup";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Key, Bell, Shield, ArrowRight } from "lucide-react";

/**
 * SettingsArchetype
 * 
 * Canonical Cal.com Settings & Preferences layout:
 * - Constrained reading width (max-w-4xl mx-auto)
 * - Optional sub-navigation pills synced with `?tab=...`
 * - Hairline-divided `<ListGroup>` sections
 * - Text-first labels with right-aligned action triggers / switches
 * - Flat divider danger zone (never saturated alert boxes)
 */
export interface SettingsArchetypeProps {
  title?: string;
  subtitle?: string;
  backPath?: string;
  onSave?: () => void;
}

export function SettingsArchetype({
  title = "General Settings",
  subtitle = "Manage your organization preferences, security, and notification rules",
  backPath = "/settings",
  onSave,
}: SettingsArchetypeProps) {
  const tabs = [
    { id: "general", label: "General", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & MFA", icon: Shield },
  ];

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      variant="constrained"
      backPath={backPath}
      tabs={tabs}
      syncUrl={true}
      tabParamKey="subtab"
      cta={
        onSave ? (
          <Button size="sm" onClick={onSave} data-testid="settings-save-btn">
            Save Changes
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Section 1: Security Controls */}
        <section className="space-y-3">
          <SectionHeader
            title="Authentication & Session"
            description="Configure login credentials, single sign-on, and device access"
          />
          <ListGroup>
            <ListItem
              title="Two-Factor Authentication (2FA)"
              description="Require an authenticator app or hardware FIDO2 key on login"
              trailing={<Switch defaultChecked aria-label="Toggle 2FA" />}
            />
            <ListItem
              title="Active Sessions"
              description="Review all desktop and mobile devices currently signed into this tenant"
              trailing={
                <Button variant="outline" size="sm" className="gap-1.5">
                  Manage Sessions
                  <ArrowRight className="size-3.5" />
                </Button>
              }
            />
          </ListGroup>
        </section>

        {/* Section 2: Danger Zone */}
        <section className="space-y-3 pt-4">
          <SectionHeader
            title="Danger Zone"
            description="Irreversible actions affecting your tenant data"
          />
          <div className="border border-destructive/40 rounded-lg p-4 bg-destructive/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-red-500 dark:text-red-400">
                  Delete Workspace
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove this organization, all endpoints, and billing history.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-red-500/50 text-red-500 dark:text-red-400 hover:bg-destructive/10 shrink-0">
                Delete Workspace
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
