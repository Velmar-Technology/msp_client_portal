import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4.5 text-emerald-500 shrink-0" />
        ),
        info: (
          <InfoIcon className="size-4.5 text-blue-500 shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4.5 text-amber-500 shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-4.5 text-rose-500 shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-4.5 animate-spin text-sky-500 shrink-0" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans border p-4",
          description: "group-[.toast]:text-muted-foreground text-xs leading-relaxed font-normal",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium text-xs px-3 py-1.5 rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs px-3 py-1.5 rounded-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
