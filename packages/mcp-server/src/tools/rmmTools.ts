import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerRmmTools(server: McpServer, apiClient: MspApiClient) {
  // 1. Tool: msp_get_device_telemetry
  server.tool(
    'msp_get_device_telemetry',
    'Fetch real-time RMM telemetry (CPU, RAM, Disk usage, Agent online status, and pending patch count) for an equipment/asset',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
    },
    async ({ equipmentId }) => {
      try {
        const telemetry = await apiClient.getDeviceTelemetry(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(telemetry, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch device telemetry: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_list_device_patches
  server.tool(
    'msp_list_device_patches',
    'List operating system patches, security updates, and installation status for a device',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
      status: z.enum(['PENDING', 'INSTALLED', 'FAILED']).optional().describe('Filter by patch status'),
    },
    async ({ equipmentId, status }) => {
      try {
        const patches = await apiClient.listDevicePatches(equipmentId, status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(patches, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch device patches: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_get_device_maintenances
  server.tool(
    'msp_get_device_maintenances',
    'Fetch scheduled and past preventative maintenance records for a device',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
    },
    async ({ equipmentId }) => {
      try {
        const maintenances = await apiClient.getDeviceMaintenances(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(maintenances, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch maintenance history: ${err.message}` }],
        };
      }
    }
  );

  // ── Remote Agent Gateway Tools ────────────────────────────────────────────
  // Tool: msp_list_connected_agents
  server.tool(
    'msp_list_connected_agents',
    'List all currently connected and online MSP Rust endpoint agents across all devices',
    {},
    async () => {
      try {
        const agents = await apiClient.getConnectedAgents();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(agents, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list connected agents: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_remote_agent_status
  server.tool(
    'msp_remote_agent_status',
    'Check if the MSP Rust endpoint agent is connected and online for a specific client device. Returns hostname, OS, agent version, and connection time.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device to check agent status for'),
    },
    async ({ equipmentId }) => {
      try {
        const status = await apiClient.getAgentStatus(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to check agent status: ${err.message}` }],
        };
      }
    }
  );

  // 5. Tool: msp_remote_diagnose_pc
  server.tool(
    'msp_remote_diagnose_pc',
    'Execute live hardware diagnostics (CPU, RAM, Disk, Network, OS) directly on a remote client endpoint via the Rust agent tunnel. The agent must be online.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device to diagnose'),
    },
    async ({ equipmentId }) => {
      try {
        const result = await apiClient.getRemoteDiagnostics(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote diagnosis failed: ${err.message}` }],
        };
      }
    }
  );

  // 5b. Tool: msp_remote_get_hardware_components
  server.tool(
    'msp_remote_get_hardware_components',
    'Retrieve exhaustive physical hardware components (Motherboard, CPU cores/IDs, RAM DIMM modules & part numbers, physical SSD/HDD drives, GPU adapters, Battery) directly from a remote workstation running msp-agent via SMBIOS/WMI.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
    },
    async ({ equipmentId }) => {
      try {
        const result = await apiClient.getRemoteHardwareComponents(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote hardware component query failed: ${err.message}` }],
        };
      }
    }
  );

  // 5c. Tool: msp_remote_battery_report
  server.tool(
    'msp_remote_battery_report',
    'Generate and inspect a detailed battery health analysis report (Design Capacity, Full Charge Capacity, Cycle Count, Health %, Chemistry, Manufacturer) on a remote laptop or tablet via powercfg /batteryreport on msp-agent.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
    },
    async ({ equipmentId }) => {
      try {
        const result = await apiClient.getRemoteBatteryReport(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote battery report failed: ${err.message}` }],
        };
      }
    }
  );

  // 6. Tool: msp_remote_get_event_logs
  server.tool(
    'msp_remote_get_event_logs',
    'Query Windows Application or System error/warning/critical events from the Event Log on a remote client endpoint via the Rust agent tunnel.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
      logName: z.enum(['Application', 'System']).default('Application').describe('The Windows Event Log channel to query'),
      level: z.enum(['Error', 'Warning', 'Critical']).default('Error').describe('Event severity level to filter'),
      maxEvents: z.number().min(1).max(20).default(5).describe('Maximum number of events to retrieve'),
    },
    async ({ equipmentId, logName, level, maxEvents }) => {
      try {
        const result = await apiClient.getRemoteEventLogs(equipmentId, logName, level, maxEvents);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote event log query failed: ${err.message}` }],
        };
      }
    }
  );

  // 7. Tool: msp_remote_security_audit
  server.tool(
    'msp_remote_security_audit',
    'Run a security posture audit on a remote client endpoint: BitLocker encryption status, Windows Defender protection, Firewall profiles, and pending reboot flags.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
    },
    async ({ equipmentId }) => {
      try {
        const result = await apiClient.getRemoteSecurityAudit(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote security audit failed: ${err.message}` }],
        };
      }
    }
  );

  // 8. Tool: msp_remote_exec_command
  server.tool(
    'msp_remote_exec_command',
    'Execute a supported remediation command on a remote client endpoint via the Rust agent. Supported commands: RESTART_SERVICE, INSPECT_OPEN_PORTS, LIST_STARTUP_PROGRAMS, LIST_PROCESSES, FLUSH_DNS_RENEW_DHCP, PING.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
      command: z.enum([
        'RESTART_SERVICE',
        'INSPECT_OPEN_PORTS',
        'LIST_STARTUP_PROGRAMS',
        'LIST_PROCESSES',
        'FLUSH_DNS_RENEW_DHCP',
        'PING',
      ]).describe('The agent command to execute'),
      payload: z.record(z.any()).optional().describe('Optional parameters for the command (e.g. { "service_name": "Spooler" } or { "limit": 25, "sort_by": "memory" })'),
    },
    async ({ equipmentId, command, payload }) => {
      try {
        const result = await apiClient.execAgentCommand(equipmentId, command, payload);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Remote command execution failed: ${err.message}` }],
        };
      }
    }
  );

  // 9. Tool: msp_remote_list_processes
  server.tool(
    'msp_remote_list_processes',
    'List live active running processes on a remote client endpoint via the Rust agent tunnel, sorted by memory or CPU consumption.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
      limit: z.number().min(1).max(100).default(25).describe('Maximum number of processes to return (default: 25)'),
      sortBy: z.enum(['memory', 'cpu']).default('memory').describe('Sort field: memory (MB) or cpu (%)'),
    },
    async ({ equipmentId, limit, sortBy }) => {
      try {
        const result = await apiClient.execAgentCommand(equipmentId, 'LIST_PROCESSES', {
          limit,
          sort_by: sortBy,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list remote processes: ${err.message}` }],
        };
      }
    }
  );

  // 10. Tool: msp_remote_exec_powershell
  server.tool(
    'msp_remote_exec_powershell',
    'Execute a PowerShell command, script block, or administrative query directly on a remote client endpoint via the Rust agent tunnel. Returns stdout, stderr, exit code, and execution time.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device'),
      script: z.string().min(1).describe('The PowerShell command or script string to execute on the endpoint'),
    },
    async ({ equipmentId, script }) => {
      try {
        const result = await apiClient.execAgentCommand(equipmentId, 'EXEC_POWERSHELL', {
          script,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to execute remote PowerShell: ${err.message}` }],
        };
      }
    }
  );

  // 11. Tool: msp_remote_upgrade_agent
  server.tool(
    'msp_remote_upgrade_agent',
    'Trigger an autonomous, in-place Over-The-Air (OTA) self-upgrade on a remote endpoint running msp-agent.exe. Downloads new binary, verifies SHA-256 integrity, hot-swaps using atomic move rename, and restarts service with a 45-second rollback watchdog.',
    {
      equipmentId: z.string().uuid().describe('The UUID of the remote client device/slot to upgrade'),
      targetVersion: z
        .string()
        .regex(/^v?\d+\.\d+\.\d+$/)
        .optional()
        .describe('Target semver version (e.g. 1.10.2). Defaults to latest production release.'),
      downloadUrl: z.string().url().optional().describe('Optional custom binary download URL'),
      sha256Checksum: z
        .string()
        .regex(/^[a-fA-F0-9]{64}$/)
        .optional()
        .describe('Optional SHA-256 hexadecimal hash to verify download integrity'),
      rollbackTimeoutSecs: z
        .number()
        .int()
        .min(10)
        .max(300)
        .default(45)
        .describe('Watchdog deadline in seconds to establish TLS handshake before rolling back (default: 45)'),
    },
    async ({ equipmentId, targetVersion, downloadUrl, sha256Checksum, rollbackTimeoutSecs }) => {
      try {
        const result = await apiClient.upgradeRemoteAgent(
          equipmentId,
          targetVersion,
          downloadUrl,
          sha256Checksum,
          rollbackTimeoutSecs
        );
        return {
          content: [
            {
              type: 'text',
              text: [
                '### 🚀 Agent Self-Upgrade Initiated',
                '',
                `* **Equipment ID:** \`${equipmentId}\``,
                `* **Target Version:** \`v${result.targetVersion || targetVersion || '1.10.2'}\``,
                `* **Rollback Timeout:** \`${result.rollbackTimeoutSecs || rollbackTimeoutSecs}s\``,
                `* **Status:** \`${result.message || 'Initiated'}\``,
                '',
                '```json',
                JSON.stringify(result, null, 2),
                '```',
              ].join('\n'),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Agent self-upgrade failed: ${err.message}` }],
        };
      }
    }
  );
}



