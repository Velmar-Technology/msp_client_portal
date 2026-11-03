import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Send, Sparkles, Bot, User as UserIcon, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AiCopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: Date;
  suggestTicket?: boolean;
}

/**
 * Slide-over AI Copilot sheet for interactive IT support and triage.
 *
 * @param props.open - Whether the drawer is visible.
 * @param props.onOpenChange - Callback to toggle visibility.
 * @returns JSX.Element
 */
export function AiCopilotDrawer({ open, onOpenChange }: AiCopilotDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: t("topNav.aiCopilotDescription") || "Hello! I am your Velmar IT Copilot. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "I analyzed your query against Velmar's knowledge base and active monitoring systems.";
      let suggestTicket = false;

      const lower = text.toLowerCase();
      if (lower.includes("urgent") || lower.includes("ticket") || lower.includes("outage")) {
        reply = "For critical incidents, SLA cancellation guarantees apply within 60 minutes (BL-101). I can draft a High Priority ticket for our engineering on-call rotation right away.";
        suggestTicket = true;
      } else if (lower.includes("invoice") || lower.includes("billing") || lower.includes("pay")) {
        reply = "You can review all open invoices, 18% ITBIS breakdowns, and series B01 NCF documents directly in your Billing & Invoices section.";
      } else if (lower.includes("password") || lower.includes("device") || lower.includes("vault")) {
        reply = "Workstation credentials are cryptographic and slot-bound. You can access device credentials securely in the Device Vault tab.";
      } else {
        reply = `Here is what I found regarding "${text}": If this requires hands-on technician remediation, feel free to open a ticket directly.`;
        suggestTicket = true;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "copilot",
          text: reply,
          timestamp: new Date(),
          suggestTicket,
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleOpenTicket = () => {
    onOpenChange(false);
    navigate("/tickets/new");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-md border-l border-border/80 shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-linear-to-tr from-blue-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                {t("topNav.aiCopilotTitle")}
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  AI
                </span>
              </SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground">
                {t("topNav.aiCopilotDescription")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "copilot" && (
                <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                }`}
              >
                <p>{m.text}</p>
                {m.suggestTicket && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={handleOpenTicket}
                    className="mt-2.5 gap-1.5 text-[11px] h-6 font-medium w-full justify-between"
                  >
                    <span>{t("topNav.aiCopilotCreateTicket")}</span>
                    <ArrowRight className="size-3" />
                  </Button>
                )}
              </div>
              {m.sender === "user" && (
                <div className="size-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="size-3.5" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 items-center text-muted-foreground text-xs pl-8">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompt Chips */}
        <div className="p-3 border-t border-border/60 bg-muted/10 space-y-1.5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <button
              onClick={() => handleSend(t("topNav.aiCopilotSuggestedPrompt1"))}
              className="px-2.5 py-1 rounded-full border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              {t("topNav.aiCopilotSuggestedPrompt1")}
            </button>
            <button
              onClick={() => handleSend(t("topNav.aiCopilotSuggestedPrompt2"))}
              className="px-2.5 py-1 rounded-full border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              {t("topNav.aiCopilotSuggestedPrompt2")}
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("topNav.aiCopilotPromptPlaceholder")}
              className="flex-1 h-8 rounded-full border border-border/80 bg-background px-3 text-xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="size-8 rounded-full shrink-0"
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
