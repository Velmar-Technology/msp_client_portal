# SequenceSentinel Integrity Diagnostic Report
**Generated:** 2026-09-11T17:41:25.883Z
**Audit Window:** 2026-09-04T17:41:24.774Z to 2026-09-11T17:41:24.774Z
**Total Sequences Evaluated:** 2178
**Total Violations Detected:** 111

## Business Logic Scorecard (BL-101 to BL-802)
| Rule Code | Rule Name | Category | Evaluated | Violations | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **BL-101** | 1-Hour SLA Cancellation Constraint | TICKETING | 55 | 0 | ✅ PASS |
| **BL-102** | Round-Robin Dispatch & Assignment Rule | TICKETING | 55 | 0 | ✅ PASS |
| **BL-103** | Alert Noise, Auto-Remediation & Flapping Rule | TICKETING | 614 | 74 | ⚠️ WARN |
| **BL-104** | Capacity-Weighted Tier Escalation Timing Rule | TICKETING | 55 | 0 | ✅ PASS |
| **BL-201** | Monthly Plan Ticket Quota Rule | SUBSCRIPTIONS | 30 | 0 | ✅ PASS |
| **BL-202** | License True-Up Reconciliation Rule | SUBSCRIPTIONS | 1005 | 0 | ✅ PASS |
| **BL-204** | Feature Gating & Entitlements Rule | SUBSCRIPTIONS | 2178 | 0 | ✅ PASS |
| **BL-205** | Device-Bound Vault Security & Credential Isolation | SUBSCRIPTIONS | 614 | 0 | ✅ PASS |
| **BL-301** | RBAC & Lifecycle State Machine Invariant Rule | SECURITY | 55 | 31 | ❌ FAIL |
| **BL-302** | Hybrid Authorization, ZSP & Ephemeral Grant Rule | SECURITY | 2178 | 0 | ✅ PASS |
| **BL-401** | Subscription Reactivation on Payment Rule | BILLING | 1005 | 0 | ✅ PASS |
| **BL-402** | Subscription Renewal Scheduler & Hardware Multiplier Rule | BILLING | 1005 | 0 | ✅ PASS |
| **BL-701** | 18% ITBIS Tax & B01 NCF Voucher Rule | BILLING | 1005 | 0 | ✅ PASS |
| **BL-702** | 4-Tier Overdue Non-Payment Enforcement Scale | BILLING | 2178 | 0 | ✅ PASS |
| **BL-801** | Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule | FINANCIAL | 55 | 6 | ❌ FAIL |
| **BL-802** | 70/30 Net Profit Split Rule | FINANCIAL | 2178 | 0 | ✅ PASS |
| **BL-501** | CRM Lead Pipeline & Tenant Auto-Provisioning Rule | CRM_HEALTH | 504 | 0 | ✅ PASS |
| **BL-601** | Account Health Score & QBR Review Flag Rule | CRM_HEALTH | 2178 | 0 | ✅ PASS |

