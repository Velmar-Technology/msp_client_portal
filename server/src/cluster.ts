import cluster from 'node:cluster';
import os from 'node:os';
import { logger } from '@shared/utils/logger';

/**
 * Multi-worker Node.js Cluster Master Runner.
 *
 * Spawns a pool of worker processes sharing the primary HTTP and WebSocket ports.
 * High-concurrency telemetry and persistent agent connections are balanced across
 * the worker pool by the Node.js OS socket distribution engine. Cross-worker command
 * routing and telemetry micro-batching are handled transparently by Redis Pub/Sub
 * and Redis write-behind buffers.
 */
export function startClusterMaster(): void {
  const cpuCount = os.cpus().length;
  const workerConcurrency =
    parseInt(process.env.WEB_CONCURRENCY || '', 10) || Math.max(1, Math.min(cpuCount, 8));

  logger.info(
    `[ClusterMaster] Primary process PID ${process.pid} initializing ${workerConcurrency} workers (${cpuCount} CPUs detected)...`
  );

  let isShuttingDown = false;

  for (let i = 0; i < workerConcurrency; i++) {
    cluster.fork({ WORKER_ID: `worker-${i + 1}` });
  }

  cluster.on('online', (worker) => {
    logger.info(`[ClusterMaster] Worker ${worker.id} (PID ${worker.process.pid}) is online and ready.`);
  });

  cluster.on('exit', (worker, code, signal) => {
    if (isShuttingDown) {
      logger.info(`[ClusterMaster] Worker ${worker.id} shut down gracefully.`);
      return;
    }

    logger.warn(
      `[ClusterMaster] Worker ${worker.id} (PID ${worker.process.pid}) died (code: ${code}, signal: ${signal}). Forking replacement worker...`
    );
    cluster.fork();
  });

  const forwardSignal = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[ClusterMaster] Received ${signal}. Relaying graceful shutdown to all worker processes...`);

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker && !worker.isDead()) {
        worker.process.kill(signal as NodeJS.Signals);
      }
    }
  };

  process.on('SIGTERM', () => forwardSignal('SIGTERM'));
  process.on('SIGINT', () => forwardSignal('SIGINT'));
}

if (cluster.isPrimary) {
  startClusterMaster();
} else {
  // Worker process: Boot standard application server
  import('./index');
}
