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
        options: ['5', '10', '25', '50', '100', '200', 'Unlimited'],
        defaultValue: 'Unlimited',
      },
    ],
  },
  {
    code: 'SECURITY_MONITORING',
    labelKey: 'plans.features.SECURITY_MONITORING',
    defaultParams: { coverage: '24/7 SOC', logRetention: '90 Days' },
    paramSchema: [
      {
        key: 'coverage',
        label: 'Coverage',
        type: 'select',
        options: ['24/7 SOC', '8x5 Business Hours', 'Automated SIEM Only', 'Continuous MDR'],
        defaultValue: '24/7 SOC',
      },
      {
        key: 'logRetention',
        label: 'Log Retention',
        type: 'select',
        options: ['30 Days', '90 Days', '180 Days', '1 Year', '3 Years'],
        defaultValue: '90 Days',
      },
    ],
  },
  {
    code: 'CLOUD_STORAGE',
    labelKey: 'plans.features.CLOUD_STORAGE',
    defaultParams: {
      limit: 25,
      unit: 'GB',
      allocation: 'Per Device',
      provider: 'Nextcloud Private Cloud',
      encryption: 'AES-256 (At-Rest & In-Transit)',
    },
    paramSchema: [
      { key: 'limit', label: 'Limit Amount', type: 'number', defaultValue: 25 },
      { key: 'unit', label: 'Unit', type: 'select', options: ['GB', 'TB'], defaultValue: 'GB' },
    ],
  },
  {
    code: 'BACKUP_INCLUDED',
    labelKey: 'plans.features.BACKUP_INCLUDED',
    defaultParams: { frequency: 'Daily', retention: '30 Days', storageType: 'Cloud Only' },
    paramSchema: [
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'select',
        options: ['Hourly', 'Daily', 'Continuous', 'Real-time Immutable'],
        defaultValue: 'Daily',
      },
      {
        key: 'retention',
        label: 'Retention',
        type: 'select',
        options: ['14 Days', '30 Days', '90 Days', '1 Year', '7 Years'],
        defaultValue: '30 Days',
      },
      {
        key: 'storageType',
        label: 'Storage Target',
        type: 'select',
        options: ['Cloud Only', 'Hybrid (Local + Cloud)', 'Air-Gapped / Immutable'],
        defaultValue: 'Cloud Only',
      },
    ],
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
    defaultParams: { schedule: 'Weekly', scope: 'OS & 3rd-Party Applications' },
    paramSchema: [
      {
        key: 'schedule',
        label: 'Schedule',
        type: 'select',
        options: ['Weekly', 'Bi-weekly', 'Monthly', 'Zero-Day Expedited'],
        defaultValue: 'Weekly',
      },
      {
        key: 'scope',
        label: 'Patch Scope',
        type: 'select',
        options: ['OS Only', 'OS & 3rd-Party Applications', 'Full Infrastructure (Servers + Workstations)'],
        defaultValue: 'OS & 3rd-Party Applications',
      },
    ],
  },
  {
    code: 'ONSITE_SUPPORT',
    labelKey: 'plans.features.ONSITE_SUPPORT',
    defaultParams: { hours: '2', emergencySla: 'Next Business Day (NBD)' },
    paramSchema: [
      { key: 'hours', label: 'Hours per Month', type: 'text', defaultValue: '2' },
      {
        key: 'emergencySla',
        label: 'Dispatch SLA',
        type: 'select',
        options: ['Same-Day (4h)', 'Next Business Day (NBD)', 'Best Effort'],
        defaultValue: 'Next Business Day (NBD)',
      },
    ],
  },
  {
    code: 'CONTENT_FILTERING',
    labelKey: 'plans.features.CONTENT_FILTERING',
    defaultParams: { enforcement: 'DNS-Level', policyTier: 'Standard Security' },
    paramSchema: [
      {
        key: 'enforcement',
        label: 'Enforcement',
        type: 'select',
        options: ['DNS-Level', 'Agent-Based / Roaming', 'Gateway / Firewall'],
        defaultValue: 'DNS-Level',
      },
      {
        key: 'policyTier',
        label: 'Policy Tier',
        type: 'select',
        options: ['Standard Security', 'Strict Compliance', 'Custom Blocklists'],
        defaultValue: 'Standard Security',
      },
    ],
  },
  {
    code: 'PREMIUM_CONTENT_FILTERING',
    labelKey: 'plans.features.PREMIUM_CONTENT_FILTERING',
    defaultParams: { sslInspection: 'Deep Packet SSL Inspection', aiThreatBlocking: 'Real-time AI Shield' },
    paramSchema: [
      {
        key: 'sslInspection',
        label: 'SSL Inspection',
        type: 'select',
        options: ['Deep Packet SSL Inspection', 'Standard DNS Filtering'],
        defaultValue: 'Deep Packet SSL Inspection',
      },
      {
        key: 'aiThreatBlocking',
        label: 'AI Threat Protection',
        type: 'select',
        options: ['Real-time AI Shield', 'Heuristic Analysis', 'Standard Signatures'],
        defaultValue: 'Real-time AI Shield',
      },
    ],
  },
  {
    code: 'EDR_SECURITY',
    labelKey: 'plans.features.EDR_SECURITY',
    defaultParams: { tier: 'EDR with Auto-Remediation', isolation: 'Automated Host Isolation' },
    paramSchema: [
      {
        key: 'tier',
        label: 'Protection Tier',
        type: 'select',
        options: ['Next-Gen Antivirus (NGAV)', 'EDR with Auto-Remediation', 'MDR with 24/7 Threat Hunting SOC'],
        defaultValue: 'EDR with Auto-Remediation',
      },
      {
        key: 'isolation',
        label: 'Host Isolation',
        type: 'select',
        options: ['Automated Host Isolation', 'Admin-Approved Isolation'],
        defaultValue: 'Automated Host Isolation',
      },
    ],
  },
  {
    code: 'M365_BACKUP',
    labelKey: 'plans.features.M365_BACKUP',
    defaultParams: { scope: 'Full Suite (Mail, OneDrive, SharePoint, Teams)', retention: 'Unlimited', backupCadence: '3x Daily' },
    paramSchema: [
      {
        key: 'scope',
        label: 'Backup Scope',
        type: 'select',
        options: ['Full Suite (Mail, OneDrive, SharePoint, Teams)', 'Exchange Mail Only', 'Full Suite + Entra ID'],
        defaultValue: 'Full Suite (Mail, OneDrive, SharePoint, Teams)',
      },
      {
        key: 'retention',
        label: 'Data Retention',
        type: 'select',
        options: ['1 Year', '3 Years', '7 Years', 'Unlimited'],
        defaultValue: 'Unlimited',
      },
      {
        key: 'backupCadence',
        label: 'Cadence',
        type: 'select',
        options: ['3x Daily', '6x Daily', 'Continuous'],
        defaultValue: '3x Daily',
      },
    ],
  },
  {
    code: 'EDR_M365_BACKUP',
    labelKey: 'plans.features.EDR_M365_BACKUP',
    defaultParams: { edrTier: 'Full EDR Standard', m365Retention: 'Unlimited' },
    paramSchema: [
      {
        key: 'edrTier',
        label: 'EDR Tier',
        type: 'select',
        options: ['Full EDR Standard', 'Managed XDR / 24/7 SOC'],
        defaultValue: 'Full EDR Standard',
      },
      {
        key: 'm365Retention',
        label: 'M365 Retention',
        type: 'select',
        options: ['1 Year', '3 Years', 'Unlimited'],
        defaultValue: 'Unlimited',
      },
    ],
  },
  {
    code: 'VULNERABILITY_SCANNING',
    labelKey: 'plans.features.VULNERABILITY_SCANNING',
    defaultParams: { frequency: 'Quarterly', scope: 'External IPs & Domains' },
    paramSchema: [
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Quarterly', 'Monthly', 'Continuous', 'Continuous + Remediation'], defaultValue: 'Quarterly' },
      { key: 'scope', label: 'Scan Scope', type: 'select', options: ['External IPs & Domains', 'Internal + External Network', 'Full Web App & Infrastructure'], defaultValue: 'External IPs & Domains' },
    ],
  },
  {
    code: 'IDENTITY_MFA_MANAGEMENT',
    labelKey: 'plans.features.IDENTITY_MFA_MANAGEMENT',
    defaultParams: { provider: 'Microsoft Entra ID', scope: 'All Users & SaaS Apps' },
    paramSchema: [
      {
        key: 'provider',
        label: 'Identity Provider',
        type: 'select',
        options: ['Microsoft Entra ID', 'Cisco Duo', 'Okta', 'Hardware FIDO2 Keys'],
        defaultValue: 'Microsoft Entra ID',
      },
      {
        key: 'scope',
        label: 'Coverage Scope',
        type: 'select',
        options: ['All Users & SaaS Apps', 'Privileged / Admin Accounts Only', 'Hybrid Workstations + Cloud'],
        defaultValue: 'All Users & SaaS Apps',
      },
    ],
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
    defaultParams: { tier: 'Basic', framework: 'General Best Practices' },
    paramSchema: [
      { key: 'tier', label: 'Audit Scope', type: 'select', options: ['Basic', 'Standard', 'Full Framework'], defaultValue: 'Basic' },
      { key: 'framework', label: 'Compliance Standard', type: 'select', options: ['General Best Practices', 'HIPAA', 'PCI-DSS', 'SOC 2 Type II', 'ISO 27001', 'NIST CSF'], defaultValue: 'General Best Practices' },
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
    defaultParams: { tier: 'Enterprise Vault', vaultSharing: 'Secure Department Folders' },
    paramSchema: [
      {
        key: 'tier',
        label: 'Vault Tier',
        type: 'select',
        options: ['Enterprise Vault', 'Team Business Vault', 'Individual Work Vault'],
        defaultValue: 'Enterprise Vault',
      },
      {
        key: 'vaultSharing',
        label: 'Sharing Scope',
        type: 'select',
        options: ['Secure Department Folders', 'Individual Only'],
        defaultValue: 'Secure Department Folders',
      },
    ],
  },
  {
    code: 'DARK_WEB_MONITORING',
    labelKey: 'plans.features.DARK_WEB_MONITORING',
    defaultParams: { domainCount: '1 Domain', alerting: 'Real-Time Instant Alerts' },
    paramSchema: [
      {
        key: 'domainCount',
        label: 'Monitored Domains',
        type: 'select',
        options: ['1 Domain', '3 Domains', '5 Domains', 'Unlimited Domains'],
        defaultValue: '1 Domain',
      },
      {
        key: 'alerting',
        label: 'Alerting Cadence',
        type: 'select',
        options: ['Real-Time Instant Alerts', 'Weekly Threat Summary'],
        defaultValue: 'Real-Time Instant Alerts',
      },
    ],
  },
  {
    code: 'PASSWORD_DARK_WEB',
    labelKey: 'plans.features.PASSWORD_DARK_WEB',
    defaultParams: { seats: '10 Users' },
    paramSchema: [
      {
        key: 'seats',
        label: 'User Seats',
        type: 'select',
        options: ['5 Users', '10 Users', '25 Users', '50 Users', 'Unlimited Users'],
        defaultValue: '10 Users',
      },
    ],
  },
  {
    code: 'PHISHING_TRAINING',
    labelKey: 'plans.features.PHISHING_TRAINING',
    defaultParams: { frequency: 'Monthly Simulated Campaigns', trainingType: 'Interactive Micro-Modules (2-3 min)' },
    paramSchema: [
      {
        key: 'frequency',
        label: 'Simulation Cadence',
        type: 'select',
        options: ['Monthly Simulated Campaigns', 'Bi-Monthly', 'Quarterly'],
        defaultValue: 'Monthly Simulated Campaigns',
      },
      {
        key: 'trainingType',
        label: 'Content Format',
        type: 'select',
        options: ['Interactive Micro-Modules (2-3 min)', 'Video Simulations', 'Gamified Security Quizzes'],
        defaultValue: 'Interactive Micro-Modules (2-3 min)',
      },
    ],
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
    defaultParams: { note: '' },
    paramSchema: [
      { key: 'note', label: 'Feature Note', type: 'text', defaultValue: '' },
    ],
  },
];
