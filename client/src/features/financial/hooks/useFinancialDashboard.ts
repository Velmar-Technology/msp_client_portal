import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invoiceService } from "@/features/billing";

export type DateRange = "30_days" | "quarter" | "year";

export interface KpiCardData {
  key: string;
  titleKey: string;
  value: string;
  trend: string;
  isPositiveTrend: boolean;
  isNeutralTrend?: boolean;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ExpenseCategory {
  nameKey: string;
  value: number;
  percentage: number;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  categoryKey: string;
  status: "PAID" | "PENDING" | "FAILED";
  amount: number;
  expense_identifier?: string | null;
}

export function useFinancialDashboard() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>("30_days");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<KpiCardData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await invoiceService.getFinancialStats(dateRange);
        if (active) {
          setKpis(data.kpis);
          setMonthlyData(data.monthlyData);
          setExpenseCategories(data.expenseCategories);
          setTransactions(data.transactions);
        }
      } catch (err: unknown) {
        if (active) {
          const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
          const errMsg = errorObj.response?.data?.message || errorObj.message || "Failed to load financial stats";
          setError(errMsg);
          toast.error(errMsg);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, [dateRange, refreshKey]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Simulate network wait for download generation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(t("financial.exportSuccess"));
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    dateRange,
    setDateRange,
    refresh: () => setRefreshKey(prev => prev + 1),
    hoveredMonthIndex,
    setHoveredMonthIndex,
    hoveredCategoryIndex,
    setHoveredCategoryIndex,
    isExporting,
    handleExport,
    isLoading,
    error,
    kpis,
    monthlyData,
    expenseCategories,
    transactions,
  };
}
