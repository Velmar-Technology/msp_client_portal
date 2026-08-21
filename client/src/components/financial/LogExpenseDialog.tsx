import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface LogExpenseDialogProps {
  onExpenseLogged: () => void;
}

export function LogExpenseDialog({ onExpenseLogged }: LogExpenseDialogProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [expenseDate, setExpenseDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [expenseIdentifier, setExpenseIdentifier] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      newErrors.amount = t("financial.positiveAmount") || "Amount must be greater than 0";
    }
    if (!description.trim()) {
      newErrors.description = t("financial.requiredField") || "This field is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await expenseService.create({
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        expense_date: new Date(expenseDate).toISOString(),
        expense_identifier: expenseIdentifier.trim() || null,
      });
      toast.success(t("financial.addExpenseSuccess") || "Expense logged successfully");

      // Reset form
      setAmount("");
      setDescription("");
      setCategory("other");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setExpenseIdentifier("");
      setErrors({});

      // Close dialog
      setIsOpen(false);

      // Trigger dashboard refresh
      onExpenseLogged();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = errorObj.response?.data?.message || errorObj.message || "Failed to log expense";
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex items-center gap-1 px-3 text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100 cursor-pointer shadow-xs"
        >
          <Plus className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
          {t("financial.addExpense")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-lg shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-heading">
            {t("financial.expenseFormTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("financial.expenseFormDesc")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-3">
          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">
              {t("financial.descriptionLabel")}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("financial.descriptionPlaceholder") || "e.g. Vercel hosting bill"}
              className={errors.description ? "border-destructive focus-visible:ring-destructive/30" : ""}
            />
            {errors.description && (
              <span className="text-[10px] text-destructive dark:text-red-400 font-medium">{errors.description}</span>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">
              {t("financial.amountLabel")}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={errors.amount ? "border-destructive focus-visible:ring-destructive/30" : ""}
            />
            {errors.amount && (
              <span className="text-[10px] text-destructive dark:text-red-400 font-medium">{errors.amount}</span>
            )}
          </div>

          {/* Reference / Identifier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">
              {t("financial.identifierLabel")}
            </label>
            <Input
              value={expenseIdentifier}
              onChange={(e) => setExpenseIdentifier(e.target.value)}
              placeholder={t("financial.identifierPlaceholder") || "e.g. INV-10023"}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">
              {t("financial.categoryLabel")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-xs outline-none transition-all hover:border-zinc-300 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:focus:border-zinc-650 cursor-pointer"
            >
              <option value="cloudInfra">{t("financial.cloudInfra")}</option>
              <option value="salaries">{t("financial.salaries")}</option>
              <option value="marketing">{t("financial.marketing")}</option>
              <option value="officeSpace">{t("financial.officeSpace")}</option>
              <option value="other">{t("financial.other")}</option>
            </select>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">{t("financial.dateLabel")}</label>
            <DatePicker
              value={expenseDate}
              onChange={setExpenseDate}
              className="w-full"
            />
          </div>

          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AlertDialogCancel
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
              className="h-7 text-xs cursor-pointer mt-0"
            >
              {t("financial.cancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-7 text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity font-medium flex items-center gap-1 cursor-pointer"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {isSaving ? t("financial.savingExpense") : t("financial.addExpense")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

