import client from 'prom-client';

// Create a dedicated Registry for the MSP application
export const register = new client.Registry();

// Enable the collection of default Node.js process and runtime metrics
client.collectDefaultMetrics({
  register,
});

// ---- Custom Application Metrics ----

// HTTP Request Duration Histogram
export const httpRequestDuration = new client.Histogram({
  name: 'msp_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDuration);

// Total HTTP Requests Counter
export const httpRequestsTotal = new client.Counter({
  name: 'msp_http_requests_total',
  help: 'Total number of HTTP requests handled by the server',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// Active WebSocket Connections Gauge
export const wsActiveConnections = new client.Gauge({
  name: 'msp_ws_active_connections',
  help: 'Current number of active agent WebSocket connections',
  labelNames: ['gateway'],
});
register.registerMetric(wsActiveConnections);

// Rate Limit Exceeded Counter
export const rateLimitHitsTotal = new client.Counter({
  name: 'msp_rate_limit_exceeded_total',
  help: 'Total number of rate-limited requests (HTTP 429)',
  labelNames: ['tenant_key'],
});
register.registerMetric(rateLimitHitsTotal);

export class MetricsService {
  /**
   * Return the MIME content type for Prometheus metrics scraping
   */
  getContentType(): string {
    return register.contentType;
  }

  /**
   * Return formatted Prometheus metrics string
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Record HTTP request completion telemetry
   */
  recordHttpRequest(method: string, route: string, statusCode: number | string, durationSeconds: number): void {
    const labels = {
      method: method.toUpperCase(),
      route: route || 'unknown',
      status_code: String(statusCode),
    };
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  }

  /**
   * WebSocket connection tracking
   */
  incWsConnection(gateway = 'agent-ws'): void {
    wsActiveConnections.inc({ gateway });
  }

  decWsConnection(gateway = 'agent-ws'): void {
    wsActiveConnections.dec({ gateway });
  }

  /**
   * Record rate limit breach event
   */
  recordRateLimitHit(tenantKey = 'anonymous'): void {
    rateLimitHitsTotal.inc({ tenant_key: tenantKey });
  }
}

export const metricsService = new MetricsService();