## Violation Details & Evidence
### 1. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00065` (Tenant: `d2206696-d2f5-43d7-9b6c-6a76eee8b625`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00065' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00065",
  "alertId": "35124bd0-9c9b-4f62-b24a-e6e89250b781",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 2. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00460` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00460' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00460",
  "alertId": "4afc37a0-fa7e-46b3-80d7-924d61418f16",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 3. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00293` (Tenant: `a4495791-313e-4b6e-a3ac-555627e9b5fc`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00293' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00293",
  "alertId": "559779da-9de1-40ee-bcd2-222934fdaea1",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 4. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00611` (Tenant: `3f02a1e9-86aa-48e4-8751-6646371a61a1`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00611' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00611",
  "alertId": "e522716b-d104-42cb-8954-1be5bb1e897d",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 5. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00232` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00232' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00232",
  "alertId": "fb0c2738-c338-4f8f-8b94-139b87f5dac9",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 6. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00054` (Tenant: `6cef571e-e231-45f0-9ee4-f988cea08195`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00054' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00054",
  "alertId": "a2db0f76-6127-4714-9485-bd1973dd6df3",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 7. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00467` (Tenant: `ec829182-e38d-4abc-ae8d-b42ef120b93a`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00467' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00467",
  "alertId": "fd62859b-8644-4575-becf-6b23c485b3e7",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 8. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00883` (Tenant: `3978078a-93c9-4955-8c1f-43bbd56c6d9f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00883' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00883",
  "alertId": "ccbe1b2c-08b7-486e-a358-5381070233a3",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 9. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00411` (Tenant: `5f2e6f26-1e29-43fa-8701-a7ba004927b6`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00411' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00411",
  "alertId": "0e83fc9d-295b-4cf7-8095-c9f191e6d260",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 10. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00085` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00085' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00085",
  "alertId": "48f0fb21-7fa7-4973-a6dd-087d6a19e359",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 11. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00224` (Tenant: `d12af3c8-dc0d-41e1-9029-72d831764c8f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00224' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00224",
  "alertId": "7b1b7f5f-de5e-4ca2-9196-eb8e9f9da6ab",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 12. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00238` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00238' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00238",
  "alertId": "64922949-d7b7-44c4-9a19-e9a4bdcc1bf4",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 13. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00700` (Tenant: `6144fe88-26b1-4289-9d4f-8501ad6a75e0`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00700' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00700",
  "alertId": "d21dbfe6-7b8e-4237-98da-575804e50917",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 14. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00134` (Tenant: `3717aad7-7741-46be-8977-0f6897f3e0b3`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00134' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00134",
  "alertId": "57768747-798c-4838-9aeb-dd0c2f28547f",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 15. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00242` (Tenant: `e380ea63-4859-4c87-aea2-2323355fa9aa`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00242' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00242",
  "alertId": "963b03cc-58b4-4775-a1af-93d58bba90c2",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 16. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00050` (Tenant: `9b7461d9-2d6e-45e3-808d-361130099c2c`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00050' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00050",
  "alertId": "d9b4e7a8-9d77-4305-a99d-3aba6111b3ff",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 17. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00148` (Tenant: `75d588d4-e259-4770-a86c-9c785deb359c`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00148' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00148",
  "alertId": "852b12be-b85e-4b33-9cc8-b912148597c2",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 18. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00026` (Tenant: `bf9888e5-405d-42d6-afbb-6b0cf79c4bd4`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00026' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00026",
  "alertId": "01d19f6f-c52c-4282-82e2-c545900d392d",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 19. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00694` (Tenant: `d56b5812-cf72-48fe-8af9-0e306d5557c9`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00694' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00694",
  "alertId": "00ca00d6-0d86-4ed1-9379-b6062474cac7",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 20. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00855` (Tenant: `3978078a-93c9-4955-8c1f-43bbd56c6d9f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00855' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00855",
  "alertId": "5dfa9236-cc7b-4599-8331-03607b92e195",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 21. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00253` (Tenant: `d336f16e-af8e-430c-998b-96416759bdad`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00253' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00253",
  "alertId": "5e8f0f19-2cc0-443e-a678-153037cc8777",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 22. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00989` (Tenant: `769eddd0-87b0-4f74-93da-bfb481dab9cf`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00989' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00989",
  "alertId": "005f61d3-2b22-4e40-b3b7-15736e09ebf9",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 23. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00397` (Tenant: `92a12a25-9d61-40b7-acaa-6bdae7c0f310`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00397' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00397",
  "alertId": "97d994dd-b37c-43d0-949c-f93fe35a4d84",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 24. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00056` (Tenant: `9284eef9-cea0-4335-8dd9-0c990ef146cf`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00056' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00056",
  "alertId": "1dfccae0-961a-4c09-8eec-34a3af0a8bd8",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 25. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00874` (Tenant: `5f2e6f26-1e29-43fa-8701-a7ba004927b6`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00874' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00874",
  "alertId": "409ab834-2eb8-484a-b2a3-8d3386a09574",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 26. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00910` (Tenant: `3aae7820-9dfc-46b8-b24b-1982105f191b`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00910' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00910",
  "alertId": "38fed5ab-73ae-4052-9ea6-f86326e04d3c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 27. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00599` (Tenant: `a772c863-d879-4a71-889f-b34d59b06bf2`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00599' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00599",
  "alertId": "2b860325-236a-4f22-aaf5-9e884fb10a3c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 28. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00768` (Tenant: `cc8e1216-fb5d-42d8-85af-24edbf2241cf`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00768' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00768",
  "alertId": "ee016db6-c677-40e3-8345-730293bad95c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 29. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00277` (Tenant: `69e66464-0977-495f-aff6-6454ac690072`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00277' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00277",
  "alertId": "6a7733df-9c8b-40d1-90d2-b2d7efe6406a",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 30. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00125` (Tenant: `1d1d9127-c7dc-45f8-b8a9-5535c097c3bd`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00125' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00125",
  "alertId": "4474a6c2-3bfb-4413-ac05-26d305b9c121",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 31. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00774` (Tenant: `c01cd0b3-64b6-452a-97ca-1eb026bfbfc0`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00774' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00774",
  "alertId": "f43ab0ab-0b63-4a40-a65a-b607b1cba87c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 32. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00968` (Tenant: `92a12a25-9d61-40b7-acaa-6bdae7c0f310`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00968' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00968",
  "alertId": "e902cbf7-92ed-46b0-8c43-d6748445021d",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 33. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00036` (Tenant: `62411d5e-a56a-4868-a0b6-b2b916ced699`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00036' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00036",
  "alertId": "67adb35e-0712-4acf-bf71-24c6c9e8e1cb",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 34. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00724` (Tenant: `92a12a25-9d61-40b7-acaa-6bdae7c0f310`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00724' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00724",
  "alertId": "30ded10a-67f3-4012-8968-f41b281a464b",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 35. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00748` (Tenant: `69e66464-0977-495f-aff6-6454ac690072`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00748' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00748",
  "alertId": "da68072d-b154-4f65-8538-c2dd7fb20ad2",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 36. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00117` (Tenant: `69e66464-0977-495f-aff6-6454ac690072`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00117' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00117",
  "alertId": "089fa063-0583-47f3-830b-2403bedb5609",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 37. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00297` (Tenant: `1a3aa1a0-cf7d-46bf-9e82-50901fda1708`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00297' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00297",
  "alertId": "de877315-8937-471c-a14e-e757508a0f21",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 38. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00127` (Tenant: `69e66464-0977-495f-aff6-6454ac690072`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00127' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00127",
  "alertId": "d964e8d7-f1fd-4ea8-807d-faba38bf8748",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 39. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00663` (Tenant: `82e9504a-00e9-4eaf-b733-526d374b31b0`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00663' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00663",
  "alertId": "0f8cd4e4-749a-46ad-8b6b-1c59a361f4e1",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 40. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00955` (Tenant: `54c29f8e-e129-4700-b3b7-ccf56b5af05f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00955' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00955",
  "alertId": "b57837d5-1142-4e07-b226-63762485cade",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 41. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00077` (Tenant: `e380ea63-4859-4c87-aea2-2323355fa9aa`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00077' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00077",
  "alertId": "5d2daf29-2756-4d10-b824-3ab54fb0dbe2",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 42. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00112` (Tenant: `75d588d4-e259-4770-a86c-9c785deb359c`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00112' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00112",
  "alertId": "180036cc-3bfd-405e-be07-21ea431c76d4",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 43. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00926` (Tenant: `9b7461d9-2d6e-45e3-808d-361130099c2c`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00926' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00926",
  "alertId": "ac096b57-95d3-41dd-b80a-ec8fcff47dbc",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 44. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00795` (Tenant: `1d1d9127-c7dc-45f8-b8a9-5535c097c3bd`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00795' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00795",
  "alertId": "2f68e345-1971-4088-9c42-8ec92583af79",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 45. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00374` (Tenant: `fa6b4b09-047e-4229-b875-788256853d9d`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00374' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00374",
  "alertId": "26b0f0c2-143e-409b-8337-2ec0df262d6e",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 46. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00743` (Tenant: `d56b5812-cf72-48fe-8af9-0e306d5557c9`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00743' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00743",
  "alertId": "4025aeeb-a045-45d5-bc97-9248d47ed5c5",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 47. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00068` (Tenant: `f713304d-030e-4d3c-8d99-831767143eba`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00068' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00068",
  "alertId": "d883e015-6ee0-4ef7-af31-2de6972802b3",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 48. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00540` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00540' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00540",
  "alertId": "411025ce-401d-4884-88cf-230fb8359fd1",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 49. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00954` (Tenant: `54c29f8e-e129-4700-b3b7-ccf56b5af05f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00954' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00954",
  "alertId": "c28fd05d-d897-4606-99f5-d65ea34fb9c0",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 50. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00840` (Tenant: `13070b0b-a5a7-4f27-969e-418b9a1749f5`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00840' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00840",
  "alertId": "53791626-fc9a-487c-9b7e-555a360b339f",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 51. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00617` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00617' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00617",
  "alertId": "d8751715-6f8d-48d3-8015-84612d238987",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 52. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00685` (Tenant: `e380ea63-4859-4c87-aea2-2323355fa9aa`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00685' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00685",
  "alertId": "b7ebc1df-61c3-4cf1-a81b-66e51d2e724c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 53. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00945` (Tenant: `75d588d4-e259-4770-a86c-9c785deb359c`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00945' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00945",
  "alertId": "83ebedc2-ec8d-41e9-8558-202c42fe3562",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 54. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00631` (Tenant: `a6e40eeb-83b5-412f-80fa-b0e5d73c9db3`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00631' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00631",
  "alertId": "ea61f7a1-be23-4a01-9caa-a9a69f8f1170",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "DEVICE_OFFLINE_WARNING"
}
```

### 55. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00512` (Tenant: `769eddd0-87b0-4f74-93da-bfb481dab9cf`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00512' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00512",
  "alertId": "09c699d6-8020-4481-8fa3-74707191d4f9",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 56. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00019` (Tenant: `6144fe88-26b1-4289-9d4f-8501ad6a75e0`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00019' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00019",
  "alertId": "6447d69e-d471-40b4-85c9-b2d3a65a9801",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 57. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00987` (Tenant: `769eddd0-87b0-4f74-93da-bfb481dab9cf`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00987' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00987",
  "alertId": "bcfaf177-8b0c-44b7-a6a2-124293b80f46",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 58. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00618` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00618' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00618",
  "alertId": "05d124dd-f12d-48fd-8459-0a2f5a38dba0",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 59. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00785` (Tenant: `bf9888e5-405d-42d6-afbb-6b0cf79c4bd4`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00785' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00785",
  "alertId": "9a225dab-c7df-4428-9cab-533adc338e0f",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 60. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00854` (Tenant: `3978078a-93c9-4955-8c1f-43bbd56c6d9f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00854' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00854",
  "alertId": "30a12fbf-c0ba-470a-9d71-31efffc0d7c0",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 61. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00367` (Tenant: `54c29f8e-e129-4700-b3b7-ccf56b5af05f`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00367' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00367",
  "alertId": "df86aaf1-b089-4a1c-94b4-cea46a32dbd1",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 62. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00907` (Tenant: `3aae7820-9dfc-46b8-b24b-1982105f191b`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00907' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00907",
  "alertId": "596a9550-6be1-4b5f-be13-d12584f84539",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 63. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00069` (Tenant: `f713304d-030e-4d3c-8d99-831767143eba`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00069' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00069",
  "alertId": "cfc00d5c-19d8-43c1-8b93-f9f1542ede3f",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 64. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00459` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00459' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00459",
  "alertId": "9ea6f171-9c92-4fe5-b867-690f7a459902",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 65. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00711` (Tenant: `94c7d175-8944-4f2b-88b3-127f491788b4`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00711' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00711",
  "alertId": "6684eb7c-e6eb-45a2-98f3-37e376d5b7fe",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 66. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00141` (Tenant: `1a3aa1a0-cf7d-46bf-9e82-50901fda1708`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00141' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00141",
  "alertId": "f4dad7ea-17ba-4059-982e-3317c675fa6a",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 67. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00066` (Tenant: `f713304d-030e-4d3c-8d99-831767143eba`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00066' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00066",
  "alertId": "bc1b2a14-409d-4790-8d05-5d917ab03cc0",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 68. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00193` (Tenant: `a4495791-313e-4b6e-a3ac-555627e9b5fc`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00193' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00193",
  "alertId": "ffeeef0b-8827-4afa-b7f0-4dfa6460c442",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 69. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00163` (Tenant: `6cef571e-e231-45f0-9ee4-f988cea08195`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00163' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00163",
  "alertId": "b537cc2d-226e-4ea2-90ca-8d90e2dae42e",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 70. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00466` (Tenant: `ec829182-e38d-4abc-ae8d-b42ef120b93a`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00466' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00466",
  "alertId": "2a106354-cd1e-4615-b858-6f6ff4a3a4eb",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 71. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00388` (Tenant: `ec829182-e38d-4abc-ae8d-b42ef120b93a`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00388' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00388",
  "alertId": "8b89726d-760f-4e81-bf0e-51d0d02611f8",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 72. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00192` (Tenant: `a4495791-313e-4b6e-a3ac-555627e9b5fc`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00192' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00192",
  "alertId": "88def773-b80c-4b9a-a3ac-6afd5e18fc38",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "SERVICE_CRASH"
}
```

### 73. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00606` (Tenant: `a4495791-313e-4b6e-a3ac-555627e9b5fc`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00606' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00606",
  "alertId": "f1e99d76-27f0-4d4b-aa0d-88469828de9c",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "LOW_DISK_SPACE"
}
```

### 74. [HIGH] BL-103: Alert Noise, Auto-Remediation & Flapping Rule
- **Entity:** `DEVICE WS-00424` (Tenant: `997faf20-02d9-451f-afd4-f9dffd755ad3`)
- **Violated At:** 2026-09-07T15:34:31.720Z
- **Rationale:** Device 'WS-00424' triggered 3 alert instances within 24h but was not tagged with '[FLAPPING_ALERT]' (BL-103).
```json
{
  "deviceId": "WS-00424",
  "alertId": "abc6e54b-92f3-408c-8dcd-718428791b4e",
  "triggerCount": 3,
  "timeWindowHours": 0,
  "lastAlertTitle": "HIGH_CPU_LOAD"
}
```

### 75. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 55555555-5555-5555-5555-555555555555` (Tenant: `bc333333-3333-3333-3333-333333333333`)
- **Violated At:** 2026-09-07T10:34:29.956Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'RESOLVED_AUTOMATED' on ticket '55555555-5555-5555-5555-555555555555' (BL-301).
```json
{
  "ticketId": "55555555-5555-5555-5555-555555555555",
  "oldStatus": "OPEN",
  "newStatus": "RESOLVED_AUTOMATED",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

### 76. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 20f152df-24e7-481c-8c4f-516e7ad92135` (Tenant: `f4630823-372f-46cf-a2df-d08eebd48070`)
- **Violated At:** 2026-08-13T08:31:38.844Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '20f152df-24e7-481c-8c4f-516e7ad92135' (BL-301).
```json
{
  "ticketId": "20f152df-24e7-481c-8c4f-516e7ad92135",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

### 77. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 20f152df-24e7-481c-8c4f-516e7ad92135` (Tenant: `f4630823-372f-46cf-a2df-d08eebd48070`)
- **Violated At:** 2026-08-16T18:53:35.681Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '20f152df-24e7-481c-8c4f-516e7ad92135' (BL-301).
```json
{
  "ticketId": "20f152df-24e7-481c-8c4f-516e7ad92135",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "7519cf12-6aa1-4a4d-8dc1-74c493aefa1c"
}
```

### 78. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET e8aa5dfd-7985-4acd-8c1d-0dc903cd02f3` (Tenant: `009a3ca7-c9f9-4311-afdf-0abc628afc7d`)
- **Violated At:** 2026-09-01T03:48:19.463Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'e8aa5dfd-7985-4acd-8c1d-0dc903cd02f3' (BL-301).
```json
{
  "ticketId": "e8aa5dfd-7985-4acd-8c1d-0dc903cd02f3",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "7519cf12-6aa1-4a4d-8dc1-74c493aefa1c"
}
```

### 79. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 9edd4359-8ea5-4af1-8127-f30035c3744b` (Tenant: `9b7461d9-2d6e-45e3-808d-361130099c2c`)
- **Violated At:** 2026-09-02T09:58:12.631Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '9edd4359-8ea5-4af1-8127-f30035c3744b' (BL-301).
```json
{
  "ticketId": "9edd4359-8ea5-4af1-8127-f30035c3744b",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

### 80. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET ba097cf2-d2f6-49dd-82e8-04d7c7afcddc` (Tenant: `cc8e1216-fb5d-42d8-85af-24edbf2241cf`)
- **Violated At:** 2026-08-19T18:17:43.821Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'ba097cf2-d2f6-49dd-82e8-04d7c7afcddc' (BL-301).
```json
{
  "ticketId": "ba097cf2-d2f6-49dd-82e8-04d7c7afcddc",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "005baebd-f6ba-4079-906f-b9cd8c1d7f2c"
}
```

### 81. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET ba097cf2-d2f6-49dd-82e8-04d7c7afcddc` (Tenant: `cc8e1216-fb5d-42d8-85af-24edbf2241cf`)
- **Violated At:** 2026-08-21T12:17:38.392Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'ba097cf2-d2f6-49dd-82e8-04d7c7afcddc' (BL-301).
```json
{
  "ticketId": "ba097cf2-d2f6-49dd-82e8-04d7c7afcddc",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "1599dd70-8e17-4c8f-9efa-2008ee7fae47"
}
```

### 82. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 33333333-3333-3333-3333-333333333333` (Tenant: `bc111111-1111-1111-1111-111111111111`)
- **Violated At:** 2026-09-06T21:34:29.956Z
- **Rationale:** Disallowed state transition from 'IN_PROGRESS' to 'AWAITING_PAYMENT' on ticket '33333333-3333-3333-3333-333333333333' (BL-301).
```json
{
  "ticketId": "33333333-3333-3333-3333-333333333333",
  "oldStatus": "IN_PROGRESS",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "WAITING_ON_CLIENT",
    "RESOLVED",
    "CLOSED",
    "CANCELLED"
  ],
  "actorId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

### 83. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 0c49f933-7556-48ac-85e4-7ac1e9e64caa` (Tenant: `1d1d9127-c7dc-45f8-b8a9-5535c097c3bd`)
- **Violated At:** 2026-08-17T06:18:37.327Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '0c49f933-7556-48ac-85e4-7ac1e9e64caa' (BL-301).
```json
{
  "ticketId": "0c49f933-7556-48ac-85e4-7ac1e9e64caa",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "b7c3d846-2e77-4a96-8ed4-b1387c80030e"
}
```

### 84. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 7cf4a7e5-b3a2-4b81-b87d-f8d1f8f4638c` (Tenant: `deee0991-a8b7-4ac5-9b08-bb051ebbfed5`)
- **Violated At:** 2026-09-03T16:13:34.743Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '7cf4a7e5-b3a2-4b81-b87d-f8d1f8f4638c' (BL-301).
```json
{
  "ticketId": "7cf4a7e5-b3a2-4b81-b87d-f8d1f8f4638c",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "0c49f729-bcd5-4f64-bdee-ae6cfd05d587"
}
```

### 85. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 97559129-f239-42fa-baa8-53133673b865` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-08-23T12:19:56.294Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '97559129-f239-42fa-baa8-53133673b865' (BL-301).
```json
{
  "ticketId": "97559129-f239-42fa-baa8-53133673b865",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

### 86. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 97559129-f239-42fa-baa8-53133673b865` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-08-29T23:40:13.928Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '97559129-f239-42fa-baa8-53133673b865' (BL-301).
```json
{
  "ticketId": "97559129-f239-42fa-baa8-53133673b865",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "f6a7b8c9-d0e1-2345-fabc-456789012345"
}
```

### 87. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 3e823577-bad5-4cd2-82d1-c1772ff78aef` (Tenant: `deee0991-a8b7-4ac5-9b08-bb051ebbfed5`)
- **Violated At:** 2026-08-09T13:53:30.835Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '3e823577-bad5-4cd2-82d1-c1772ff78aef' (BL-301).
```json
{
  "ticketId": "3e823577-bad5-4cd2-82d1-c1772ff78aef",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "005baebd-f6ba-4079-906f-b9cd8c1d7f2c"
}
```

### 88. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 5290abb4-6a5f-4b12-817c-052fd473af05` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-08-20T10:02:03.041Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '5290abb4-6a5f-4b12-817c-052fd473af05' (BL-301).
```json
{
  "ticketId": "5290abb4-6a5f-4b12-817c-052fd473af05",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "0c49f729-bcd5-4f64-bdee-ae6cfd05d587"
}
```

### 89. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET e4c1d61d-0b3f-4557-8727-7b3fd38f5df0` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-08-31T20:55:01.336Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'e4c1d61d-0b3f-4557-8727-7b3fd38f5df0' (BL-301).
```json
{
  "ticketId": "e4c1d61d-0b3f-4557-8727-7b3fd38f5df0",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "54c01e3f-6205-4d86-98c0-c5c4ea33e187"
}
```

### 90. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET dab10e4c-ed5b-45f2-ad3d-d00995c15b83` (Tenant: `d38b91b6-0756-439d-9a20-1b8c4e8bca82`)
- **Violated At:** 2026-08-20T19:56:44.328Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'dab10e4c-ed5b-45f2-ad3d-d00995c15b83' (BL-301).
```json
{
  "ticketId": "dab10e4c-ed5b-45f2-ad3d-d00995c15b83",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "0c49f729-bcd5-4f64-bdee-ae6cfd05d587"
}
```

### 91. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 296cb349-2155-4eab-a246-399c58ad4088` (Tenant: `c01cd0b3-64b6-452a-97ca-1eb026bfbfc0`)
- **Violated At:** 2026-08-11T20:19:30.124Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '296cb349-2155-4eab-a246-399c58ad4088' (BL-301).
```json
{
  "ticketId": "296cb349-2155-4eab-a246-399c58ad4088",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "4487ed2e-1bb3-444b-8f96-d439ec7e1f09"
}
```

### 92. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET b919b200-1b3d-4dc5-9abc-3696f543fbde` (Tenant: `9284eef9-cea0-4335-8dd9-0c990ef146cf`)
- **Violated At:** 2026-08-09T10:51:42.672Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'b919b200-1b3d-4dc5-9abc-3696f543fbde' (BL-301).
```json
{
  "ticketId": "b919b200-1b3d-4dc5-9abc-3696f543fbde",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "3c746f4b-a904-4950-bf9e-2e0f5fb9c8c9"
}
```

### 93. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET a3608c5c-8898-40e6-ab2b-f72fba194a93` (Tenant: `f3cbf05a-b1dc-444f-a2a7-46f66886a490`)
- **Violated At:** 2026-08-16T04:06:13.271Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'a3608c5c-8898-40e6-ab2b-f72fba194a93' (BL-301).
```json
{
  "ticketId": "a3608c5c-8898-40e6-ab2b-f72fba194a93",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

### 94. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 85c6a698-6049-4633-a3f8-560211407669` (Tenant: `3f02a1e9-86aa-48e4-8751-6646371a61a1`)
- **Violated At:** 2026-08-11T17:13:13.602Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '85c6a698-6049-4633-a3f8-560211407669' (BL-301).
```json
{
  "ticketId": "85c6a698-6049-4633-a3f8-560211407669",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "f6a7b8c9-d0e1-2345-fabc-456789012345"
}
```

### 95. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 85c6a698-6049-4633-a3f8-560211407669` (Tenant: `3f02a1e9-86aa-48e4-8751-6646371a61a1`)
- **Violated At:** 2026-08-15T04:07:38.681Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '85c6a698-6049-4633-a3f8-560211407669' (BL-301).
```json
{
  "ticketId": "85c6a698-6049-4633-a3f8-560211407669",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "4487ed2e-1bb3-444b-8f96-d439ec7e1f09"
}
```

### 96. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 85c6a698-6049-4633-a3f8-560211407669` (Tenant: `3f02a1e9-86aa-48e4-8751-6646371a61a1`)
- **Violated At:** 2026-08-20T18:59:05.874Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '85c6a698-6049-4633-a3f8-560211407669' (BL-301).
```json
{
  "ticketId": "85c6a698-6049-4633-a3f8-560211407669",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "17489bc6-78d3-4874-8051-d21b714c1805"
}
```

### 97. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 85c6a698-6049-4633-a3f8-560211407669` (Tenant: `3f02a1e9-86aa-48e4-8751-6646371a61a1`)
- **Violated At:** 2026-09-05T12:22:15.689Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '85c6a698-6049-4633-a3f8-560211407669' (BL-301).
```json
{
  "ticketId": "85c6a698-6049-4633-a3f8-560211407669",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "54c01e3f-6205-4d86-98c0-c5c4ea33e187"
}
```

### 98. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET fd85831a-8f91-4e9d-986c-88e0c6229eb8` (Tenant: `a4495791-313e-4b6e-a3ac-555627e9b5fc`)
- **Violated At:** 2026-08-23T08:24:02.453Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'fd85831a-8f91-4e9d-986c-88e0c6229eb8' (BL-301).
```json
{
  "ticketId": "fd85831a-8f91-4e9d-986c-88e0c6229eb8",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "0608d34f-ea8c-4a39-ab82-312d275c0430"
}
```

### 99. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 3439d91e-65fb-4faa-a253-1b16d9bd75be` (Tenant: `3aae7820-9dfc-46b8-b24b-1982105f191b`)
- **Violated At:** 2026-09-05T15:51:41.709Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '3439d91e-65fb-4faa-a253-1b16d9bd75be' (BL-301).
```json
{
  "ticketId": "3439d91e-65fb-4faa-a253-1b16d9bd75be",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "eddc1ad3-fb91-46a5-ab49-949bca600c8e"
}
```

### 100. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 8d6359e1-3931-439f-ba8b-f05c6a760efc` (Tenant: `5f2e6f26-1e29-43fa-8701-a7ba004927b6`)
- **Violated At:** 2026-08-28T02:49:18.499Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '8d6359e1-3931-439f-ba8b-f05c6a760efc' (BL-301).
```json
{
  "ticketId": "8d6359e1-3931-439f-ba8b-f05c6a760efc",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "e2e957d8-2a72-43d1-a6e4-3db9ee121bf4"
}
```

### 101. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 9d533c37-f835-4f29-ac54-a6694f3b0e36` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-08-14T10:02:10.285Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '9d533c37-f835-4f29-ac54-a6694f3b0e36' (BL-301).
```json
{
  "ticketId": "9d533c37-f835-4f29-ac54-a6694f3b0e36",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "7519cf12-6aa1-4a4d-8dc1-74c493aefa1c"
}
```

### 102. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET ed036d4f-f5ff-43d5-aeb7-60e8295c98f4` (Tenant: `1a3aa1a0-cf7d-46bf-9e82-50901fda1708`)
- **Violated At:** 2026-08-20T11:08:26.027Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'ed036d4f-f5ff-43d5-aeb7-60e8295c98f4' (BL-301).
```json
{
  "ticketId": "ed036d4f-f5ff-43d5-aeb7-60e8295c98f4",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

### 103. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 829693b1-f5cb-4a2f-ba90-ea57cb37f0b0` (Tenant: `9284eef9-cea0-4335-8dd9-0c990ef146cf`)
- **Violated At:** 2026-08-30T21:02:05.539Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '829693b1-f5cb-4a2f-ba90-ea57cb37f0b0' (BL-301).
```json
{
  "ticketId": "829693b1-f5cb-4a2f-ba90-ea57cb37f0b0",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "7519cf12-6aa1-4a4d-8dc1-74c493aefa1c"
}
```

### 104. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET 7d8b702c-c1bc-47aa-8932-cb21b129ea41` (Tenant: `6144fe88-26b1-4289-9d4f-8501ad6a75e0`)
- **Violated At:** 2026-08-31T20:03:46.346Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket '7d8b702c-c1bc-47aa-8932-cb21b129ea41' (BL-301).
```json
{
  "ticketId": "7d8b702c-c1bc-47aa-8932-cb21b129ea41",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "a1d55bb2-a7b2-4ea2-90f6-84dbbda6d191"
}
```

### 105. [CRITICAL] BL-301: RBAC & Lifecycle State Machine Invariant Rule
- **Entity:** `TICKET ed3bb5de-67fa-43bb-9ed5-c9464c917f2c` (Tenant: `3aae7820-9dfc-46b8-b24b-1982105f191b`)
- **Violated At:** 2026-08-31T21:35:25.924Z
- **Rationale:** Disallowed state transition from 'OPEN' to 'AWAITING_PAYMENT' on ticket 'ed3bb5de-67fa-43bb-9ed5-c9464c917f2c' (BL-301).
```json
{
  "ticketId": "ed3bb5de-67fa-43bb-9ed5-c9464c917f2c",
  "oldStatus": "OPEN",
  "newStatus": "AWAITING_PAYMENT",
  "allowedTransitions": [
    "IN_PROGRESS",
    "WAITING_ON_CLIENT",
    "CANCELLED",
    "RESOLVED",
    "CLOSED"
  ],
  "actorId": "1599dd70-8e17-4c8f-9efa-2008ee7fae47"
}
```

### 106. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 8e5f52b6-e089-40ff-9f00-1c7502b07e1e` (Tenant: `1a3aa1a0-cf7d-46bf-9e82-50901fda1708`)
- **Violated At:** 2026-09-04T12:15:30.245Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "8e5f52b6-e089-40ff-9f00-1c7502b07e1e",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-09-04T12:15:30.245Z"
}
```

### 107. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 5290abb4-6a5f-4b12-817c-052fd473af05` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-08-18T16:46:15.283Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "5290abb4-6a5f-4b12-817c-052fd473af05",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-08-18T16:46:15.283Z"
}
```

### 108. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 49cc8332-fd5e-4c69-917b-290453835f1d` (Tenant: `6144fe88-26b1-4289-9d4f-8501ad6a75e0`)
- **Violated At:** 2026-08-22T20:50:47.530Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "49cc8332-fd5e-4c69-917b-290453835f1d",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-08-22T20:50:47.530Z"
}
```

### 109. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 277cb1bd-9903-450d-a6b6-c7be33512038` (Tenant: `9d3d0311-27cb-4c98-aca9-ba6b8878fbab`)
- **Violated At:** 2026-09-02T07:00:06.920Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "277cb1bd-9903-450d-a6b6-c7be33512038",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-09-02T07:00:06.920Z"
}
```

### 110. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 21bc196c-36ce-46c2-a5ec-02c3d647ed48` (Tenant: `82e9504a-00e9-4eaf-b733-526d374b31b0`)
- **Violated At:** 2026-09-03T22:20:38.073Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "21bc196c-36ce-46c2-a5ec-02c3d647ed48",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-09-03T22:20:38.073Z"
}
```

### 111. [CRITICAL] BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule
- **Entity:** `TICKET 8abd3869-80fb-4ac4-89a8-42e64af51493` (Tenant: `92a12a25-9d61-40b7-acaa-6bdae7c0f310`)
- **Violated At:** 2026-08-18T13:38:55.927Z
- **Rationale:** Ticket was reopened but previous commission was not voided (BL-801).
```json
{
  "ticketId": "8abd3869-80fb-4ac4-89a8-42e64af51493",
  "earningStatus": "PENDING",
  "reopenedAt": "2026-08-18T13:38:55.927Z"
}
```

## Autonomous Remediation (Self-Healing Executions)
| Rule | Entity | Status | Action Taken | Details / Error |
| :--- | :--- | :---: | :--- | :--- |
| **BL-103** | `WS-00065` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00065","alertId":"35124bd0-9c9b-4f62-b24a-e6e89250b781","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00460` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00460","alertId":"4afc37a0-fa7e-46b3-80d7-924d61418f16","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00293` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00293","alertId":"559779da-9de1-40ee-bcd2-222934fdaea1","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00611` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00611","alertId":"e522716b-d104-42cb-8954-1be5bb1e897d","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00232` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00232","alertId":"fb0c2738-c338-4f8f-8b94-139b87f5dac9","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00054` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00054","alertId":"a2db0f76-6127-4714-9485-bd1973dd6df3","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00467` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00467","alertId":"fd62859b-8644-4575-becf-6b23c485b3e7","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00883` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00883","alertId":"ccbe1b2c-08b7-486e-a358-5381070233a3","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00411` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00411","alertId":"0e83fc9d-295b-4cf7-8095-c9f191e6d260","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00085` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00085","alertId":"48f0fb21-7fa7-4973-a6dd-087d6a19e359","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00224` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00224","alertId":"7b1b7f5f-de5e-4ca2-9196-eb8e9f9da6ab","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00238` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00238","alertId":"64922949-d7b7-44c4-9a19-e9a4bdcc1bf4","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00700` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00700","alertId":"d21dbfe6-7b8e-4237-98da-575804e50917","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00134` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00134","alertId":"57768747-798c-4838-9aeb-dd0c2f28547f","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00242` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00242","alertId":"963b03cc-58b4-4775-a1af-93d58bba90c2","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00050` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00050","alertId":"d9b4e7a8-9d77-4305-a99d-3aba6111b3ff","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00148` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00148","alertId":"852b12be-b85e-4b33-9cc8-b912148597c2","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00026` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00026","alertId":"01d19f6f-c52c-4282-82e2-c545900d392d","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00694` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00694","alertId":"00ca00d6-0d86-4ed1-9379-b6062474cac7","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00855` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00855","alertId":"5dfa9236-cc7b-4599-8331-03607b92e195","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00253` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00253","alertId":"5e8f0f19-2cc0-443e-a678-153037cc8777","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00989` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00989","alertId":"005f61d3-2b22-4e40-b3b7-15736e09ebf9","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00397` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00397","alertId":"97d994dd-b37c-43d0-949c-f93fe35a4d84","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00056` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00056","alertId":"1dfccae0-961a-4c09-8eec-34a3af0a8bd8","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00874` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00874","alertId":"409ab834-2eb8-484a-b2a3-8d3386a09574","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00910` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00910","alertId":"38fed5ab-73ae-4052-9ea6-f86326e04d3c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00599` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00599","alertId":"2b860325-236a-4f22-aaf5-9e884fb10a3c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00768` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00768","alertId":"ee016db6-c677-40e3-8345-730293bad95c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00277` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00277","alertId":"6a7733df-9c8b-40d1-90d2-b2d7efe6406a","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00125` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00125","alertId":"4474a6c2-3bfb-4413-ac05-26d305b9c121","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00774` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00774","alertId":"f43ab0ab-0b63-4a40-a65a-b607b1cba87c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00968` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00968","alertId":"e902cbf7-92ed-46b0-8c43-d6748445021d","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00036` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00036","alertId":"67adb35e-0712-4acf-bf71-24c6c9e8e1cb","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00724` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00724","alertId":"30ded10a-67f3-4012-8968-f41b281a464b","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00748` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00748","alertId":"da68072d-b154-4f65-8538-c2dd7fb20ad2","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00117` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00117","alertId":"089fa063-0583-47f3-830b-2403bedb5609","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00297` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00297","alertId":"de877315-8937-471c-a14e-e757508a0f21","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00127` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00127","alertId":"d964e8d7-f1fd-4ea8-807d-faba38bf8748","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00663` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00663","alertId":"0f8cd4e4-749a-46ad-8b6b-1c59a361f4e1","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00955` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00955","alertId":"b57837d5-1142-4e07-b226-63762485cade","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00077` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00077","alertId":"5d2daf29-2756-4d10-b824-3ab54fb0dbe2","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00112` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00112","alertId":"180036cc-3bfd-405e-be07-21ea431c76d4","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00926` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00926","alertId":"ac096b57-95d3-41dd-b80a-ec8fcff47dbc","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00795` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00795","alertId":"2f68e345-1971-4088-9c42-8ec92583af79","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00374` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00374","alertId":"26b0f0c2-143e-409b-8337-2ec0df262d6e","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00743` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00743","alertId":"4025aeeb-a045-45d5-bc97-9248d47ed5c5","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00068` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00068","alertId":"d883e015-6ee0-4ef7-af31-2de6972802b3","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00540` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00540","alertId":"411025ce-401d-4884-88cf-230fb8359fd1","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00954` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00954","alertId":"c28fd05d-d897-4606-99f5-d65ea34fb9c0","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00840` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00840","alertId":"53791626-fc9a-487c-9b7e-555a360b339f","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00617` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00617","alertId":"d8751715-6f8d-48d3-8015-84612d238987","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00685` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00685","alertId":"b7ebc1df-61c3-4cf1-a81b-66e51d2e724c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00945` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00945","alertId":"83ebedc2-ec8d-41e9-8558-202c42fe3562","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00631` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00631","alertId":"ea61f7a1-be23-4a01-9caa-a9a69f8f1170","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"DEVICE_OFFLINE_WARNING"}} |
| **BL-103** | `WS-00512` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00512","alertId":"09c699d6-8020-4481-8fa3-74707191d4f9","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00019` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00019","alertId":"6447d69e-d471-40b4-85c9-b2d3a65a9801","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00987` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00987","alertId":"bcfaf177-8b0c-44b7-a6a2-124293b80f46","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00618` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00618","alertId":"05d124dd-f12d-48fd-8459-0a2f5a38dba0","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00785` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00785","alertId":"9a225dab-c7df-4428-9cab-533adc338e0f","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00854` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00854","alertId":"30a12fbf-c0ba-470a-9d71-31efffc0d7c0","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00367` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00367","alertId":"df86aaf1-b089-4a1c-94b4-cea46a32dbd1","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00907` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00907","alertId":"596a9550-6be1-4b5f-be13-d12584f84539","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00069` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00069","alertId":"cfc00d5c-19d8-43c1-8b93-f9f1542ede3f","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00459` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00459","alertId":"9ea6f171-9c92-4fe5-b867-690f7a459902","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00711` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00711","alertId":"6684eb7c-e6eb-45a2-98f3-37e376d5b7fe","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00141` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00141","alertId":"f4dad7ea-17ba-4059-982e-3317c675fa6a","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00066` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00066","alertId":"bc1b2a14-409d-4790-8d05-5d917ab03cc0","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00193` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00193","alertId":"ffeeef0b-8827-4afa-b7f0-4dfa6460c442","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00163` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00163","alertId":"b537cc2d-226e-4ea2-90ca-8d90e2dae42e","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00466` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00466","alertId":"2a106354-cd1e-4615-b858-6f6ff4a3a4eb","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-103** | `WS-00388` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00388","alertId":"8b89726d-760f-4e81-bf0e-51d0d02611f8","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00192` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00192","alertId":"88def773-b80c-4b9a-a3ac-6afd5e18fc38","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"SERVICE_CRASH"}} |
| **BL-103** | `WS-00606` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00606","alertId":"f1e99d76-27f0-4d4b-aa0d-88469828de9c","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"LOW_DISK_SPACE"}} |
| **BL-103** | `WS-00424` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Flapping Alert Remediator","ruleCode":"BL-103","evidence":{"deviceId":"WS-00424","alertId":"abc6e54b-92f3-408c-8dcd-718428791b4e","triggerCount":3,"timeWindowHours":0,"lastAlertTitle":"HIGH_CPU_LOAD"}} |
| **BL-801** | `8e5f52b6-e089-40ff-9f00-1c7502b07e1e` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"8e5f52b6-e089-40ff-9f00-1c7502b07e1e","earningStatus":"PENDING","reopenedAt":"2026-09-04T12:15:30.245Z"}} |
| **BL-801** | `5290abb4-6a5f-4b12-817c-052fd473af05` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"5290abb4-6a5f-4b12-817c-052fd473af05","earningStatus":"PENDING","reopenedAt":"2026-08-18T16:46:15.283Z"}} |
| **BL-801** | `49cc8332-fd5e-4c69-917b-290453835f1d` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"49cc8332-fd5e-4c69-917b-290453835f1d","earningStatus":"PENDING","reopenedAt":"2026-08-22T20:50:47.530Z"}} |
| **BL-801** | `277cb1bd-9903-450d-a6b6-c7be33512038` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"277cb1bd-9903-450d-a6b6-c7be33512038","earningStatus":"PENDING","reopenedAt":"2026-09-02T07:00:06.920Z"}} |
| **BL-801** | `21bc196c-36ce-46c2-a5ec-02c3d647ed48` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"21bc196c-36ce-46c2-a5ec-02c3d647ed48","earningStatus":"PENDING","reopenedAt":"2026-09-03T22:20:38.073Z"}} |
| **BL-801** | `8abd3869-80fb-4ac4-89a8-42e64af51493` | 🔍 SIMULATED | `SIMULATED_REMEDIATION` | {"intendedRemediator":"Technician Bounty & OpEx Remediator","ruleCode":"BL-801","evidence":{"ticketId":"8abd3869-80fb-4ac4-89a8-42e64af51493","earningStatus":"PENDING","reopenedAt":"2026-08-18T13:38:55.927Z"}} |
