import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (error?: string) => void;
  text?: "signup_with" | "signin_with";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: { theme: string; size: string; width: string; text: string }
          ) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({ onSuccess, onError, text = "signin_with" }: GoogleLoginButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isMockMode = !clientId;

  const [showMockModal, setShowMockModal] = useState(false);
  const [mockEmail, setMockEmail] = useState("");
  const [mockName, setMockName] = useState("");

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const renderedRef = useRef(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (isMockMode || renderedRef.current) return;

    let attempts = 0;
    const initializeGsi = () => {
      if (!window.google || renderedRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              onSuccessRef.current(response.credential);
            } else {
              onErrorRef.current("Google authentication failed: no credential");
            }
          },
        });
        const container = document.getElementById("google-btn-container");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: "380",
            text: text === "signup_with" ? "signup_with" : "signin_with",
          });
          renderedRef.current = true;
        }
      } catch (err: unknown) {
        console.error("Failed to render GSI button:", err);
      }
    };

    const interval = setInterval(() => {
      attempts++;
      if (window.google) {
        initializeGsi();
        if (renderedRef.current) {
          clearInterval(interval);
        }
      } else if (attempts > 50) {
        clearInterval(interval);
        console.error("Google client library could not be loaded");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [clientId, isMockMode, text]);

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockEmail || !mockName) return;

    // Generate a mock ID token format expected by the backend
    const mockToken = `mock-google-token-${mockEmail}-${mockName}`;
    onSuccess(mockToken);
    setShowMockModal(false);
  };

  if (!isMockMode) {
    return (
      <div className="flex justify-center w-full my-4 overflow-hidden min-h-11">
        <div id="google-btn-container" className="w-full max-w-95 min-h-11 flex justify-center items-center" />
      </div>
    );
  }

  // Mock button rendering for local dev sandbox
  return (
    <div className="flex flex-col items-center w-full my-4 min-h-11">
      <button
        type="button"
        onClick={() => setShowMockModal(true)}
        className="w-full max-w-95 flex items-center justify-center gap-3 bg-card hover:bg-muted text-foreground border border-border px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-xs cursor-pointer hover:border-primary/50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 0, 0)">
            <path
              d="M21.35,11.1H12v2.7h5.38C16.88,16.08,14.68,17.4,12,17.4c-2.98,0-5.5-2.02-6.4-4.74C5.37,11.9,5.24,11.09,5.24,10.27c0-0.82,0.13-1.63,0.36-2.39c0.9-2.72,3.42-4.74,6.4-4.74c1.68,0,3.2,0.61,4.39,1.75l2.02-2.02C16.82,1.38,14.54,0.5,12,0.5C7.33,0.5,3.38,3.22,1.55,7.18c-0.64,1.4-1,2.94-1,4.57c0,1.63,0.36,3.17,1,4.57c1.83,3.96,5.78,6.68,10.45,6.68c4.67,0,8.62-2.72,10.45-6.68c0.64-1.4,1-2.94,1-4.57C23.45,11.66,22.7,11.1,21.35,11.1z"
              fill="#4285F4"
            />
            <path
              d="M12,23.5c3.08,0,5.68-1.02,7.57-2.77l-3.69-2.86c-1.08,0.72-2.47,1.15-3.88,1.15c-2.98,0-5.5-2.02-6.4-4.74l-3.8,2.94C3.65,20.48,7.51,23.5,12,23.5z"
              fill="#34A853"
            />
            <path
              d="M5.6,14.28c-0.23-0.69-0.36-1.42-0.36-2.18c0-0.76,0.13-1.49,0.36-2.18l-3.8-2.94C1.04,8.5,0.5,10.3,0.5,12.2c0,1.9,0.54,3.7,1.3,5.22L5.6,14.28z"
              fill="#FBBC05"
            />
            <path
              d="M12,4.5c1.68,0,3.2,0.61,4.39,1.75l2.02-2.02C16.82,1.38,14.54,0.5,12,0.5C7.51,0.5,3.65,3.52,1.8,6.78l3.8,2.94C6.5,4.73,9.02,4.5,12,4.5z"
              fill="#EA4335"
            />
          </g>
        </svg>
        <span>{text === "signup_with" ? "Sign up with Google (Sandbox)" : "Sign in with Google (Sandbox)"}</span>
      </button>
      <span className="text-[11px] text-muted-foreground opacity-80 mt-1">
        VITE_GOOGLE_CLIENT_ID is not configured. Running in sandbox mode.
      </span>

      <AlertDialog open={showMockModal} onOpenChange={setShowMockModal}>
        <AlertDialogContent className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-foreground mb-1">
              Google Sandbox Login
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Simulate Google authentication by entering any mock account details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleMockSubmit} className="space-y-4 mt-2">
            <div>
              <label
                htmlFor="google-sandbox-email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Mock Email Address
              </label>
              <Input
                id="google-sandbox-email"
                type="email"
                value={mockEmail}
                onChange={(e) => setMockEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
            </div>
            <div>
              <label
                htmlFor="google-sandbox-name"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Full Name
              </label>
              <Input
                id="google-sandbox-name"
                type="text"
                value={mockName}
                onChange={(e) => setMockName(e.target.value)}
                placeholder="John Mitchell"
                required
                className="w-full px-4 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
            </div>
            <AlertDialogFooter className="flex justify-end gap-3 pt-2">
              <AlertDialogCancel
                type="button"
                onClick={() => setShowMockModal(false)}
                className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted transition-colors cursor-pointer text-foreground mt-0"
              >
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium cursor-pointer"
              >
                Simulate Auth
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

