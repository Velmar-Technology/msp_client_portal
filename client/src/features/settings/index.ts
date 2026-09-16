/**
 * ADR-002: Public API Gateway for Settings & Preferences feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Services & API Queries
export * from './api/notificationService';
export * from './api/notificationPreferenceService';
export * from './api/useSettingsQueries';
export * from './api/byok';

// Pages
export * from './pages/ByokSettingsPage';

// Hooks
export * from './hooks/useProfile';
export * from './hooks/useNotificationPreferences';
export * from './hooks/useNotificationHistory';
export * from './hooks/useSettingsFilters';
export * from './hooks/useSettingsModals';

// Ephemeral UI Types
export * from './types';
