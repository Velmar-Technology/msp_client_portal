import { describe, it, expect } from 'vitest';
import { metricsService, register } from './metricsService';

describe('MetricsService', () => {
  it('should return valid prometheus content type', () => {
    const contentType = metricsService.getContentType();
    expect(contentType).toContain('text/plain');
  });

  it('should export prometheus metrics string with default and custom metrics', async () => {
    // Record some sample metrics
    metricsService.recordHttpRequest('GET', '/api/v1/tickets', 200, 0.045);
    metricsService.incWsConnection('agent-ws');
    metricsService.recordRateLimitHit('tenant-test');

    const metricsOutput = await metricsService.getMetrics();
    expect(metricsOutput).toContain('msp_http_request_duration_seconds');
    expect(metricsOutput).toContain('msp_http_requests_total');
    expect(metricsOutput).toContain('msp_ws_active_connections');
    expect(metricsOutput).toContain('msp_rate_limit_exceeded_total');
    expect(metricsOutput).toContain('msp_process_cpu_user_seconds_total');
  });
});
