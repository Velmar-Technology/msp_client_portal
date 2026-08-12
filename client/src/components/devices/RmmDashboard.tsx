import React from "react";
import { useRmmDashboard } from "@/hooks/useRmmDashboard";
import { RmmKpiGrid } from "./RmmKpiGrid";
import { RmmDeviceTable } from "./RmmDeviceTable";
import { PatchManagementModal } from "./PatchManagementModal";

export const RmmDashboard: React.FC = () => {
  const {
    stats,
    devices,
    filteredDevices,
    paginatedDevices,
    loading,
    scanningMap,
    selectedDevice,
    patchModalOpen,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    setSelectedDevices,
    fetchData,
    handleScanDevice,
    handleBulkScan,
    handleBulkExportCSV,
    handleOpenPatchModal,
    setPatchModalOpen,
  } = useRmmDashboard();

  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      {/* 1. Dashboard Header & Quick Actions */}
      {/* <RmmDashboardHeader
        loading={loading}
        onRefresh={fetchData}
      /> */}

      {/* 2. High-Density KPI Metrics Grid */}
      <RmmKpiGrid stats={stats} totalDevicesCount={devices.length} />

      {/* 3. Canonical DataTable with Search, Dropdown Filters, Sorting, Pagination & Bulk Actions */}
      <RmmDeviceTable
        devices={paginatedDevices}
        filteredCount={filteredDevices.length}
        loading={loading}
        scanningMap={scanningMap}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sorting={sorting}
        onSortingChange={setSorting}
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSelectedDevicesChange={setSelectedDevices}
        onScanDevice={handleScanDevice}
        onBulkScan={handleBulkScan}
        onBulkExportCSV={handleBulkExportCSV}
        onOpenPatchModal={handleOpenPatchModal}
      />

      {/* 4. Patch Management Modal */}
      <PatchManagementModal
        open={patchModalOpen}
        onOpenChange={setPatchModalOpen}
        equipmentId={selectedDevice?.id || null}
        deviceName={selectedDevice?.name || null}
        onPatchesUpdated={fetchData}
      />
    </div>
  );
};
