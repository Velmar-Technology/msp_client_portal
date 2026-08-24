import tracer from 'dd-trace';

/**
 * Initializes the Datadog APM Tracer for Node.js distributed tracing and runtime metrics.
 * Runs before any other server dependencies are imported to ensure auto-instrumentation
 * of Express, PostgreSQL, HTTP/HTTPS, and async execution hooks.
 */
if (process.env.DD_TRACE_ENABLED === 'true' || process.env.DD_API_KEY || process.env.DD_AGENT_HOST) {
  tracer.init({
    service: process.env.DD_SERVICE || 'msp-services-server',
    env: process.env.NODE_ENV || 'production',
    version: process.env.VERSION || '1.5.2',
    logInjection: true,
    runtimeMetrics: true,
  });

  // Configure auto-instrumentation plugins
  tracer.use('express');
  tracer.use('pg', {
    service: `${process.env.DD_SERVICE || 'msp-services-server'}-postgres`,
  });
  tracer.use('http', {
    splitByDomain: false,
  });
}

export default tracer;
