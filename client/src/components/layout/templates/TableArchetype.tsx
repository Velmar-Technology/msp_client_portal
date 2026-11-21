import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageSearchInput } from "@/components/shared/PageSearchInput";
import { PageFilterPill } from "@/components/shared/PageFilterPill";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, SlidersHorizontal } from "lucide-react";

export interface TableItem {
  id: string;
  name: string;
  category: string;
  status: "ACTIVE" | "PENDING" | "MAINTENANCE";
  updatedAt: string;
}

export interface TableArchetypeProps {
  title?: string;
  subtitle?: string;
  items?: TableItem[];
  onCreate?: () => void;
  onExport?: () => void;
}

const DEFAULT_ITEMS: TableItem[] = [
  { id: "SRV-01", name: "Primary Domain Controller", category: "Servers", status: "ACTIVE", updatedAt: "10m ago" },
  { id: "FW-02", name: "Edge Firewall FortiGate 60F", category: "Network", status: "ACTIVE", updatedAt: "1h ago" },
  { id: "NAS-03", name: "Synology Backup Storage", category: "Storage", status: "MAINTENANCE", updatedAt: "3h ago" },
  { id: "SW-04", name: "Cisco Core Switch 48P", category: "Network", status: "PENDING", updatedAt: "Yesterday" },
];

export function TableArchetype({
  title = "Infrastructure Assets",
  subtitle = "Monitor, inventory, and configure managed endpoints and cloud services",
  items = DEFAULT_ITEMS,
  onCreate,
  onExport,
}: TableArchetypeProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      variant="full"
      cta={
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
              <Download className="size-3.5" />
              Export
            </Button>
          )}
          {onCreate && (
            <Button size="sm" onClick={onCreate} className="gap-1.5" data-testid="table-create-btn">
              <Plus className="size-3.5" />
              Add Asset
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sticky Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <PageSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search assets, IP, or hostnames..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PageFilterPill
              label="Status"
              value={statusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "PENDING", label: "Pending" },
                { value: "MAINTENANCE", label: "Maintenance" },
              ]}
              onChange={setStatusFilter}
              onClear={() => setStatusFilter("all")}
            />
            <Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              Columns
            </Button>
          </div>
        </div>

        {/* Flat Bordered Table */}
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 font-medium text-muted-foreground">
                  <th className="py-2.5 px-4 font-medium">Asset Identifier</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Operational Status</th>
                  <th className="py-2.5 px-4 font-medium">Last Telemetry</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{item.id}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : item.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.updatedAt}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clean Cal.com Pagination */}
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={4}
            totalItems={items.length * 4}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </PageShell>
  );
}
