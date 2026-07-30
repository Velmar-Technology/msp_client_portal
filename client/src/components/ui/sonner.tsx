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
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-900 dark:group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-200 dark:group-[.toaster]:border-zinc-800/80 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans border p-4",
          description: "group-[.toast]:text-zinc-600 dark:group-[.toast]:text-zinc-300 text-xs leading-relaxed font-normal",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-white dark:group-[.toast]:bg-zinc-100 dark:group-[.toast]:text-zinc-900 font-medium text-xs px-3 py-1.5 rounded-lg",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-zinc-300 text-xs px-3 py-1.5 rounded-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
