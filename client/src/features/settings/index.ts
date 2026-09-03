/**
 * ADR-002: Public API Gateway for Settings & Preferences feature module.
 * Only public hooks, pages, components, services, and ephemeral UI types should be exported here.
 */

// Pages
export * from './pages/ProfilePage';
export * from './pages/NotificationPreferencesPage';
export * from './pages/PasswordManagerPage';

// Services & API Queries
export * from './api/notificationService';
export * from './api/notificationPreferenceService';
export * from './api/useSettingsQueries';

// Hooks
export * from './hooks/useProfile';
export * from './hooks/useNotificationPreferences';
export * from './hooks/useNotificationHistory';
export * from './hooks/useSettingsFilters';
export * from './hooks/useSettingsModals';

// Ephemeral UI Types
export * from './types';
