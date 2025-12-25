/**
 * ThroughputCalculator - Calculates transfer speed and ETA
 * Uses rolling average with exponential smoothing for stable estimates
 */

import type { ThroughputSample } from '../types';

export class ThroughputCalculator {
  private samples: ThroughputSample[] = [];
  private readonly windowSize: number;
  private readonly smoothingFactor: number;
  private smoothedSpeed: number = 0;
  private lastUpdateTime: number = 0;

  /**
   * Create a new ThroughputCalculator
   * @param windowSize - Number of samples to keep (default: 10)
   * @param smoothingFactor - EMA smoothing factor 0-1 (default: 0.3)
   */
  constructor(windowSize = 10, smoothingFactor = 0.3) {
    this.windowSize = windowSize;
    this.smoothingFactor = smoothingFactor;
  }

  /**
   * Add a sample of bytes transferred
   * @param bytes - Number of bytes transferred since last sample
   * @param timestamp - Timestamp of this sample (default: Date.now())
   */
  addSample(bytes: number, timestamp: number = Date.now()): void {
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = timestamp;
      return;
    }

    const timeDelta = (timestamp - this.lastUpdateTime) / 1000; // Convert to seconds
    
    if (timeDelta <= 0) return;

    const instantSpeed = bytes / timeDelta; // Bytes per second

    // Add to samples array
    this.samples.push({ bytes, timestamp });

    // Keep only the last N samples
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }

    // Calculate exponential moving average
    if (this.smoothedSpeed === 0) {
      this.smoothedSpeed = instantSpeed;
    } else {
      this.smoothedSpeed = 
        this.smoothingFactor * instantSpeed + 
        (1 - this.smoothingFactor) * this.smoothedSpeed;
    }

    this.lastUpdateTime = timestamp;
  }

  /**
   * Get the current smoothed speed in bytes per second
   */
  getSpeed(): number {
    return this.smoothedSpeed;
  }

  /**
   * Get the average speed based on recent samples (raw, not smoothed)
   */
  getAverageSpeed(): number {
    if (this.samples.length < 2) return 0;

    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];
    const totalBytes = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    const totalTime = (lastSample.timestamp - firstSample.timestamp) / 1000;

    if (totalTime <= 0) return 0;
    return totalBytes / totalTime;
  }

  /**
   * Get estimated time remaining in seconds
   * @param remainingBytes - Number of bytes left to transfer
   */
  getETA(remainingBytes: number): number {
    const speed = this.smoothedSpeed;
    
    if (speed <= 0 || !isFinite(speed)) {
      return Infinity;
    }

    return remainingBytes / speed;
  }

  /**
   * Reset the calculator state
   */
  reset(): void {
    this.samples = [];
    this.smoothedSpeed = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Get statistics about the current throughput
   */
  getStats(): {
    currentSpeed: number;
    averageSpeed: number;
    sampleCount: number;
  } {
    return {
      currentSpeed: this.smoothedSpeed,
      averageSpeed: this.getAverageSpeed(),
      sampleCount: this.samples.length,
    };
  }
}

/**
 * Create a shared instance for global use
 */
export const throughputCalculator = new ThroughputCalculator();
