import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('msp_helpdesk'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Admin Credentials
  ADMIN_EMAIL: z.string().email().default('admin@msp-services.com'),
  ADMIN_PASSWORD: z.string().min(8).default('password123'),

  // JWT
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 587 : val),
    z.coerce.number().default(587)
  ),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),

  // WhatsApp
  WHATSAPP_API_URL: z.string().default(''),
  WHATSAPP_API_KEY: z.string().default(''),

  // File Uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),

  // NextCloud
  NEXTCLOUD_URL: z.string().default('http://localhost:8080'),
  NEXTCLOUD_APP_USER: z.string().default(''),
  NEXTCLOUD_APP_PASS: z.string().default(''),
  NEXTCLOUD_TOTAL_CAPACITY: z.coerce.number().default(5000000000000), // Default 5.0 TB
  NEXTCLOUD_EXTERNAL_URL: z.string().default('https://atlas.velmartech.com.do'),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().default(''),
  PAYPAL_CLIENT_SECRET: z.string().default(''),
  PAYPAL_API_URL: z.string().default(''),

  // Zabbix RMM
  ZABBIX_URL: z.string().default('http://localhost:8080/api_jsonrpc.php'),
  ZABBIX_USER: z.string().default('Admin'),
  ZABBIX_PASSWORD: z.string().default('zabbix'),
  ZABBIX_WEBHOOK_SECRET: z.string().default(''),

  // Redis Cache & Locks
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  REDIS_TIMEOUT_MS: z.coerce.number().default(2000),

  // Datadog APM & Observability (Optional)
  DD_API_KEY: z.string().optional(),
  DD_SITE: z.string().default('datadoghq.com'),
  DD_SERVICE: z.string().default('msp-services-server'),
  DD_ENV: z.string().default('production'),
  DD_VERSION: z.string().default('1.5.2'),
  DD_TRACE_ENABLED: z.string().default('false'),
  DD_AGENT_HOST: z.string().optional(),

  // SSL / TLS / HTTPS / WSS Support
  ENABLE_HTTPS: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  SSL_KEY_PATH: z.string().optional(),
  SSL_CERT_PATH: z.string().optional(),
  SSL_CA_PATH: z.string().optional(),
  SSL_KEY: z.string().optional(),
  SSL_CERT: z.string().optional(),
  SSL_CA: z.string().optional(),
  EXTERNAL_GATEWAY_URL: z.string().default('wss://helpdesk.velmartech.com.do/agent-ws'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
