import tls from 'node:tls';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

interface ImapEmailResult {
  from: string;
  to: string;
  subject: string;
  date: string;
  bodySnippet: string;
  mailboxCount: number;
}

/**
 * Fetches the most recent email message from an IMAP mailbox over TLS (port 993).
 *
 * @param host - IMAP server host (e.g. imap.gmail.com)
 * @param port - IMAP SSL/TLS port (typically 993)
 * @param user - Mailbox account username or email
 * @param pass - Mailbox account password or app-specific password
 * @param folder - Target mailbox folder (default: INBOX)
 * @param timeoutMs - Connection timeout in milliseconds
 * @returns Parsed email headers and body preview
 */
async function fetchLatestImapEmail(
  host: string,
  port: number,
  user: string,
  pass: string,
  folder: string = 'INBOX',
  timeoutMs: number = 6000
): Promise<ImapEmailResult> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let buffer = '';
    let step = 0; // 0: wait greeting, 1: login sent, 2: select sent, 3: fetch sent, 4: logout
    let messageCount = 0;

    const cleanup = (err?: Error, result?: ImapEmailResult) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      if (err) reject(err);
      else if (result) resolve(result);
    };

    const socket = tls.connect(
      {
        host,
        port,
        timeout: timeoutMs,
        rejectUnauthorized: false, // Permit self-signed internal certs if applicable
      },
      () => {
        // Connected, waiting for server greeting
      }
    );

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      cleanup(new Error(`IMAP connection timed out after ${timeoutMs}ms`));
    });

    socket.on('error', (err) => {
      cleanup(new Error(`IMAP socket error: ${err.message}`));
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      if (step === 0 && buffer.includes('* OK')) {
        step = 1;
        buffer = '';
        socket.write(`A1 LOGIN "${user}" "${pass}"\r\n`);
      } else if (step === 1 && (buffer.includes('A1 OK') || buffer.includes('A1 NO') || buffer.includes('A1 BAD'))) {
        if (!buffer.includes('A1 OK')) {
          cleanup(new Error(`IMAP authentication failed for ${user}: ${buffer.trim()}`));
          return;
        }
        step = 2;
        buffer = '';
        socket.write(`A2 SELECT "${folder}"\r\n`);
      } else if (step === 2 && (buffer.includes('A2 OK') || buffer.includes('A2 NO') || buffer.includes('A2 BAD'))) {
        if (!buffer.includes('A2 OK')) {
          cleanup(new Error(`Failed to select folder ${folder}: ${buffer.trim()}`));
          return;
        }
        // Parse message count: * 42 EXISTS
        const existsMatch = buffer.match(/\*\s+(\d+)\s+EXISTS/i);
        messageCount = existsMatch ? parseInt(existsMatch[1], 10) : 0;

        if (messageCount <= 0) {
          cleanup(undefined, {
            from: 'N/A',
            to: user,
            subject: 'Mailbox Empty',
            date: new Date().toISOString(),
            bodySnippet: `Folder ${folder} contains 0 messages.`,
            mailboxCount: 0,
          });
          return;
        }

        step = 3;
        buffer = '';
        socket.write(`A3 FETCH ${messageCount} (BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)] BODY.PEEK[TEXT]<0.1500>)\r\n`);
      } else if (step === 3 && (buffer.includes('A3 OK') || buffer.includes('A3 NO') || buffer.includes('A3 BAD'))) {
        // Parse email headers and snippet
        const fromMatch = buffer.match(/^From:\s*(.+)$/im);
        const toMatch = buffer.match(/^To:\s*(.+)$/im);
        const subjectMatch = buffer.match(/^Subject:\s*(.+)$/im);
        const dateMatch = buffer.match(/^Date:\s*(.+)$/im);

        // Extract body text after headers
        const lines = buffer.split('\r\n');
        const bodyLines: string[] = [];
        let inBody = false;

        for (const line of lines) {
          if (line.startsWith('*') && line.includes('FETCH')) {
            inBody = true;
            continue;
          }
          if (line.startsWith('A3 OK')) {
            break;
          }
          if (inBody && !line.startsWith('From:') && !line.startsWith('To:') && !line.startsWith('Subject:') && !line.startsWith('Date:')) {
            bodyLines.push(line);
          }
        }

        const bodySnippet = bodyLines.join('\n').trim().replace(/--[a-f0-9_\-]+/gi, '').slice(0, 1000);

        socket.write('A4 LOGOUT\r\n');

        cleanup(undefined, {
          from: fromMatch ? fromMatch[1].trim() : 'Unknown',
          to: toMatch ? toMatch[1].trim() : user,
          subject: subjectMatch ? subjectMatch[1].trim() : '(No Subject)',
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          bodySnippet: bodySnippet || '(Empty or HTML message)',
          mailboxCount: messageCount,
        });
      }
    });
  });
}

/**
 * Registers email inspection and portal notification tools on the McpServer instance.
 *
 * @param server - McpServer instance
 * @param apiClient - MspApiClient instance
 */
