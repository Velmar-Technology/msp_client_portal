import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactErrorBoundary } from "@shared/errors";
import { Toaster } from "@/components/ui/sonner";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/routes/appRouter";

export function App() {
  useSessionMonitor();

  return (
    <ReactErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="msp-portal-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ReactErrorBoundary>
  );
}
