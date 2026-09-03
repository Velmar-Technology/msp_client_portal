import { useTranslation } from "react-i18next";
import type { ExpenseCategory } from "../hooks/useFinancialDashboard";

interface ExpenseDoughnutProps {
  categories: ExpenseCategory[];
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  totalExpenses: string;
}

// Math helper to generate pie slice paths from center (cx, cy) to outer radius R
function getPieSegmentPath(
  cx: number,
  cy: number,
  R: number,
  startAngle: number,
  endAngle: number,
): string {
  // If a single slice covers 100% (360 degrees)
  if (endAngle - startAngle >= 359.99) {
    return `
      M ${cx} ${cy - R}
      A ${R} ${R} 0 1 1 ${cx} ${cy + R}
      A ${R} ${R} 0 1 1 ${cx} ${cy - R}
      Z
    `;
  }

  // Rotate by -90 so the first slice starts at the top (12 o'clock)
  const radStart = ((startAngle - 90) * Math.PI) / 180;
  const radEnd = ((endAngle - 90) * Math.PI) / 180;

  const x1 = cx + R * Math.cos(radStart);
  const y1 = cy + R * Math.sin(radStart);
  const x2 = cx + R * Math.cos(radEnd);
  const y2 = cy + R * Math.sin(radEnd);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `
    M ${cx} ${cy}
    L ${x1} ${y1}
    A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2}
    Z
  `;
}

export function ExpenseDoughnut({ categories, hoveredIndex, setHoveredIndex, totalExpenses }: ExpenseDoughnutProps) {
  const { t } = useTranslation();

  // Accumulate angles for pie slices
  const segments = [];
  let accumulatedAngle = 0;
  for (let idx = 0; idx < categories.length; idx++) {
    const cat = categories[idx];
    const startAngle = accumulatedAngle;
    const sweepAngle = cat.percentage * 3.6; // percentage to degrees (100% = 360deg)
    accumulatedAngle += sweepAngle;

    const midAngleDeg = startAngle + sweepAngle / 2;
    const midAngleRad = ((midAngleDeg - 90) * Math.PI) / 180;

    segments.push({
      ...cat,
      idx,
      startAngle,
      endAngle: startAngle + sweepAngle,
      midAngleRad,
    });
  }

  const centerCoords = { x: 100, y: 100 };
  const baseRadius = 78;

  const activeCategory = hoveredIndex !== null ? categories[hoveredIndex] : null;

  return (
    <div className="h-full flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-900">
        <div>
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{t("financial.expenseBreakdown")}</h3>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{t("financial.distributionDesc")}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {t("financial.expenses")}
          </span>
          <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-50">{totalExpenses}</span>
        </div>
      </div>

      <div className="mt-3 flex-1 flex flex-col items-center justify-around gap-4 sm:flex-row sm:gap-2">
        {/* SVG Pie Chart */}
        <div className="relative h-56 w-[200px] shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            {segments.map((seg) => {
              const isHovered = seg.idx === hoveredIndex;
              const pathD = getPieSegmentPath(
                centerCoords.x,
                centerCoords.y,
                baseRadius,
                seg.startAngle,
                seg.endAngle,
              );

              // Slice pop-out translation on hover
              const offset = isHovered ? 5 : 0;
              const translateX = offset * Math.cos(seg.midAngleRad);
              const translateY = offset * Math.sin(seg.midAngleRad);

              return (
                <path
                  key={seg.nameKey}
                  d={pathD}
                  fill={seg.color}
                  className="cursor-pointer stroke-white dark:stroke-zinc-950 transition-transform duration-200 hover:opacity-95"
                  strokeWidth={2}
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px)`,
                    transformOrigin: `${centerCoords.x}px ${centerCoords.y}px`,
                    filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.12))" : "none",
                  }}
                  onMouseEnter={() => setHoveredIndex(seg.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend & Hover Info Panel */}
        <div className="flex flex-col gap-1.5 w-full max-w-[160px] sm:max-w-xs justify-center">
          {activeCategory && (
            <div className="mb-1 rounded-md bg-zinc-50 dark:bg-zinc-900/40 p-2 text-center transition-all duration-150 animate-fade-in">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeCategory.color }} />
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {t(`financial.${activeCategory.nameKey}`)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-0.5 font-mono">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{activeCategory.percentage}%</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">(${activeCategory.value.toLocaleString()})</span>
              </div>
            </div>
          )}

          {categories.length > 0 ? (
            categories.map((cat, idx) => {
              const isHovered = idx === hoveredIndex;
              return (
                <div
                  key={cat.nameKey}
                  className={`flex items-center justify-between rounded-md p-1.5 transition-colors duration-150 cursor-pointer ${
                    isHovered
                      ? "bg-zinc-50 dark:bg-zinc-900/60 font-semibold"
                      : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
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

export const ExpensePieChart = ExpenseDoughnut;
