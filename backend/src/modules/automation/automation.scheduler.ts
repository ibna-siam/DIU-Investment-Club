import { automationEngine } from './automation.engine';
import { recurringOperationsRepository } from '../recurring-operations/recurring-operations.repository';
import { remindersRepository } from '../reminders/reminders.repository';

export class AutomationScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private intervalMs: number = 60000; // 60 seconds

  /**
   * Start the server-side automated runner
   */
  start(intervalMs?: number): void {
    if (this.isRunning) return;
    if (intervalMs) this.intervalMs = intervalMs;

    this.isRunning = true;
    console.log(`[AutomationScheduler] Background scheduler started (Interval: ${this.intervalMs / 1000}s)`);

    this.intervalTimer = setInterval(async () => {
      try {
        await this.runCycle();
      } catch (err: any) {
        console.error('[AutomationScheduler] Execution cycle failed:', err.message);
      }
    }, this.intervalMs);
  }

  /**
   * Stop the background scheduler
   */
  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('[AutomationScheduler] Background scheduler stopped');
  }

  /**
   * Run a single comprehensive automation cycle
   */
  async runCycle(): Promise<{
    timestamp: string;
    rules: { evaluated: number; executed: number; errors: number };
    recurring_transactions: { generated: number; items: any[] };
    recurring_tasks: { generated: number; items: any[] };
    reminders: { sent: number; reminders: any[] };
    overdue_sweep: {
      overdue_tasks: number;
      overdue_dues: number;
      overdue_assets: number;
      pending_escalations: number;
      alerts_created: number;
    };
  }> {
    const rulesOutcome = await automationEngine.runActiveRulesEvaluation();
    const recurringTxOutcome = await recurringOperationsRepository.processDueRecurringTransactions();
    const recurringTasksOutcome = await recurringOperationsRepository.processDueRecurringTasks();
    const remindersOutcome = await remindersRepository.processDueReminders();
    const overdueOutcome = await remindersRepository.runOverdueSweep();

    return {
      timestamp: new Date().toISOString(),
      rules: rulesOutcome,
      recurring_transactions: recurringTxOutcome,
      recurring_tasks: recurringTasksOutcome,
      reminders: remindersOutcome,
      overdue_sweep: overdueOutcome,
    };
  }
}

export const automationScheduler = new AutomationScheduler();
