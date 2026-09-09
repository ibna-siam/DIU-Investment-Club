/**
 * DIU Investment Club - Background Smart Reminder Scheduler
 *
 * Implements Section 7: Scheduler Architecture
 * - Automatically ticks to process due reminders.
 * - Non-blocking, isolated execution with concurrency guard.
 * - Timezone-aware (Asia/Dhaka).
 * - Safe manual triggers and lifecycle control.
 */

import { remindersRepository } from './reminders.repository';

export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private intervalMs: number = 60 * 1000; // 60 seconds default tick
  private totalTicks = 0;
  private lastTickAt: string | null = null;
  private lastResult: any = null;

  constructor(intervalMs: number = 60 * 1000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Starts the background scheduler loop
   */
  start(): void {
    if (this.timer) {
      console.log('ℹ️ [ReminderScheduler] Scheduler already running.');
      return;
    }

    console.log(`⏰ [ReminderScheduler] Starting background scheduler (interval: ${this.intervalMs / 1000}s)`);
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('❌ [ReminderScheduler] Unhandled error during scheduled tick:', err);
      });
    }, this.intervalMs);

    // Initial tick on start
    setImmediate(() => {
      this.tick().catch((err) => {
        console.error('❌ [ReminderScheduler] Initial tick error:', err);
      });
    });
  }

  /**
   * Stops the background scheduler loop
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 [ReminderScheduler] Background scheduler stopped.');
    }
  }

  /**
   * Checks if the scheduler is actively running
   */
  isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Executes a single processing tick (thread-safe)
   */
  async tick(): Promise<{ sent: number; skipped: number; cancelled: number; reminders: any[] }> {
    if (this.isProcessing) {
      console.warn('⚠️ [ReminderScheduler] Previous tick still executing. Skipping concurrent overlap.');
      return { sent: 0, skipped: 0, cancelled: 0, reminders: [] };
    }

    this.isProcessing = true;
    this.totalTicks++;
    this.lastTickAt = new Date().toISOString();

    try {
      const result = await remindersRepository.processDueReminders();
      this.lastResult = result;
      if (result.sent > 0 || result.cancelled > 0) {
        console.log(`⚡ [ReminderScheduler] Tick #${this.totalTicks} completed: ${result.sent} sent, ${result.cancelled} cancelled.`);
      }
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual on-demand trigger (for Admin API or tests)
   */
  async triggerManualTick(): Promise<any> {
    console.log('👆 [ReminderScheduler] Manual tick triggered by authorized administration.');
    return this.tick();
  }

  /**
   * Returns operational status and telemetry
   */
  getStatus(): {
    running: boolean;
    intervalSeconds: number;
    totalTicks: number;
    lastTickAt: string | null;
    lastResult: any;
  } {
    return {
      running: this.isRunning(),
      intervalSeconds: this.intervalMs / 1000,
      totalTicks: this.totalTicks,
      lastTickAt: this.lastTickAt,
      lastResult: this.lastResult,
    };
  }
}

export const reminderScheduler = new ReminderScheduler(60 * 1000);
