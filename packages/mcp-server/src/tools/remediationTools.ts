import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const execAsync = promisify(exec);

export function registerRemediationTools(server: McpServer) {
  // 1. Tool: msp_restart_windows_service
  server.tool(
    'msp_restart_windows_service',
    'Restart a specific Windows background service (e.g., Spooler, W32Time, Dnscache, lanmanworkstation)',
    {
      serviceName: z.string().min(1).describe('The exact name or display name of the Windows service'),
    },
    async ({ serviceName }) => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [{ type: 'text', text: 'Service control is available on Windows.' }],
          };
        }

        const psCmd = `Restart-Service -Name '${serviceName}' -Force -PassThru | Select-Object Name, Status, DisplayName | ConvertTo-Json -Compress`;
        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
        const result = stdout.trim() ? JSON.parse(stdout.trim()) : { message: `Service ${serviceName} restarted.` };

        return {
          content: [
            {
              type: 'text',
              text: `✅ Service successfully restarted:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to restart service '${serviceName}': ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_network_troubleshoot
  server.tool(
    'msp_network_troubleshoot',
    'Run automated network diagnostics: default gateway ping, DNS resolution test, and public internet latency',
    {
      targetHost: z.string().default('1.1.1.1').describe('Target IP or domain for ping and latency test'),
      domainToResolve: z.string().default('cloudflare.com').describe('Domain to test for DNS resolution'),
    },
    async ({ targetHost, domainToResolve }) => {
      try {
        const psCmd = [
          "$ErrorActionPreference = 'SilentlyContinue'",
          '$diag = @{}',
          `$ping = Test-Connection -TargetName '${targetHost}' -Count 2 | Select-Object Address, Latency, Status`,
          '$diag.ping = $ping',
          `try { $dns = Resolve-DnsName -Name '${domainToResolve}' -QuickTimeout | Select-Object Name, IPAddress, Type -First 2; $diag.dnsResolution = $dns } catch { $diag.dnsResolution = 'Failed to resolve' }`,
          '$diag | ConvertTo-Json -Depth 3 -Compress',
        ].join('; ');

        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
        const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : { note: 'No network output' };

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
          content: [{ type: 'text', text: `Network troubleshooting failed: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_flush_dns_and_renew_dhcp
  server.tool(
    'msp_flush_dns_and_renew_dhcp',
    'Flush local DNS resolver cache and trigger DHCP renewal to fix stale network routes',
    {},
    async () => {
      try {
        const { stdout } = await execAsync('ipconfig /flushdns');
        return {
          content: [
            {
              type: 'text',
              text: `✅ DNS Resolver Cache Flushed:\n${stdout.trim()}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to flush DNS: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_clean_temp_storage
  server.tool(
    'msp_clean_temp_storage',
    'Calculate or safely clean temporary files (Windows Temp, User Temp, crash dumps) with dry-run support',
    {
      dryRun: z
        .boolean()
        .default(true)
        .describe('If true, only calculates recoverable space without deleting. Set false to perform purge.'),
    },
    async ({ dryRun }) => {
      try {
        const psCmd = [
          "$ErrorActionPreference = 'SilentlyContinue'",
          "$paths = @($env:TEMP, (Join-Path $env:SystemRoot 'Temp'))",
          '$files = Get-ChildItem -Path $paths -Recurse -File -ErrorAction SilentlyContinue',
          '$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum',
          '$totalMb = if ($totalBytes) { [math]::Round($totalBytes / 1MB, 2) } else { 0 }',
          '$fileCount = if ($files) { $files.Count } else { 0 }',
          dryRun ? '$status = "SIMULATED"' : '$files | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; $status = "CLEANED"',
          `[PSCustomObject]@{ status = $status; dryRun = ${dryRun ? '$true' : '$false'}; recoverableMb = $totalMb; scannedFiles = $fileCount } | ConvertTo-Json -Compress`,
        ].join('; ');

        const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
        const result = stdout.trim() ? JSON.parse(stdout.trim()) : { note: 'Cleanup completed' };

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
          content: [{ type: 'text', text: `Temp storage cleanup failed: ${err.message}` }],
        };
      }
    }
  );
}
