import os from 'node:os';
import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Safely executes a multi-line PowerShell script by piping to stdin,
 * bypassing Windows CLI argument length limitations.
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
 * Registers deep network audit, adapter configuration, Wi-Fi telemetry,
 * latency benchmarking, and DNS diagnostics tools into the MCP server.
 *
 * @param server The Model Context Protocol server instance
 */
export function registerNetworkTools(server: McpServer) {
  // 1. Tool: msp_audit_network_interfaces
  server.tool(
    'msp_audit_network_interfaces',
    'Execute comprehensive network layer audit: active adapters, IPv4/IPv6 config, Wi-Fi RF signal telemetry (SSID, BSSID, Signal %, Link rates), multi-target latency benchmarks (Gateway, 1.1.1.1, Helpdesk), and DNS resolution health diagnostics.',
    {
      targetHost: z.string().default('1.1.1.1').describe('Target IP or host for external internet latency test'),
      domainToResolve: z.string().default('helpdesk.velmartech.com.do').describe('Domain name to benchmark for DNS resolution time'),
    },
    async ({ targetHost, domainToResolve }) => {
      try {
        if (os.platform() !== 'win32') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    platform: os.platform(),
                    note: 'Network interface audit is optimized for Windows endpoints.',
                    interfaces: os.networkInterfaces(),
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
$audit = @{}

# 1. Active Adapters
$adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        InterfaceDescription = $_.InterfaceDescription
        MacAddress = $_.MacAddress
        LinkSpeed = $_.LinkSpeed
        Status = $_.Status.ToString()
    }
}
$audit.activeAdapters = $adapters

# 2. IP & Gateway Configuration
$ipConfigs = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4DefaultGateway -ne $null } | ForEach-Object {
    [PSCustomObject]@{
        InterfaceAlias = $_.InterfaceAlias
        IPv4Address = $_.IPv4Address.IPAddress
        IPv4DefaultGateway = $_.IPv4DefaultGateway.NextHop
        DNSServers = @($_.DNSServer.ServerAddresses)
    }
}
$audit.ipConfiguration = $ipConfigs

# 3. Wi-Fi Telemetry (if wireless adapter is connected)
try {
    $wlanRaw = netsh wlan show interfaces
    $wlanText = ($wlanRaw -join "\`n")
    if ($wlanText -match 'State\\s*:\\s*connected') {
        $ssid = if ($wlanText -match 'SSID\\s*:\\s*([^\\r\\n]+)') { $matches[1].Trim() } else { $null }
        $bssid = if ($wlanText -match 'BSSID\\s*:\\s*([^\\r\\n]+)') { $matches[1].Trim() } else { $null }
        $signal = if ($wlanText -match 'Signal\\s*:\\s*(\\d+)%') { [int]$matches[1] } else { $null }
        $radio = if ($wlanText -match 'Radio type\\s*:\\s*([^\\r\\n]+)') { $matches[1].Trim() } else { $null }
        $channel = if ($wlanText -match 'Channel\\s*:\\s*(\\d+)') { [int]$matches[1] } else { $null }
        $rxRate = if ($wlanText -match 'Receive rate \\(Mbps\\)\\s*:\\s*([\\d\\.]+)') { [double]$matches[1] } else { $null }
        $txRate = if ($wlanText -match 'Transmit rate \\(Mbps\\)\\s*:\\s*([\\d\\.]+)') { [double]$matches[1] } else { $null }
        $auth = if ($wlanText -match 'Authentication\\s*:\\s*([^\\r\\n]+)') { $matches[1].Trim() } else { $null }

        $audit.wifi = [PSCustomObject]@{
            Connected = $true
            SSID = $ssid
            BSSID = $bssid
            SignalPercentage = $signal
            RadioType = $radio
            Channel = $channel
            ReceiveRateMbps = $rxRate
            TransmitRateMbps = $txRate
            Authentication = $auth
        }
    } else {
        $audit.wifi = [PSCustomObject]@{ Connected = $false }
    }
} catch {
    $audit.wifi = [PSCustomObject]@{ Connected = $false; Error = $_.Exception.Message }
}

# 4. Latency & Loss Benchmark
$gatewayIp = if ($ipConfigs -and $ipConfigs[0].IPv4DefaultGateway) { $ipConfigs[0].IPv4DefaultGateway } else { $null }
$benchTargets = @()
if ($gatewayIp) { $benchTargets += [PSCustomObject]@{ Label = 'Local Gateway'; Host = $gatewayIp } }
$benchTargets += [PSCustomObject]@{ Label = 'Public DNS'; Host = '${targetHost}' }
$benchTargets += [PSCustomObject]@{ Label = 'MSP Helpdesk'; Host = 'helpdesk.velmartech.com.do' }

$pingResults = @()
foreach ($tgt in $benchTargets) {
    $p = Test-Connection -ComputerName $tgt.Host -Count 2 -ErrorAction SilentlyContinue
    if ($p) {
        $avgMs = ($p | Measure-Object -Property ResponseTime -Average).Average
        $pingResults += [PSCustomObject]@{
            Label = $tgt.Label
            Host = $tgt.Host
            AvgLatencyMs = [math]::Round($avgMs, 1)
            PacketLossPct = [math]::Round(((2 - $p.Count) / 2) * 100, 1)
            Status = 'REACHABLE'
        }
    } else {
        $pingResults += [PSCustomObject]@{
            Label = $tgt.Label
            Host = $tgt.Host
            AvgLatencyMs = -1
            PacketLossPct = 100
            Status = 'TIMEOUT'
        }
    }
}
$audit.latencyBenchmarks = $pingResults

# 5. DNS Resolution Health Benchmark
$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $dnsQuery = Resolve-DnsName -Name '${domainToResolve}' -QuickTimeout -ErrorAction Stop | Select-Object -First 2 Name, IPAddress, Type
    $sw.Stop()
    $audit.dnsHealth = [PSCustomObject]@{
        TestedDomain = '${domainToResolve}'
        DurationMs = $sw.ElapsedMilliseconds
        Resolved = $true
        Records = $dnsQuery
        Status = if ($sw.ElapsedMilliseconds -gt 2000) { 'SLOW_FALLBACK_DETECTED' } else { 'OPTIMAL' }
    }
} catch {
    $sw.Stop()
    $audit.dnsHealth = [PSCustomObject]@{
        TestedDomain = '${domainToResolve}'
        DurationMs = $sw.ElapsedMilliseconds
        Resolved = $false
        Status = 'FAILED_OR_TIMEOUT'
        Error = $_.Exception.Message
    }
}

$audit | ConvertTo-Json -Depth 4 -Compress
`;

        const stdout = await executePowershell(psScript);
        const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : { note: 'No network audit data returned' };

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
          content: [{ type: 'text', text: `Network interface audit failed: ${err.message}` }],
        };
      }
    }
  );
}
