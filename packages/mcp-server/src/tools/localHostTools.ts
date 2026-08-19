import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const execAsync = promisify(exec);

export function registerLocalHostTools(server: McpServer) {
  // 1. Tool: msp_diagnose_local_pc (Direct Host OS Telemetry)
  server.tool(
    'msp_diagnose_local_pc',
    'Gather live hardware, OS, CPU, memory, and network metrics directly from THIS PC',
    {},
    async () => {
      try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePct = ((usedMem / totalMem) * 100).toFixed(1);

        // Fetch disk information on Windows via PowerShell
        let diskInfo: any[] = [];
        try {
          const { stdout } = await execAsync(
            'powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free, @{Name=\'Size\';Expression={$_.Used + $_.Free}} | ConvertTo-Json -Compress"'
          );
          if (stdout.trim()) {
            const rawDisks = JSON.parse(stdout.trim());
            const diskArr = Array.isArray(rawDisks) ? rawDisks : [rawDisks];
            diskInfo = diskArr.map((d: any) => ({
              drive: `${d.Name}:`,
              usedGb: (d.Used / (1024 * 1024 * 1024)).toFixed(2),
              freeGb: (d.Free / (1024 * 1024 * 1024)).toFixed(2),
              sizeGb: (d.Size / (1024 * 1024 * 1024)).toFixed(2),
              usedPercent: d.Size > 0 ? `${((d.Used / d.Size) * 100).toFixed(1)}%` : '0%',
            }));
          }
        } catch {
          diskInfo = [{ note: 'Disk query unavailable or non-Windows environment' }];
        }

        const diagnostics = {
          host: {
            hostname: os.hostname(),
            platform: os.platform(),
            architecture: os.arch(),
            osRelease: os.release(),
            osType: os.type(),
            uptimeHours: (os.uptime() / 3600).toFixed(2),
          },
          cpu: {
            model: cpus[0]?.model || 'Unknown',
            cores: cpus.length,
            speedMhz: cpus[0]?.speed || 0,
          },
          memory: {
            totalGb: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
            usedGb: (usedMem / (1024 * 1024 * 1024)).toFixed(2),
            freeGb: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
            usagePercent: `${memUsagePct}%`,
          },
          disks: diskInfo,
          network: Object.entries(os.networkInterfaces()).reduce((acc: any, [name, ifaces]) => {
            const active = ifaces?.filter((i) => !i.internal);
            if (active && active.length > 0) {
              acc[name] = active.map((i) => ({ address: i.address, family: i.family, mac: i.mac }));
            }
            return acc;
          }, {}),
          timestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(diagnostics, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to diagnose local PC: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_get_local_event_logs (Windows Event Viewer)
  server.tool(
    'msp_get_local_event_logs',
    'Query recent Application or System error/warning events from Windows Event Log on THIS PC',
    {
      logName: z.enum(['Application', 'System']).default('Application').describe('Log channel to inspect'),
      level: z.enum(['Error', 'Warning', 'Critical']).default('Error').describe('Event severity level'),
      maxEvents: z.number().min(1).max(20).default(5).describe('Maximum number of recent events to retrieve'),
    },
    async ({ logName, level, maxEvents }) => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [{ type: 'text', text: 'Event log query is only available on Windows OS.' }],
          };
        }

        const psCommand = `powershell -Command "Get-WinEvent -FilterHashtable @{LogName='${logName}'; Level=${
          level === 'Critical' ? 1 : level === 'Error' ? 2 : 3
        }} -MaxEvents ${maxEvents} -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, ProviderName, Message | ConvertTo-Json -Compress"`;

        const { stdout } = await execAsync(psCommand);
        if (!stdout.trim() || stdout.trim() === 'null') {
          return {
            content: [
              {
                type: 'text',
                text: `No recent ${level} events found in the '${logName}' log on this PC.`,
              },
            ],
          };
        }

        const events = JSON.parse(stdout.trim());
        const eventList = Array.isArray(events) ? events : [events];

        const formatted = eventList.map((e: any) => ({
          timeCreated: e.TimeCreated,
          eventId: e.Id,
          source: e.ProviderName,
          messageSnippet: typeof e.Message === 'string' ? e.Message.slice(0, 300) : '',
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to query event logs: ${err.message}` }],
        };
      }
    }
  );
}
