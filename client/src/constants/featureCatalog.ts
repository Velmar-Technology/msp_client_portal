export interface FeatureCatalogItem {
  code: string;
  labelKey: string;
  defaultParams?: Record<string, string | number | boolean>;
  paramSchema?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    defaultValue: string | number | boolean;
  }>;
}

export const FEATURE_CATALOG: FeatureCatalogItem[] = [
  {
    code: 'HELPDESK_SUPPORT',
    labelKey: 'plans.features.HELPDESK_SUPPORT',
    defaultParams: { type: '8x5', limit: 'Unlimited' },
    paramSchema: [
      {
        key: 'type',
        label: 'Support Type',
        type: 'select',
        options: ['Chat & Remote Only', '8x5', '24/7/365', 'Dedicated Engineer', 'VIP Concierge', 'Self-Serve / Community'],
        defaultValue: '8x5',
      },
      {
        key: 'limit',
        label: 'Ticket Limit',
        type: 'select',
        options: ['5', '10', '20', '50', '100', 'Unlimited'],
        defaultValue: 'Unlimited',
      },
    ],
  },
  {
    code: 'SECURITY_MONITORING',
    labelKey: 'plans.features.SECURITY_MONITORING',
  },
  {
    code: 'CLOUD_STORAGE',
    labelKey: 'plans.features.CLOUD_STORAGE',
    defaultParams: { limit: 50, unit: 'GB' },
    paramSchema: [
      { key: 'limit', label: 'Limit Amount', type: 'number', defaultValue: 50 },
      { key: 'unit', label: 'Unit', type: 'select', options: ['GB', 'TB'], defaultValue: 'GB' },
    ],
  },
  {
    code: 'BACKUP_INCLUDED',
    labelKey: 'plans.features.BACKUP_INCLUDED',
  },
  {
    code: 'SLA_LEVEL',
    labelKey: 'plans.features.SLA_LEVEL',
    defaultParams: { level: 'Bronze', response: '4 hours' },
    paramSchema: [
      { key: 'level', label: 'SLA Level', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'], defaultValue: 'Bronze' },
      { key: 'response', label: 'Response Time', type: 'select', options: ['8 hours', '4 hours', '2 hours', '1 hour', '30 minutes'], defaultValue: '4 hours' },
    ],
  },
  {
    code: 'RMM_PATCH_MANAGEMENT',
    labelKey: 'plans.features.RMM_PATCH_MANAGEMENT',
  },
  {
    code: 'ONSITE_SUPPORT',
    labelKey: 'plans.features.ONSITE_SUPPORT',
    defaultParams: { hours: '2' },
    paramSchema: [
      { key: 'hours', label: 'Hours per Month', type: 'text', defaultValue: '2' },
    ],
  },
  {
    code: 'CONTENT_FILTERING',
    labelKey: 'plans.features.CONTENT_FILTERING',
  },
  {
    code: 'PREMIUM_CONTENT_FILTERING',
    labelKey: 'plans.features.PREMIUM_CONTENT_FILTERING',
  },
  {
    code: 'EDR_SECURITY',
    labelKey: 'plans.features.EDR_SECURITY',
  },
  {
    code: 'M365_BACKUP',
    labelKey: 'plans.features.M365_BACKUP',
  },
  {
    code: 'EDR_M365_BACKUP',
    labelKey: 'plans.features.EDR_M365_BACKUP',
  },
  {
    code: 'VULNERABILITY_SCANNING',
    labelKey: 'plans.features.VULNERABILITY_SCANNING',
    defaultParams: { frequency: 'Quarterly' },
    paramSchema: [
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Quarterly', 'Monthly', 'Continuous', 'Continuous + Remediation'], defaultValue: 'Quarterly' },
    ],
  },
  {
    code: 'IDENTITY_MFA_MANAGEMENT',
    labelKey: 'plans.features.IDENTITY_MFA_MANAGEMENT',
  },
  {
    code: 'ASSET_LIFECYCLE',
    labelKey: 'plans.features.ASSET_LIFECYCLE',
    defaultParams: { tier: 'Standard' },
    paramSchema: [
      { key: 'tier', label: 'Tracking Tier', type: 'select', options: ['Basic', 'Standard', 'Comprehensive', 'Corporate Fleet'], defaultValue: 'Standard' },
    ],
  },
  {
    code: 'VCIO_REVIEW',
    labelKey: 'plans.features.VCIO_REVIEW',
    defaultParams: { frequency: 'Annual' },
    paramSchema: [
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly Strategic'], defaultValue: 'Annual' },
    ],
  },
  {
    code: 'COMPLIANCE_AUDIT',
    labelKey: 'plans.features.COMPLIANCE_AUDIT',
    defaultParams: { tier: 'Basic' },
    paramSchema: [
      { key: 'tier', label: 'Audit Scope', type: 'select', options: ['Basic', 'Standard', 'Full Framework'], defaultValue: 'Basic' },
    ],
  },
  {
    code: 'REPORTING_LEVEL',
    labelKey: 'plans.features.REPORTING_LEVEL',
    defaultParams: { level: 'Monthly Standard' },
    paramSchema: [
      { key: 'level', label: 'Reporting Level', type: 'select', options: ['Monthly Basic', 'Monthly Standard', 'Weekly Detailed', 'Executive (On-Demand)', 'Custom / SOC'], defaultValue: 'Monthly Standard' },
    ],
  },
  {
    code: 'PASSWORD_MANAGER',
    labelKey: 'plans.features.PASSWORD_MANAGER',
  },
  {
    code: 'DARK_WEB_MONITORING',
    labelKey: 'plans.features.DARK_WEB_MONITORING',
  },
  {
    code: 'PASSWORD_DARK_WEB',
    labelKey: 'plans.features.PASSWORD_DARK_WEB',
  },
  {
    code: 'PHISHING_TRAINING',
    labelKey: 'plans.features.PHISHING_TRAINING',
  },
  {
    code: 'STORE_DISCOUNT',
    labelKey: 'plans.features.STORE_DISCOUNT',
    defaultParams: { percent: '10%' },
    paramSchema: [
      { key: 'percent', label: 'Discount Percent', type: 'select', options: ['5%', '10%', '15%'], defaultValue: '10%' },
    ],
  },
  {
    code: 'CUSTOM_FEATURE',
    labelKey: 'plans.features.CUSTOM_FEATURE',
  },
];
