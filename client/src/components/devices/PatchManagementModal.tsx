import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { rmmService, type RmmPatchItem } from '@/services/rmmService';
import { toast } from 'sonner';
import { ShieldAlert, RefreshCw, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface PatchManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string | null;
  deviceName: string | null;
  onPatchesUpdated?: () => void;
}

export const PatchManagementModal: React.FC<PatchManagementModalProps> = ({
  open,
  onOpenChange,
  equipmentId,
  deviceName,
  onPatchesUpdated,
}) => {
  const [patches, setPatches] = useState<RmmPatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedPatchIds, setSelectedPatchIds] = useState<string[]>([]);

  const fetchPatches = async () => {
    if (!equipmentId) return;
    try {
      setLoading(true);
      const data = await rmmService.getEquipmentPatches(equipmentId);
      setPatches(data);
      // Auto-select pending patches by default
      const pendingIds = data.filter((p) => p.status === 'PENDING').map((p) => p.id);
      setSelectedPatchIds(pendingIds);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load device patch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && equipmentId) {
      fetchPatches();
    }
  }, [open, equipmentId]);

  const handleTogglePatch = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPatchIds((prev) => [...prev, id]);
    } else {
      setSelectedPatchIds((prev) => prev.filter((pId) => pId !== id));
    }
  };

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      const pendingIds = patches.filter((p) => p.status === 'PENDING').map((p) => p.id);
      setSelectedPatchIds(pendingIds);
    } else {
      setSelectedPatchIds([]);
    }
  };

  const handleApplySelected = async () => {
    if (!equipmentId || selectedPatchIds.length === 0) return;
    try {
      setApplying(true);
      toast.info(`Triggering Zabbix patch update for ${selectedPatchIds.length} package(s)...`);
      await rmmService.applyPatches(equipmentId, selectedPatchIds);
      toast.success('Security patches installed successfully via Zabbix agent!');
      fetchPatches();
      if (onPatchesUpdated) onPatchesUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to apply security patches';
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  const pendingPatches = patches.filter((p) => p.status === 'PENDING');

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <Badge variant="destructive">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'INSTALLED':
        return (
          <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Installed
          </Badge>
        );
      case 'INSTALLING':
        return (
          <Badge className="bg-blue-600 text-white flex items-center gap-1 w-fit">
            <RefreshCw className="w-3 h-3 animate-spin" /> Installing...
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/50 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3" /> Pending
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Patch Management — {deviceName || 'Equipment Device'}
          </DialogTitle>
          <DialogDescription>
            Inspect missing security vulnerabilities, OS updates, and execute remote patch installation through Zabbix RMM agent.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Scanning device patch inventory via Zabbix agent...
            </div>
          ) : (
            <div className="rounded-md border max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={pendingPatches.length > 0 && selectedPatchIds.length === pendingPatches.length}
                        onCheckedChange={(checked) => handleSelectAllPending(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Patch / Advisory ID</TableHead>
                    <TableHead>Title & Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No patch advisories found for this device.
                      </TableCell>
                    </TableRow>
                  ) : (
                    patches.map((patch) => (
                      <TableRow key={patch.id}>
                        <TableCell>
                          <Checkbox
                            disabled={patch.status === 'INSTALLED' || patch.status === 'INSTALLING' || applying}
                            checked={selectedPatchIds.includes(patch.id)}
                            onCheckedChange={(checked) => handleTogglePatch(patch.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{patch.patch_id}</TableCell>
                        <TableCell className="max-w-[280px] text-sm">
                          <p className="font-medium truncate">{patch.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {patch.installed_at ? `Installed on ${new Date(patch.installed_at).toLocaleDateString()}` : 'Ready for deployment'}
                          </p>
                        </TableCell>
                        <TableCell>{getSeverityBadge(patch.severity)}</TableCell>
                        <TableCell>{getStatusBadge(patch.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button
            onClick={handleApplySelected}
            disabled={selectedPatchIds.length === 0 || applying}
            className="gap-2"
          >
            {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Install {selectedPatchIds.length} Selected Update(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
