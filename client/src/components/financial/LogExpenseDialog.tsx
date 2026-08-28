import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex items-center gap-1 px-3 text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100 cursor-pointer shadow-xs"
        >
          <Plus className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
          {t("financial.addExpense")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border border-border p-5 rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground font-heading">
            {t("financial.expenseFormTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("financial.expenseFormDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-3">
          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-description" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("financial.expenseDescription")} *
            </label>
            <Input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder={t("financial.descriptionPlaceholder")}
              className={`h-8 text-xs ${errors.description ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
            />
            {errors.description && (
              <span className="text-[10px] text-destructive">{errors.description}</span>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-amount" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("financial.expenseAmount")} ($) *
            </label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0.00"
              className={`h-8 text-xs ${errors.amount ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
            />
            {errors.amount && (
              <span className="text-[10px] text-destructive">{errors.amount}</span>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-category" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("financial.expenseCategory")}
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="expense-category" size="lg" className="w-full text-xs">
                <SelectValue placeholder={t("financial.expenseCategory")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="software" className="text-xs">{t("financial.categorySoftware")}</SelectItem>
                <SelectItem value="hardware" className="text-xs">{t("financial.categoryHardware")}</SelectItem>
                <SelectItem value="contractor" className="text-xs">{t("financial.categoryContractor")}</SelectItem>
                <SelectItem value="office" className="text-xs">{t("financial.categoryOffice")}</SelectItem>
                <SelectItem value="utilities" className="text-xs">{t("financial.categoryUtilities")}</SelectItem>
                <SelectItem value="other" className="text-xs">{t("financial.categoryOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference / Invoice Identifier (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-identifier" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("financial.identifierLabel")}
            </label>
            <Input
              id="expense-identifier"
              type="text"
              value={expenseIdentifier}
              onChange={(e) => setExpenseIdentifier(e.target.value)}
              placeholder={t("financial.identifierPlaceholder")}
              className="h-8 text-xs"
            />
          </div>

          {/* Expense Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-date" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("financial.expenseDate")}
            </label>
            <DatePicker
              id="expense-date"
              value={expenseDate}
              onChange={setExpenseDate}
              className="w-full"
            />
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="h-7 text-xs cursor-pointer mt-0"
              >
                {t("financial.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-7 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {isSaving ? t("financial.savingExpense") : t("financial.addExpense")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