export function registerEmailTools(server: McpServer, apiClient: MspApiClient): void {
  // 1. Tool: msp_get_last_email
  server.tool(
    'msp_get_last_email',
    'Retrieve the most recent email or dispatched notification, inspecting either an IMAP mailbox (Gmail / custom mail server) or portal email alerts',
    {
      source: z
        .enum(['auto', 'inbox', 'portal_notifications'])
        .default('auto')
        .describe("Data source: 'auto' (tries IMAP if credentials provided, otherwise portal notifications), 'inbox' (direct IMAP query), or 'portal_notifications' (system dispatched email alerts)"),
      imapHost: z
        .string()
        .default('imap.gmail.com')
        .describe('IMAP server hostname (default: imap.gmail.com)'),
      imapPort: z
        .number()
        .default(993)
        .describe('IMAP SSL/TLS port (default: 993)'),
      email: z
        .string()
        .optional()
        .describe('Email account address (defaults to IMAP_USER or current profile)'),
      password: z
        .string()
        .optional()
        .describe('Email or App Password (defaults to IMAP_PASSWORD or SMTP_PASSWORD)'),
      folder: z
        .string()
        .default('INBOX')
        .describe('IMAP folder to inspect (default: INBOX)'),
      timeoutMs: z
        .number()
        .default(6000)
        .describe('IMAP connection timeout in milliseconds (default: 6000)'),
    },
    async ({ source, imapHost, imapPort, email, password, folder, timeoutMs }) => {
      const imapUser = email || process.env.IMAP_USER || process.env.SMTP_USER || 'epolanco@velmartech.com.do';
      const imapPass = password || process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD;

      // Case A: Query IMAP Inbox directly
      if (source === 'inbox' || (source === 'auto' && imapPass)) {
        if (!imapPass) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'IMAP password required to inspect mailbox. Please provide the "password" argument or set IMAP_PASSWORD in your environment.',
              },
            ],
          };
        }

        try {
          const emailData = await fetchLatestImapEmail(imapHost, imapPort, imapUser, imapPass, folder, timeoutMs);
          const markdown = `# Latest Email from Mailbox (\`${imapUser}\`)
**Server:** \`${imapHost}:${imapPort}\` | **Folder:** \`${folder}\` | **Total Messages:** ${emailData.mailboxCount}

---

- **From:** \`${emailData.from}\`
- **To:** \`${emailData.to}\`
- **Subject:** **${emailData.subject}**
- **Date:** \`${emailData.date}\`

### Message Preview:
\`\`\`text
${emailData.bodySnippet}
\`\`\`
`;
          return {
            content: [
              {
                type: 'text',
                text: markdown,
              },
            ],
          };
        } catch (err: any) {
          if (source === 'inbox') {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Failed to query IMAP mailbox (${imapHost}): ${err.message}`,
                },
              ],
            };
          }
          // In 'auto' mode, fall through to portal notifications on IMAP error
        }
      }

      // Case B: Query System Dispatched Notifications & Email Alerts
      try {
        const notifResult = await apiClient.getNotifications();
        const notifications = notifResult.notifications || (Array.isArray(notifResult) ? notifResult : []);

        if (notifications.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `# Latest Email & Dispatched Alerts
No dispatched emails or notifications found in the user log.
`,
              },
            ],
          };
        }

        const latest = notifications[0];
        const markdown = `# Latest Portal Email & System Notification
**Notification ID:** \`${latest.id}\`  
**Dispatched At:** \`${latest.created_at}\`  
**Unread Count:** ${notifResult.unreadCount ?? 0}  
**Status:** ${latest.read ? '🟢 Read' : '🟡 Unread'}

---

- **Event Type:** \`${latest.type}\`
- **Subject / Title:** **${latest.title}**
- **Recipient User ID:** \`${latest.user_id}\`
${latest.link ? `- **Action Link:** \`${latest.link}\`` : ''}
${latest.ticket_id ? `- **Linked Ticket:** \`${latest.ticket_id}\`` : ''}

### Content Body:
> ${latest.message}
`;
        return {
          content: [
            {
              type: 'text',
              text: markdown,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to retrieve portal email notifications: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  // 2. Tool: msp_list_notifications
  server.tool(
    'msp_list_notifications',
    'List recent transactional email notifications, ticket alerts, and system broadcast events',
    {
      limit: z.number().default(5).describe('Maximum notifications to retrieve (default: 5)'),
    },
    async ({ limit }) => {
      try {
        const notifResult = await apiClient.getNotifications();
        const notifications = (notifResult.notifications || (Array.isArray(notifResult) ? notifResult : [])).slice(0, limit);

        if (notifications.length === 0) {
          return {
            content: [{ type: 'text', text: 'No notifications or email alerts found.' }],
          };
        }

        const rows = notifications
          .map(
            (n) =>
              `| \`${n.created_at}\` | **${n.type}** | ${n.title} | ${n.message.substring(0, 60)}... | ${n.read ? '🟢 Read' : '🟡 Unread'} |`
          )
          .join('\n');

        const markdown = `# Portal Email Notifications & Alerts (Total: ${notifResult.unreadCount ?? 0} unread)

| Dispatched Date | Type | Title | Summary | Status |
| :--- | :--- | :--- | :--- | :---: |
${rows}
`;
        return {
          content: [{ type: 'text', text: markdown }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list notifications: ${err.message}` }],
        };
      }
    }
  );
}
