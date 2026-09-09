import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import https from 'node:https';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

interface PortCheckResult {
  port: number;
  service: string;
  host: string;
  isOpen: boolean;
  latencyMs: number;
  banner?: string;
  error?: string;
}

interface HttpsCheckResult {
  url: string;
  isReachable: boolean;
  statusCode?: number;
  latencyMs: number;
  sslCertificate?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    isExpired: boolean;
  };
  error?: string;
}

const COMMON_MAIL_PORTS: Array<{ port: number; service: string }> = [
  { port: 25, service: 'SMTP (Relay / Transfer)' },
  { port: 587, service: 'SMTP Submission (STARTTLS)' },
  { port: 465, service: 'SMTPS (Implicit TLS)' },
  { port: 993, service: 'IMAPS (Encrypted Mail Access)' },
  { port: 995, service: 'POP3S (Encrypted Mail Access)' },
];

/**
 * Formats a certificate field that may be a single string or an array of strings.
 *
 * @param val - String or string array value from tls.PeerCertificate
 * @returns Formatted string or empty string if undefined
 */
function formatCertField(val?: string | string[]): string {
  if (!val) return '';
  return Array.isArray(val) ? val.join(', ') : val;
}

/**
 * Probes a TCP socket connection to a target host and port.
 *
 * @param host - Hostname or IP address
 * @param port - Destination TCP port
 * @param service - Human-readable service label
 * @param timeoutMs - Connection timeout in milliseconds
 * @returns PortCheckResult with connectivity status and response latency
 */
async function probeTcpPort(
  host: string,
  port: number,
  service: string,
  timeoutMs: number = 4000
): Promise<PortCheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();

    const finish = (isOpen: boolean, error?: string, banner?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        port,
        service,
        host,
        isOpen,
        latencyMs: Date.now() - start,
        banner,
        error,
      });
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      // Allow brief window to read initial server greeting banner (e.g. SMTP 220 banner)
      socket.once('data', (data) => {
        const bannerText = data.toString('utf8').trim().split('\n')[0];
        finish(true, undefined, bannerText);
      });

      // If no banner received in 500ms, consider open without banner
      setTimeout(() => {
        finish(true);
      }, 500);
    });

    socket.on('timeout', () => {
      finish(false, `Connection timed out after ${timeoutMs}ms`);
    });

    socket.on('error', (err: any) => {
      finish(false, err.message || 'Connection refused or unreachable');
    });

    socket.connect(port, host);
  });
}

/**
 * Checks an HTTPS web endpoint and inspects its TLS certificate details.
 *
 * @param targetUrl - Full URL to probe
 * @param timeoutMs - Request timeout in milliseconds
 * @returns HttpsCheckResult with status code, latency, and SSL certificate parameters
 */
async function probeHttpsEndpoint(targetUrl: string, timeoutMs: number = 5000): Promise<HttpsCheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    let resolved = false;

    const finish = (result: Partial<HttpsCheckResult>) => {
      if (resolved) return;
      resolved = true;
      resolve({
        url: targetUrl,
        isReachable: result.isReachable ?? false,
        statusCode: result.statusCode,
        latencyMs: Date.now() - start,
        sslCertificate: result.sslCertificate,
        error: result.error,
      });
    };

    try {
      const parsedUrl = new URL(targetUrl);
      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'MSP-Service-Monitor/1.0',
          Accept: '*/*',
        },
        rejectUnauthorized: false, // Inspect cert even if untrusted/expired
      };

      const req = https.request(options, (res) => {
        const socket = res.socket as tls.TLSSocket;
        let sslInfo: HttpsCheckResult['sslCertificate'];

        if (socket && typeof socket.getPeerCertificate === 'function') {
          const cert = socket.getPeerCertificate();
          if (cert && Object.keys(cert).length > 0) {
            const validToDate = new Date(cert.valid_to);
            const daysRemaining = Math.ceil((validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const issuerOrg = formatCertField(cert.issuer?.O);
            const issuerCn = formatCertField(cert.issuer?.CN);
            const issuerName = issuerOrg || issuerCn || 'Unknown';

            sslInfo = {
              subject: cert.subject ? JSON.stringify(cert.subject) : 'Unknown',
              issuer: issuerName,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysRemaining,
              isExpired: daysRemaining < 0,
            };
          }
        }

        res.resume(); // Consume stream to complete request
        finish({
          isReachable: true,
          statusCode: res.statusCode,
          sslCertificate: sslInfo,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        finish({ isReachable: false, error: `Request timed out after ${timeoutMs}ms` });
      });

      req.on('error', (err: any) => {
        finish({ isReachable: false, error: err.message || 'HTTPS request failed' });
      });

      req.end();
    } catch (err: any) {
      finish({ isReachable: false, error: err.message });
    }
  });
}

