import { log } from '../vite';

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  /**
   * Track execution time of a function
   */
  static async track<T>(
    name: string,
    fn: () => Promise<T> | T,
    logSlow = true,
    threshold = 100
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      // Store metric
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);

      // Keep only last 100 measurements
      const metrics = this.metrics.get(name)!;
      if (metrics.length > 100) {
        metrics.shift();
      }

      // Log slow operations
      if (logSlow && duration > threshold) {
        log(`⚠️  Slow operation: ${name} took ${duration}ms`, 'performance');
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log(`❌ Failed operation: ${name} took ${duration}ms`, 'performance');
      throw error;
    }
  }

  /**
   * Get statistics for a metric
   */
  static getStats(name: string) {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Get all metrics
   */
  static getAllStats() {
    const stats: Record<string, any> = {};
    const names = Array.from(this.metrics.keys());
    for (const name of names) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Clear all metrics
   */
  static clear() {
    this.metrics.clear();
  }
}

/**
 * Decorator for tracking method performance
 */
export function trackPerformance(threshold = 100) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      return PerformanceMonitor.track(
        name,
        () => originalMethod.apply(this, args),
        true,
        threshold
      );
    };

    return descriptor;
  };
}
