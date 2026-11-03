import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Folder, Receipt, Key, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Folder quick-access menu for user documents, invoices, credentials, and guides.
 *
 * @returns JSX.Element
 */
export function FolderMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="size-7 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label={t("topNav.documents") || "Documents"}
        >
          <Folder className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1">
        <DropdownMenuItem
          onClick={() => navigate("/billing")}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
        >
          <Receipt className="size-3.5 text-muted-foreground" />
          <span>{t("topNav.docsMenuInvoices")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/devices")}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
        >
          <Key className="size-3.5 text-muted-foreground" />
          <span>{t("topNav.docsMenuVault")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/help")}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
        >
          <BookOpen className="size-3.5 text-muted-foreground" />
          <span>{t("topNav.docsMenuKnowledge")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
