import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface WizardLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Title of the current wizard page/step */
  title?: React.ReactNode;
  /** Subtitle or instructions */
  subtitle?: React.ReactNode;
  /** Current step index (1-based, e.g. 1, 2, 3) */
  currentStep?: number;
  /** Total number of steps */
  maxSteps?: number;
  /** Custom label for steps, e.g. "Step 1 of 3" */
  stepLabel?: (current: number, total: number) => string;
  /** Back navigation callback */
  onBack?: () => void;
  /** Optional secondary "I'll do this later" or skip callback */
  onLater?: () => void;
  /** Label for the skip/later button */
  laterLabel?: string;
  /** Optional footer content beneath the main card */
  footer?: React.ReactNode;
  /** Maximum width container class (defaults to max-w-[600px]) */
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Enterprise multi-step onboarding and setup wizard shell adapted from Cal.com UI.
 * Features segmented linear progress bars, centered high-density card container,
 * and standard back/skip navigation controls.
 *
 * @param props - WizardLayoutProps
 * @returns React.ReactElement
 * @see Cal.com WizardLayout
 */
export function WizardLayout({
  title,
  subtitle,
  currentStep = 1,
  maxSteps = 3,
  stepLabel = (current, total) => `Step ${current} of ${total}`,
  onBack,
  onLater,
  laterLabel = "I'll do this later",
  footer,
  maxWidthClass = "max-w-[600px]",
  className,
  children,
  ...props
}: WizardLayoutProps) {
  return (
    <div
      data-slot="wizard-layout"
      className={cn("min-h-screen w-full bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      <div className={cn("w-full mx-auto space-y-6", maxWidthClass)}>
        {/* Navigation & Progress Header */}
        <header className="space-y-4">
          {onBack && (
            <Button
              type="button"
              variant="minimal"
              size="icon-sm"
              onClick={onBack}
              aria-label="Go back"
              className="-ml-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {(title || subtitle) && (
            <div className="space-y-1 text-left">
              {title && (
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {maxSteps > 1 && (
            <div className="space-y-2 pt-1" data-slot="wizard-steps">
              <p className="text-xs font-medium text-muted-foreground font-mono">
                {stepLabel(currentStep, maxSteps)}
              </p>
              <div className="flex w-full items-center gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemax={maxSteps}>
                {Array.from({ length: maxSteps }).map((_, idx) => {
                  const stepNumber = idx + 1;
                  const isCompleted = stepNumber < currentStep;
                  const isCurrent = stepNumber === currentStep;

                  return (
                    <div
                      key={`wizard-step-${stepNumber}`}
                      data-step={stepNumber}
                      data-status={isCompleted ? "completed" : isCurrent ? "current" : "upcoming"}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-200",
                        isCompleted || isCurrent
                          ? "bg-foreground"
                          : "bg-muted"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* Central Step Content Card */}
        <div
          data-slot="wizard-card"
          className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-subtle transition-shadow"
        >
          {children}
        </div>

        {/* Optional Skip / Later Action */}
        {onLater && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="minimal"
              size="sm"
              onClick={onLater}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {laterLabel}
            </Button>
          </div>
        )}

        {footer && <div className="pt-2">{footer}</div>}
      </div>
    </div>
  );
}
