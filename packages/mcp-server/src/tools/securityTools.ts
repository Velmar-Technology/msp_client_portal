import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const execAsync = promisify(exec);

export function registerSecurityTools(server: McpServer) {
  // 1. Tool: msp_audit_security_posture
  server.tool(
    'msp_audit_security_posture',
    'Audit endpoint security posture: BitLocker drive encryption, Antivirus/Defender status, Firewall profiles, and pending reboots',
    {},
    async () => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [{ type: 'text', text: 'Security posture audit is currently optimized for Windows endpoints.' }],
          };
        }

        const psCmd = [
          "$ErrorActionPreference = 'SilentlyContinue'",
          '$report = @{}',
          'try { $defender = Get-MpComputerStatus | Select-Object AntivirusEnabled, AMServiceEnabled, RealTimeProtectionEnabled, AntivirusSignatureAge, AntivirusSignatureLastUpdated; $report.antivirus = $defender } catch { $report.antivirus = "Unable to query Windows Defender status" }',
          'try { $bitlocker = Get-BitLockerVolume | Select-Object MountPoint, ProtectionStatus, EncryptionPercentage, VolumeType; $report.bitlocker = $bitlocker } catch { $report.bitlocker = "BitLocker query unavailable" }',
          'try { $fw = Get-NetFirewallProfile | Select-Object Name, Enabled; $report.firewall = $fw } catch { $report.firewall = "Firewall query unavailable" }',
          '$cbs = Test-Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending"',
          '$wu = Test-Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired"',
          '$report.pendingReboot = ($cbs -or $wu)',
          '$report | ConvertTo-Json -Depth 4 -Compress',
        ].join('; ');

        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
        const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : { note: 'No data returned' };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(parsed, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Security audit failed: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_inspect_open_ports
  server.tool(
    'msp_inspect_open_ports',
    'Inspect active TCP listening ports and associated processes on the host',
    {
      maxPorts: z.number().min(1).max(50).default(20).describe('Maximum listening ports to list'),
    },
    async ({ maxPorts }) => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [{ type: 'text', text: 'Port inspection is available on Windows.' }],
          };
        }

        const psCmd = `Get-NetTCPConnection -State Listen | Select-Object -First ${maxPorts} LocalAddress, LocalPort, OwningProcess | ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; [PSCustomObject]@{ Port = $_.LocalPort; Address = $_.LocalAddress; PID = $_.OwningProcess; Process = $p.ProcessName } } | ConvertTo-Json -Compress`;
        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);

        const ports = stdout.trim() ? JSON.parse(stdout.trim()) : [];
        const portList = Array.isArray(ports) ? ports : [ports];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(portList, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to inspect ports: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_list_startup_programs
  server.tool(
    'msp_list_startup_programs',
    'List startup programs and autorun applications configured in the registry and startup folder',
    {},
    async () => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [{ type: 'text', text: 'Startup program query is available on Windows.' }],
          };
        }

        const psCmd = `Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json -Compress`;
        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);

        const items = stdout.trim() ? JSON.parse(stdout.trim()) : [];
        const itemList = Array.isArray(items) ? items : [items];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(itemList, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list startup programs: ${err.message}` }],
        };
      }
    }
  );
}