/**
 * Registers domain diagnostics and system API status tools on the McpServer instance.
 *
 * @param server - Target McpServer instance
 * @param apiClient - MspApiClient instance for internal backend status queries
 */
export function registerDomainTools(server: McpServer, apiClient: MspApiClient): void {
  // 1. Tool: msp_check_domain_services
  server.tool(
    'msp_check_domain_services',
    'Comprehensive diagnostic audit of a domain (e.g. helpdesk.velmartech.com.do) checking DNS, Email services (SMTP/IMAP/POP3), HTTPS portal availability, and SSL certificate validity',
    {
      domain: z
        .string()
        .default('helpdesk.velmartech.com.do')
        .describe('Target domain or hostname to diagnose (e.g. helpdesk.velmartech.com.do)'),
      checkEmailServices: z
        .boolean()
        .default(true)
        .describe('Whether to probe email and mail relay ports (SMTP 25, 587, 465, IMAP 993, POP3 995)'),
      checkWebServices: z
        .boolean()
        .default(true)
        .describe('Whether to probe web portal endpoints and audit SSL certificate expiration'),
      timeoutMs: z
        .number()
        .default(4000)
        .describe('Socket and HTTP connection timeout in milliseconds (default: 4000ms)'),
    },
    async ({ domain, checkEmailServices, checkWebServices, timeoutMs }) => {
      const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      const timestamp = new Date().toISOString();

      // Step 1: DNS Diagnostics
      const dnsReport: {
        ipv4Addresses: string[];
        ipv6Addresses: string[];
        mxRecords: Array<{ exchange: string; priority: number }>;
        txtRecords: string[];
        dnsError?: string;
      } = {
        ipv4Addresses: [],
        ipv6Addresses: [],
        mxRecords: [],
        txtRecords: [],
      };

      try {
        const [aRecords, mxRecords, txtRecords] = await Promise.allSettled([
          dns.resolve4(cleanDomain),
          dns.resolveMx(cleanDomain),
          dns.resolveTxt(cleanDomain),
        ]);

        if (aRecords.status === 'fulfilled') {
          dnsReport.ipv4Addresses = aRecords.value;
        }
        if (mxRecords.status === 'fulfilled') {
          dnsReport.mxRecords = mxRecords.value.sort((a, b) => a.priority - b.priority);
        }
        if (txtRecords.status === 'fulfilled') {
          dnsReport.txtRecords = txtRecords.value.map((chunks) => chunks.join(''));
        }

        try {
          const aaaa = await dns.resolve6(cleanDomain);
          dnsReport.ipv6Addresses = aaaa;
        } catch {
          // IPv6 not configured or not available
        }
      } catch (err: any) {
        dnsReport.dnsError = err.message || 'DNS resolution failed';
      }

      // Step 2: Email Services Diagnostic Probe
      const emailPortChecks: PortCheckResult[] = [];
      if (checkEmailServices) {
        const mailHosts: string[] = [];
        if (dnsReport.mxRecords.length > 0) {
          mailHosts.push(dnsReport.mxRecords[0].exchange);
        }
        if (!mailHosts.includes(cleanDomain)) {
          mailHosts.push(cleanDomain);
        }

        for (const host of mailHosts) {
          const portProbes = await Promise.all(
            COMMON_MAIL_PORTS.map((p) => probeTcpPort(host, p.port, p.service, timeoutMs))
          );
          emailPortChecks.push(...portProbes);
        }
      }

      // Step 3: Web Portal & SSL Health
      let webReport: HttpsCheckResult | undefined;
      if (checkWebServices) {
        webReport = await probeHttpsEndpoint(`https://${cleanDomain}`, timeoutMs);
      }

      const hasDns = dnsReport.ipv4Addresses.length > 0 || dnsReport.mxRecords.length > 0;
      const openMailPorts = emailPortChecks.filter((p) => p.isOpen);

      let overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' = 'OPERATIONAL';
      if (!hasDns) {
        overallStatus = 'DOWN';
      } else if ((checkWebServices && !webReport?.isReachable) || (checkEmailServices && openMailPorts.length === 0)) {
        overallStatus = 'DEGRADED';
      }

      const dnsIpv4List = dnsReport.ipv4Addresses.length > 0 ? dnsReport.ipv4Addresses.join(', ') : 'None resolved';
      const mxRows =
        dnsReport.mxRecords.length > 0
          ? dnsReport.mxRecords.map((m) => `- **Priority ${m.priority}:** \`${m.exchange}\``).join('\n')
          : '- *No MX records published*';

      const emailRows =
        emailPortChecks.length > 0
          ? emailPortChecks
              .map(
                (p) =>
                  `| \`${p.host}\` | **Port ${p.port}** (${p.service}) | ${p.isOpen ? '🟢 **OPEN**' : '🔴 **CLOSED**'} | ${p.latencyMs}ms | ${p.banner ? `\`${p.banner.substring(0, 40)}\`` : p.error || 'N/A'} |`
              )
              .join('\n')
          : '| *N/A* | *Email checks skipped* | - | - | - |';

      const sslStatus = webReport?.sslCertificate
        ? `Issuer: ${webReport.sslCertificate.issuer} | Valid until: ${webReport.sslCertificate.validTo} (${webReport.sslCertificate.daysRemaining} days remaining, ${webReport.sslCertificate.isExpired ? '🔴 EXPIRED' : '🟢 VALID'})`
        : 'Certificate not evaluated';

      const markdownSummary = `# Vital Services Health Audit: \`${cleanDomain}\`
**Audit Timestamp:** ${timestamp}  
**Overall Status:** ${overallStatus === 'OPERATIONAL' ? '🟢 **OPERATIONAL**' : overallStatus === 'DEGRADED' ? '🟡 **DEGRADED**' : '🔴 **DOWN**'}

---

## 1. Domain & DNS Resolution
- **IPv4 (A Records):** \`${dnsIpv4List}\`
- **IPv6 (AAAA Records):** \`${dnsReport.ipv6Addresses.length > 0 ? dnsReport.ipv6Addresses.join(', ') : 'None'}\`
- **Mail Exchange (MX) Configuration:**
${mxRows}
- **TXT / SPF Records Found:** ${dnsReport.txtRecords.length > 0 ? dnsReport.txtRecords.map((t) => `\`${t}\``).join(', ') : 'None'}

---

## 2. Email Services Health (SMTP & Mail Protocols)
| Host | Port / Protocol | Status | Latency | Response / Banner |
| :--- | :--- | :---: | :---: | :--- |
${emailRows}

---

## 3. Web Portal & HTTPS Connectivity
- **Target URL:** \`${webReport?.url || `https://${cleanDomain}`}\`
- **Reachability:** ${webReport?.isReachable ? '🟢 Reached' : '🔴 Unreachable'}
- **HTTP Status Code:** \`${webReport?.statusCode || 'N/A'}\`
- **Response Latency:** \`${webReport?.latencyMs || 0}ms\`
- **SSL / TLS Certificate:** ${sslStatus}
${webReport?.error ? `- **Error Note:** ${webReport.error}` : ''}
`;

      return {
        content: [
          {
            type: 'text',
            text: markdownSummary,
          },
        ],
      };
    }
  );

  // 2. Tool: msp_get_system_api_status
  server.tool(
    'msp_get_system_api_status',
    'Retrieve internal system API health metrics, database latency, Nextcloud storage status, and environment variables audit from the MSP platform backend',
    {},
    async () => {
      try {
        const status = await apiClient.getSystemApiStatus();
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
          content: [
            {
              type: 'text',
              text: `Failed to retrieve system API status: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
