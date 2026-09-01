export interface FeaturePricingRule {
  baseMonthly?: number;
  perDeviceMonthly?: number;
  paramPricing?: Record<
    string,
    Record<
      string,
      {
        baseMonthly?: number;
        perDeviceMonthly?: number;
      }
    >
  >;
  computeCustomCost?: (params: Record<string, any>, equipmentCount: number) => {
    baseMonthly?: number;
    perDeviceMonthly?: number;
  };
}

export interface FeatureCatalogItem {
  code: string;
  labelKey: string;
  defaultParams?: Record<string, string | number | boolean>;
  pricingRule?: FeaturePricingRule;
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        type: {
          'Chat & Remote Only': { baseMonthly: 30, perDeviceMonthly: 3 },
          '8x5': { baseMonthly: 60, perDeviceMonthly: 5 },
          '24/7/365': { baseMonthly: 150, perDeviceMonthly: 10 },
          'Dedicated Engineer': { baseMonthly: 450, perDeviceMonthly: 20 },
          'VIP Concierge': { baseMonthly: 800, perDeviceMonthly: 35 },
          'Self-Serve / Community': { baseMonthly: 0, perDeviceMonthly: 0 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        coverage: {
          'Automated SIEM Only': { baseMonthly: 30, perDeviceMonthly: 2 },
          '8x5 Business Hours': { baseMonthly: 50, perDeviceMonthly: 3 },
          '24/7 SOC': { baseMonthly: 100, perDeviceMonthly: 6 },
          'Continuous MDR': { baseMonthly: 180, perDeviceMonthly: 10 },
        },
        logRetention: {
          '30 Days': { baseMonthly: 0 },
          '90 Days': { baseMonthly: 15 },
          '180 Days': { baseMonthly: 35 },
          '1 Year': { baseMonthly: 60 },
          '3 Years': { baseMonthly: 120 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 10,
      perDeviceMonthly: 1,
      computeCustomCost: (params) => {
        const rawLimit = Number(params.limit) || 25;
        const unit = params.unit === 'TB' ? 'TB' : 'GB';
        const totalGB = unit === 'TB' ? rawLimit * 1024 : rawLimit;
        // 25GB per device included by default, $0.06/GB for additional
        const additionalGB = Math.max(0, totalGB - 25);
        return {
          baseMonthly: 10,
          perDeviceMonthly: 1 + Math.round(additionalGB * 0.06 * 100) / 100,
        };
      },
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
    pricingRule: {
      baseMonthly: 20,
      perDeviceMonthly: 2,
      paramPricing: {
        frequency: {
          Hourly: { baseMonthly: 15, perDeviceMonthly: 2 },
          Daily: { baseMonthly: 0, perDeviceMonthly: 0 },
          Continuous: { baseMonthly: 25, perDeviceMonthly: 3 },
          'Real-time Immutable': { baseMonthly: 50, perDeviceMonthly: 5 },
        },
        storageType: {
          'Cloud Only': { baseMonthly: 0, perDeviceMonthly: 0 },
          'Hybrid (Local + Cloud)': { baseMonthly: 20, perDeviceMonthly: 2 },
          'Air-Gapped / Immutable': { baseMonthly: 45, perDeviceMonthly: 4 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      paramPricing: {
        level: {
          Bronze: { baseMonthly: 0 },
          Silver: { baseMonthly: 40 },
          Gold: { baseMonthly: 90 },
          Platinum: { baseMonthly: 180 },
        },
      },
    },
    paramSchema: [
      { key: 'level', label: 'SLA Level', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'], defaultValue: 'Bronze' },
      { key: 'response', label: 'Response Time', type: 'select', options: ['8 hours', '4 hours', '2 hours', '1 hour', '30 minutes'], defaultValue: '4 hours' },
    ],
  },
  {
    code: 'RMM_PATCH_MANAGEMENT',
    labelKey: 'plans.features.RMM_PATCH_MANAGEMENT',
    defaultParams: { schedule: 'Weekly', scope: 'OS & 3rd-Party Applications' },
    pricingRule: {
      baseMonthly: 15,
      perDeviceMonthly: 2.5,
      paramPricing: {
        schedule: {
          Weekly: { baseMonthly: 0 },
          'Bi-weekly': { baseMonthly: 0 },
          Monthly: { baseMonthly: 0 },
          'Zero-Day Expedited': { baseMonthly: 25, perDeviceMonthly: 1.5 },
        },
        scope: {
          'OS Only': { perDeviceMonthly: 0 },
          'OS & 3rd-Party Applications': { perDeviceMonthly: 1 },
          'Full Infrastructure (Servers + Workstations)': { baseMonthly: 30, perDeviceMonthly: 3 },
        },
      },
    },
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
    pricingRule: {
      computeCustomCost: (params) => {
        const hours = Number(params.hours) || 2;
        const baseRatePerHour = 65;
        const emergencySla = params.emergencySla;
        const slaSurcharge = emergencySla === 'Same-Day (4h)' ? 40 : emergencySla === 'Best Effort' ? -15 : 0;
        return {
          baseMonthly: Math.max(0, hours * baseRatePerHour + slaSurcharge),
          perDeviceMonthly: 0,
        };
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        enforcement: {
          'DNS-Level': { perDeviceMonthly: 2 },
          'Agent-Based / Roaming': { perDeviceMonthly: 3.5 },
          'Gateway / Firewall': { baseMonthly: 20, perDeviceMonthly: 2.5 },
        },
        policyTier: {
          'Standard Security': { baseMonthly: 0 },
          'Strict Compliance': { baseMonthly: 15, perDeviceMonthly: 0.5 },
          'Custom Blocklists': { baseMonthly: 25 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        sslInspection: {
          'Deep Packet SSL Inspection': { baseMonthly: 20, perDeviceMonthly: 2 },
          'Standard DNS Filtering': { baseMonthly: 0 },
        },
        aiThreatBlocking: {
          'Real-time AI Shield': { baseMonthly: 15, perDeviceMonthly: 1.5 },
          'Heuristic Analysis': { baseMonthly: 5 },
          'Standard Signatures': { baseMonthly: 0 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        tier: {
          'Next-Gen Antivirus (NGAV)': { perDeviceMonthly: 3 },
          'EDR with Auto-Remediation': { perDeviceMonthly: 6 },
          'MDR with 24/7 Threat Hunting SOC': { baseMonthly: 50, perDeviceMonthly: 12 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        scope: {
          'Full Suite (Mail, OneDrive, SharePoint, Teams)': { perDeviceMonthly: 4 },
          'Exchange Mail Only': { perDeviceMonthly: 2.5 },
          'Full Suite + Entra ID': { baseMonthly: 15, perDeviceMonthly: 5.5 },
        },
        retention: {
          '1 Year': { perDeviceMonthly: 0 },
          '3 Years': { perDeviceMonthly: 0.5 },
          '7 Years': { perDeviceMonthly: 1 },
          Unlimited: { perDeviceMonthly: 1.5 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        edrTier: {
          'Full EDR Standard': { perDeviceMonthly: 9 },
          'Managed XDR / 24/7 SOC': { baseMonthly: 60, perDeviceMonthly: 16 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        frequency: {
          Quarterly: { baseMonthly: 30 },
          Monthly: { baseMonthly: 60 },
          Continuous: { baseMonthly: 120, perDeviceMonthly: 1.5 },
          'Continuous + Remediation': { baseMonthly: 200, perDeviceMonthly: 3.5 },
        },
      },
    },
    paramSchema: [
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Quarterly', 'Monthly', 'Continuous', 'Continuous + Remediation'], defaultValue: 'Quarterly' },
      { key: 'scope', label: 'Scan Scope', type: 'select', options: ['External IPs & Domains', 'Internal + External Network', 'Full Web App & Infrastructure'], defaultValue: 'External IPs & Domains' },
    ],
  },
  {
    code: 'IDENTITY_MFA_MANAGEMENT',
    labelKey: 'plans.features.IDENTITY_MFA_MANAGEMENT',
    defaultParams: { provider: 'Microsoft Entra ID', scope: 'All Users & SaaS Apps' },
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        provider: {
          'Microsoft Entra ID': { perDeviceMonthly: 2 },
          'Cisco Duo': { baseMonthly: 15, perDeviceMonthly: 4 },
          Okta: { baseMonthly: 30, perDeviceMonthly: 5.5 },
          'Hardware FIDO2 Keys': { baseMonthly: 50, perDeviceMonthly: 4 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
      paramPricing: {
        tier: {
          Basic: { perDeviceMonthly: 0.5 },
          Standard: { perDeviceMonthly: 1.5 },
          Comprehensive: { baseMonthly: 20, perDeviceMonthly: 2.5 },
          'Corporate Fleet': { baseMonthly: 45, perDeviceMonthly: 4 },
        },
      },
    },
    paramSchema: [
      { key: 'tier', label: 'Tracking Tier', type: 'select', options: ['Basic', 'Standard', 'Comprehensive', 'Corporate Fleet'], defaultValue: 'Standard' },
    ],
  },
  {
    code: 'VCIO_REVIEW',
    labelKey: 'plans.features.VCIO_REVIEW',
    defaultParams: { frequency: 'Annual' },
    pricingRule: {
      baseMonthly: 25,
      paramPricing: {
        frequency: {
          Annual: { baseMonthly: 25 },
          'Semi-Annual': { baseMonthly: 50 },
          Quarterly: { baseMonthly: 100 },
          'Monthly Strategic': { baseMonthly: 250 },
        },
      },
    },
    paramSchema: [
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly Strategic'], defaultValue: 'Annual' },
    ],
  },
  {
    code: 'COMPLIANCE_AUDIT',
    labelKey: 'plans.features.COMPLIANCE_AUDIT',
    defaultParams: { tier: 'Basic', framework: 'General Best Practices' },
    pricingRule: {
      baseMonthly: 30,
      paramPricing: {
        tier: {
          Basic: { baseMonthly: 30 },
          Standard: { baseMonthly: 75 },
          'Full Framework': { baseMonthly: 160 },
        },
        framework: {
          'General Best Practices': { baseMonthly: 0 },
          HIPAA: { baseMonthly: 50 },
          'PCI-DSS': { baseMonthly: 60 },
          'SOC 2 Type II': { baseMonthly: 120 },
          'ISO 27001': { baseMonthly: 140 },
          'NIST CSF': { baseMonthly: 90 },
        },
      },
    },
    paramSchema: [
      { key: 'tier', label: 'Audit Scope', type: 'select', options: ['Basic', 'Standard', 'Full Framework'], defaultValue: 'Basic' },
      { key: 'framework', label: 'Compliance Standard', type: 'select', options: ['General Best Practices', 'HIPAA', 'PCI-DSS', 'SOC 2 Type II', 'ISO 27001', 'NIST CSF'], defaultValue: 'General Best Practices' },
    ],
  },
  {
    code: 'REPORTING_LEVEL',
    labelKey: 'plans.features.REPORTING_LEVEL',
    defaultParams: { level: 'Monthly Standard' },
    pricingRule: {
      baseMonthly: 0,
      paramPricing: {
        level: {
          'Monthly Basic': { baseMonthly: 0 },
          'Monthly Standard': { baseMonthly: 10 },
          'Weekly Detailed': { baseMonthly: 25 },
          'Executive (On-Demand)': { baseMonthly: 50 },
          'Custom / SOC': { baseMonthly: 100 },
        },
      },
    },
    paramSchema: [
      { key: 'level', label: 'Reporting Level', type: 'select', options: ['Monthly Basic', 'Monthly Standard', 'Weekly Detailed', 'Executive (On-Demand)', 'Custom / SOC'], defaultValue: 'Monthly Standard' },
    ],
  },
  {
    code: 'PASSWORD_MANAGER',
    labelKey: 'plans.features.PASSWORD_MANAGER',
    defaultParams: { tier: 'Enterprise Vault', vaultSharing: 'Secure Department Folders' },
    pricingRule: {
      perDeviceMonthly: 3,
      paramPricing: {
        tier: {
          'Individual Work Vault': { perDeviceMonthly: 2 },
          'Team Business Vault': { baseMonthly: 10, perDeviceMonthly: 3.5 },
          'Enterprise Vault': { baseMonthly: 25, perDeviceMonthly: 5 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 20,
      paramPricing: {
        domainCount: {
          '1 Domain': { baseMonthly: 20 },
          '3 Domains': { baseMonthly: 45 },
          '5 Domains': { baseMonthly: 70 },
          'Unlimited Domains': { baseMonthly: 120 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 28,
      paramPricing: {
        seats: {
          '5 Users': { baseMonthly: 15 },
          '10 Users': { baseMonthly: 28 },
          '25 Users': { baseMonthly: 60 },
          '50 Users': { baseMonthly: 110 },
          'Unlimited Users': { baseMonthly: 200 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 20,
      perDeviceMonthly: 1.5,
      paramPricing: {
        frequency: {
          'Monthly Simulated Campaigns': { baseMonthly: 20, perDeviceMonthly: 1.5 },
          'Bi-Monthly': { baseMonthly: 15, perDeviceMonthly: 1 },
          Quarterly: { baseMonthly: 10, perDeviceMonthly: 0.8 },
        },
      },
    },
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
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
    },
    paramSchema: [
      { key: 'percent', label: 'Discount Percent', type: 'select', options: ['5%', '10%', '15%'], defaultValue: '10%' },
    ],
  },
  {
    code: 'CUSTOM_FEATURE',
    labelKey: 'plans.features.CUSTOM_FEATURE',
    defaultParams: { note: '' },
    pricingRule: {
      baseMonthly: 0,
      perDeviceMonthly: 0,
    },
    paramSchema: [
      { key: 'note', label: 'Feature Note', type: 'text', defaultValue: '' },
    ],
  },
];
