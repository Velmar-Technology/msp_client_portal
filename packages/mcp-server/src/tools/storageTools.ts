import os from 'node:os';
import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Safely executes a multi-line PowerShell script by piping to stdin.
 */
function executePowershell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
      }
    });

    proc.stdin.write(script);
    proc.stdin.end();
  });
}

/**
 * Registers disk space analysis, storage hotspot diagnostics, and cache
 * reclamation assessment tools into the MCP server.
 *
 * @param server The Model Context Protocol server instance
 */
export function registerStorageTools(server: McpServer) {
  // 1. Tool: msp_analyze_disk_storage
  server.tool(
    'msp_analyze_disk_storage',
    'Deep analysis of endpoint disk storage: volume capacities (used/free/total), high-impact storage consumer directories (Downloads, Docker VHDX, WSL, npm-cache, crash dumps, temp pools), and safe reclamation targets.',
    {
      includeHotspots: z.boolean().default(true).describe('If true, scans high-impact folders (Downloads, Docker, AppData caches)'),
    },
    async ({ includeHotspots }) => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    platform: os.platform(),
                    note: 'Storage analysis is optimized for Windows endpoints.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$fso = New-Object -ComObject Scripting.FileSystemObject
$analysis = @{}

# 1. Drive Volumes Summary
$drives = Get-PSDrive -PSProvider FileSystem | ForEach-Object {
    $freeGb = [math]::Round($_.Free / 1GB, 2)
    $usedGb = [math]::Round($_.Used / 1GB, 2)
    $totalGb = [math]::Round(($_.Used + $_.Free) / 1GB, 2)
    $freePct = if ($totalGb -gt 0) { [math]::Round(($_.Free / ($_.Used + $_.Free)) * 100, 1) } else { 0 }
    [PSCustomObject]@{
        Drive = $_.Name + ":"
        FreeGB = $freeGb
        UsedGB = $usedGb
        TotalGB = $totalGb
        FreePercent = $freePct
        Health = if ($freePct -lt 10) { 'CRITICAL_LOW_SPACE' } elseif ($freePct -lt 20) { 'WARNING' } else { 'HEALTHY' }
    }
}
$analysis.volumes = $drives

# 2. Storage Hotspots Scan
if (${includeHotspots ? '$true' : '$false'}) {
    $hotspots = @()

    # User Profile Folders
    $userProfile = $env:USERPROFILE
    $targets = @(
        @{ Name = 'User Downloads'; Path = (Join-Path $userProfile 'Downloads') },
        @{ Name = 'User Desktop'; Path = (Join-Path $userProfile 'Desktop') },
        @{ Name = 'NPM Cache'; Path = (Join-Path $env:LOCALAPPDATA 'npm-cache') },
        @{ Name = 'Docker WSL VHDX Storage'; Path = (Join-Path $env:LOCALAPPDATA 'Docker') },
        @{ Name = 'WSL Storage'; Path = (Join-Path $env:LOCALAPPDATA 'wsl') },
        @{ Name = 'Local Crash Dumps'; Path = (Join-Path $env:LOCALAPPDATA 'CrashDumps') },
        @{ Name = 'User Temp'; Path = $env:TEMP },
        @{ Name = 'Windows Update Download Cache'; Path = 'C:\\Windows\\SoftwareDistribution\\Download' }
    )

    foreach ($t in $targets) {
        if (Test-Path $t.Path) {
            try {
                $folder = $fso.GetFolder($t.Path)
                $sizeMb = [math]::Round($folder.Size / 1MB, 2)
                $sizeGb = [math]::Round($folder.Size / 1GB, 2)
                $hotspots += [PSCustomObject]@{
                    Target = $t.Name
                    Path = $t.Path
                    SizeMB = $sizeMb
                    SizeGB = $sizeGb
                    Actionable = ($sizeMb -gt 50)
                }
            } catch {}
        }
    }
    $analysis.storageHotspots = $hotspots | Sort-Object SizeMB -Descending
}

$analysis | ConvertTo-Json -Depth 4 -Compress
`;

        const stdout = await executePowershell(psScript);
        const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : { note: 'No storage data returned' };

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
          content: [{ type: 'text', text: `Storage analysis failed: ${err.message}` }],
        };
      }
    }
  );
}
