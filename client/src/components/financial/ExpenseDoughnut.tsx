import { useTranslation } from "react-i18next";
import type { ExpenseCategory } from "@/hooks/useFinancialDashboard";

interface ExpenseDoughnutProps {
  categories: ExpenseCategory[];
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  totalExpenses: string;
}

// Math helper to generate outer/inner arc paths for standard SVG doughnut slices
function getDoughnutSegmentPath(
  cx: number,
  cy: number,
  r: number,
  R: number,
  startAngle: number,
  endAngle: number,
): string {
  // Rotate by -90 so the first slice starts at the top (12 o'clock)
  const radStart = ((startAngle - 90) * Math.PI) / 180;
  const radEnd = ((endAngle - 90) * Math.PI) / 180;

  const x1 = cx + R * Math.cos(radStart);
  const y1 = cy + R * Math.sin(radStart);
  const x2 = cx + R * Math.cos(radEnd);
  const y2 = cy + R * Math.sin(radEnd);

  const x3 = cx + r * Math.cos(radEnd);
  const y3 = cy + r * Math.sin(radEnd);
  const x4 = cx + r * Math.cos(radStart);
  const y4 = cy + r * Math.sin(radStart);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `
    M ${x1} ${y1}
    A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${r} ${r} 0 ${largeArcFlag} 0 ${x4} ${y4}
    Z
  `;
}

export function ExpenseDoughnut({ categories, hoveredIndex, setHoveredIndex, totalExpenses }: ExpenseDoughnutProps) {
  const { t } = useTranslation();

  // Accumulate angles using a local loop to ensure pure functional rendering patterns
  const segments = [];
  let accumulatedAngle = 0;
  for (let idx = 0; idx < categories.length; idx++) {
    const cat = categories[idx];
    const startAngle = accumulatedAngle;
    const sweepAngle = cat.percentage * 3.6; // percentage to degrees
    accumulatedAngle += sweepAngle;
    segments.push({
      ...cat,
      idx,
      startAngle,
      endAngle: startAngle + sweepAngle,
    });
  }

  const centerCoords = { x: 100, y: 100 };
  const baseInnerRadius = 55;
  const baseOuterRadius = 80;

  const activeCategory = hoveredIndex !== null ? categories[hoveredIndex] : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 pb-2.5 dark:border-zinc-900">
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{t("financial.expenseBreakdown")}</h3>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{t("financial.distributionDesc")}</p>
      </div>

      <div className="mt-4 flex flex-col items-center justify-around gap-4 sm:flex-row sm:gap-2">
        {/* SVG Doughnut */}
        <div className="relative h-64 w-[200px] shrink-0">
          <svg width={200} height={200} className="overflow-visible">
            {segments.map((seg) => {
              const isHovered = seg.idx === hoveredIndex;
              // Expand active slice slightly on hover
              const outerRadius = isHovered ? baseOuterRadius + 5 : baseOuterRadius;
              const innerRadius = isHovered ? baseInnerRadius + 2 : baseInnerRadius;

              const pathD = getDoughnutSegmentPath(
                centerCoords.x,
                centerCoords.y,
                innerRadius,
                outerRadius,
                seg.startAngle,
                seg.endAngle,
              );

              return (
                <path
                  key={seg.nameKey}
                  d={pathD}
                  fill={seg.color}
                  className="transition-all duration-200 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredIndex(seg.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Central hole text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {activeCategory ? (
              <>
                <span className="max-w-[120px] truncate text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {t(`financial.${activeCategory.nameKey}`)}
                </span>
                <span className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50">
                  {activeCategory.percentage}%
                </span>
                <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                  ${activeCategory.value.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t("financial.expenses")}
                </span>
                <span className="text-[16px] font-bold text-zinc-900 dark:text-zinc-50">{totalExpenses}</span>
                <span className="text-[8px] text-zinc-400 dark:text-zinc-500">{t("financial.allCategories")}</span>
              </>
            )}
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-col gap-2 w-full max-w-[160px] sm:max-w-xs justify-center">
          {categories.length > 0 ? (
            categories.map((cat, idx) => {
              const isHovered = idx === hoveredIndex;
              return (
                <div
                  key={cat.nameKey}
                  className={`flex items-center justify-between rounded-md p-1.5 transition-colors duration-150 ${
                    isHovered ? "bg-zinc-50 dark:bg-zinc-900/60" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                  }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {t(`financial.${cat.nameKey}`)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-[10px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>{cat.percentage}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-medium py-10">
              {t("financial.noExpenses")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
