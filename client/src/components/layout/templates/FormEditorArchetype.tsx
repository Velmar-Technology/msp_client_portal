import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { FormCard, FormCardBody } from "@/components/shared/FormCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

export interface FormEditorArchetypeProps {
  title?: string;
  subtitle?: string;
  backPath?: string;
  onSubmit?: (values: Record<string, string>) => void;
  onCancel?: () => void;
}

export function FormEditorArchetype({
  title = "Edit Endpoint Policy",
  subtitle = "Configure automated patch management, security scanning, and restart thresholds",
  backPath = "/devices",
  onSubmit,
  onCancel,
}: FormEditorArchetypeProps) {
  const [policyName, setPolicyName] = useState("Tier-1 Critical Server Baseline");
  const [scanInterval, setScanInterval] = useState("4");
  const [rebootWindow, setRebootWindow] = useState("03:00 UTC");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ policyName, scanInterval, rebootWindow });
    }
  };

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      variant="constrained"
      backPath={backPath}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identifiers */}
        <div className="space-y-3">
          <SectionHeader
            title="Policy Information"
            description="Descriptive metadata identifying this policy rule across tenants"
          />
          <FormCard>
            <FormCardBody className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Policy Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Workstation Standard Protection"
                  className="h-8 text-xs"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be unique within the current tenant organization.
                </p>
              </div>
            </FormCardBody>
          </FormCard>
        </div>

        {/* Section 2: Execution Rules */}
        <div className="space-y-3">
          <SectionHeader
            title="Schedule & Enforcement"
            description="Set automated recurring maintenance and scan windows"
          />
          <FormCard>
            <FormCardBody className="divide-y divide-border/50 p-0">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Telemetry Polling Interval (Hours)
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Frequency at which agents report hardware and health metrics.
                  </div>
                </div>
                <Input
                  type="number"
                  value={scanInterval}
                  onChange={(e) => setScanInterval(e.target.value)}
                  className="w-24 h-7 text-xs"
                  min="1"
                  max="24"
                />
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Maintenance Reboot Window
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Permitted time window for automated kernel/patch updates.
                  </div>
                </div>
                <Input
                  type="text"
                  value={rebootWindow}
                  onChange={(e) => setRebootWindow(e.target.value)}
                  className="w-36 h-7 text-xs"
                />
              </div>
            </FormCardBody>
          </FormCard>
        </div>

        {/* Sticky / Docked Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-1.5"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button type="submit" size="sm" className="gap-1.5" data-testid="form-save-btn">
            <Check className="size-3.5" />
            Save Policy
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
