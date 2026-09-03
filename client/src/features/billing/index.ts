/**
 * ADR-002: Public API Gateway for Billing feature module.
 * Only public hooks, pages, components, and ephemeral UI types should be exported here.
 */

// Pages
export * from './pages/BillingPage';

// Components
export * from './components/PayModal';
export * from './components/MarkPaidConfirmModal';
export * from './components/CancelInvoiceConfirmModal';
export * from './components/InvoiceDetailsModal';

// Hooks & Queries
export * from './api/invoiceService';
export * from './api/useBillingQueries';
export * from './hooks/useBilling';

// Ephemeral UI Types
export * from './types';
