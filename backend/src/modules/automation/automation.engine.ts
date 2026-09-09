import { getDbAdmin } from '../../config/supabase';
import {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationTriggerType,
} from '../../types';
import { automationRepository } from './automation.repository';
import { notificationsRepository } from '../notifications/notifications.repository';

export class AutomationEngine {
  /**
   * Evaluates a set of conditions against a context dictionary
   */
  evaluateConditions(conditions: AutomationCondition[], context: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const cond of conditions) {
      const actualValue = context[cond.field];
      const targetValue = cond.value;

      if (actualValue === undefined || actualValue === null) {
        return false;
      }

      switch (cond.operator) {
        case 'EQUALS':
          if (String(actualValue).toLowerCase() !== String(targetValue).toLowerCase()) return false;
          break;
        case 'NOT_EQUALS':
          if (String(actualValue).toLowerCase() === String(targetValue).toLowerCase()) return false;
          break;
        case 'GREATER_THAN':
          if (Number(actualValue) <= Number(targetValue)) return false;
          break;
        case 'GREATER_THAN_OR_EQUAL':
          if (Number(actualValue) < Number(targetValue)) return false;
          break;
        case 'LESS_THAN':
          if (Number(actualValue) >= Number(targetValue)) return false;
          break;
        case 'LESS_THAN_OR_EQUAL':
          if (Number(actualValue) > Number(targetValue)) return false;
          break;
        case 'CONTAINS':
          if (!String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase())) return false;
          break;
        default:
          return false;
      }
    }

    return true;
  }

  /**
   * Safely execute actions with strict safety controls
   */
  async executeAction(
    action: AutomationAction,
    context: Record<string, any>,
    ruleId?: string,
    triggerType: string = 'SCHEDULED'
  ): Promise<{ success: boolean; result: any; error?: string }> {
    const db = getDbAdmin();

    try {
      // STRICT SAFETY GATE: Prevent unauthorized financial actions
      const forbiddenActionPatterns = [
        'POST_JOURNAL',
        'POST_ACCOUNTING_ENTRY',
        'APPROVE_EXPENSE',
        'TRANSFER_MONEY',
        'DELETE_FINANCIAL_RECORD',
      ];
      if (forbiddenActionPatterns.includes(action.type as string)) {
        throw new Error(`SAFETY VIOLATION: Automation cannot execute '${action.type}' without human authorization.`);
      }

      switch (action.type) {
        case 'CREATE_NOTIFICATION': {
          const target = action.target || 'ASSIGNEE';
          const userIds: string[] = [];

          if (target === 'ASSIGNEE' && context.assignee_id) {
            userIds.push(context.assignee_id);
          } else if (target === 'MEMBER' && context.member_id) {
            // Find user profile for member
            const { data: member } = await db.from('members').select('user_id').eq('id', context.member_id).single();
            if (member?.user_id) userIds.push(member.user_id);
          } else if (target.startsWith('ROLE:')) {
            const roleName = target.replace('ROLE:', '').trim();
            const { data: matchedRoles } = await db
              .from('roles')
              .select('id')
              .ilike('name', `%${roleName}%`);
            if (matchedRoles && matchedRoles.length > 0) {
              const roleIds = matchedRoles.map((r: any) => r.id);
              const { data: roleUsers } = await db
                .from('user_roles')
                .select('user_id')
                .in('role_id', roleIds);
              if (roleUsers) {
                roleUsers.forEach((ru: any) => userIds.push(ru.user_id));
              }
            }
          } else if (target === 'ATTENDEES' && context.attendee_ids) {
            userIds.push(...context.attendee_ids);
          } else if (context.user_id) {
            userIds.push(context.user_id);
          }

          // Fallback: If no users resolved and it's a role alert, find Super Admin
          if (userIds.length === 0) {
            const { data: adminRoles } = await db
              .from('roles')
              .select('id')
              .ilike('name', '%admin%');
            if (adminRoles && adminRoles.length > 0) {
              const adminRoleIds = adminRoles.map((r: any) => r.id);
              const { data: adminUsers } = await db
                .from('user_roles')
                .select('user_id')
                .in('role_id', adminRoleIds);
              if (adminUsers && adminUsers.length > 0) {
                userIds.push(adminUsers[0].user_id);
              }
            }
          }

          const message = action.message || 'Automation alert triggered';
          const entityId = context.record_id || context.meeting_id || context.task_id || context.event_id;
          for (const uid of Array.from(new Set(userIds))) {
            await notificationsRepository.dispatchNotification({
              user_id: uid,
              title: `Automation Notice: ${context.rule_name || triggerType}`,
              message: `${message} ${context.title ? `(${context.title})` : ''}`,
              type: 'WARNING',
              category: 'SYSTEM',
              priority: 'HIGH',
              link: context.link || '/automation',
              related_entity_type: triggerType,
              related_entity_id: entityId ? String(entityId) : undefined,
              deduplicateHours: 24,
            });
          }

          return { success: true, result: { dispatched_to_users: userIds.length } };
        }

        case 'CREATE_TASK': {
          const title = action.message || `Automated Task: Review ${triggerType}`;
          const { data: newTask, error: taskErr } = await db
            .from('tasks')
            .insert({
              title,
              description: `Generated by Automation Rule: ${context.rule_name || 'System Auto-Engine'}. Context details: ${JSON.stringify(context)}`,
              priority: action.payload?.priority || 'MEDIUM',
              status: 'TODO',
              assigned_to: context.assignee_id || null,
              due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              related_event_id: context.event_id || null,
              related_meeting_id: context.meeting_id || null,
            })
            .select()
            .single();

          if (taskErr) throw taskErr;
          return { success: true, result: { task_id: newTask.id } };
        }

        case 'CREATE_REMINDER': {
          const { data: reminder, error: remErr } = await db
            .from('reminders')
            .insert({
              title: action.message || `Reminder: ${triggerType}`,
              reminder_type: action.payload?.reminder_type || 'GENERAL',
              target_date: context.due_date || new Date().toISOString().split('T')[0],
              schedule_offset_days: 0,
              scheduled_at: new Date().toISOString(),
              recipient_user_id: context.assignee_id || context.user_id || null,
              recipient_role: action.target?.startsWith('ROLE:') ? action.target.replace('ROLE:', '') : null,
              related_record_id: context.record_id || null,
              related_module: context.module || 'AUTOMATION',
              message: action.message || 'Scheduled automation reminder',
              status: 'PENDING',
            })
            .select()
            .single();

          if (remErr) throw remErr;
          return { success: true, result: { reminder_id: reminder.id } };
        }

        case 'CREATE_APPROVAL_REQUEST': {
          // Creates a PENDING approval request that requires human review
          const { data: req, error: reqErr } = await db
            .from('approval_requests')
            .insert({
              request_type: context.request_type || 'TRANSACTION',
              reference_id: context.reference_id || context.record_id,
              title: action.message || `Approval Required: ${context.title || 'Automated Submission'}`,
              description: `Submitted by Automation Engine. Verification and sign-off required.`,
              requested_by: context.user_id || null,
              status: 'PENDING',
              current_step: 1,
              total_steps: 2,
            })
            .select()
            .single();

          if (reqErr) throw reqErr;
          return { success: true, result: { approval_request_id: req.id } };
        }

        case 'UPDATE_STATUS': {
          // Status updates strictly on non-financial operational records
          if (context.record_type === 'TASK' && context.record_id) {
            await db.from('tasks').update({ status: action.payload?.status || 'IN_PROGRESS' }).eq('id', context.record_id);
          }
          return { success: true, result: { updated_record: context.record_id } };
        }

        default:
          return { success: true, result: { simulated: true, action: action.type } };
      }
    } catch (err: any) {
      return { success: false, result: {}, error: err.message };
    }
  }

  /**
   * Run evaluation pass across all active rules for periodic triggers
   */
  async runActiveRulesEvaluation(): Promise<{ evaluated: number; executed: number; errors: number }> {
    const db = getDbAdmin();
    const rules = await automationRepository.getRules({ status: 'ACTIVE' });

    let evaluated = 0;
    let executed = 0;
    let errors = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    for (const rule of rules) {
      evaluated++;
      try {
        switch (rule.trigger_type) {
          case 'TASK_DUE_SOON': {
            // Find tasks due in next 2 days that are not completed
            const { data: upcomingTasks } = await db
              .from('tasks')
              .select('id, title, due_date, assigned_to, status')
              .not('status', 'in', '("COMPLETED","CANCELLED")')
              .not('due_date', 'is', null)
              .gte('due_date', todayStr)
              .lte('due_date', new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);

            if (upcomingTasks) {
              for (const task of upcomingTasks) {
                const dueTime = new Date(task.due_date).getTime();
                const nowTime = new Date(todayStr).getTime();
                const daysBeforeDue = Math.max(0, Math.round((dueTime - nowTime) / 86400000));

                const ctx = {
                  days_before_due: daysBeforeDue,
                  title: task.title,
                  assignee_id: task.assigned_to,
                  record_id: task.id,
                  rule_name: rule.name,
                  link: '/tasks',
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: task.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          case 'TASK_OVERDUE': {
            // Find tasks past due date
            const { data: overdueTasks } = await db
              .from('tasks')
              .select('id, title, due_date, assigned_to, status')
              .not('status', 'in', '("COMPLETED","CANCELLED")')
              .lt('due_date', todayStr);

            if (overdueTasks) {
              for (const task of overdueTasks) {
                const dueTime = new Date(task.due_date).getTime();
                const nowTime = new Date(todayStr).getTime();
                const daysAfterDue = Math.max(1, Math.round((nowTime - dueTime) / 86400000));

                const ctx = {
                  days_after_due: daysAfterDue,
                  title: task.title,
                  assignee_id: task.assigned_to,
                  record_id: task.id,
                  rule_name: rule.name,
                  link: '/tasks',
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: task.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          case 'PAYMENT_OVERDUE': {
            // Check member dues past due date
            const { data: overdueDues } = await db
              .from('member_dues')
              .select('id, member_id, amount, due_date, status')
              .not('status', 'eq', 'PAID')
              .lt('due_date', todayStr);

            if (overdueDues) {
              for (const due of overdueDues) {
                const dueTime = new Date(due.due_date).getTime();
                const nowTime = new Date(todayStr).getTime();
                const daysAfterDue = Math.max(1, Math.round((nowTime - dueTime) / 86400000));

                const ctx = {
                  days_after_due: daysAfterDue,
                  amount: Number(due.amount),
                  member_id: due.member_id,
                  record_id: due.id,
                  rule_name: rule.name,
                  link: '/member-dues',
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: due.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          case 'EVENT_BUDGET_LIMIT': {
            // Check events where actual expenses >= 80% of budget
            const { data: activeEvents } = await db
              .from('events')
              .select('id, title, status')
              .in('status', ['UPCOMING', 'ONGOING', 'PLANNING']);

            if (activeEvents) {
              for (const ev of activeEvents) {
                // Get budget total
                const { data: budgets } = await db.from('event_budgets').select('allocated_amount').eq('event_id', ev.id);
                const totalBudget = (budgets || []).reduce((sum: number, b: any) => sum + Number(b.allocated_amount), 0);

                // Get expenses total
                const { data: expenses } = await db.from('event_expenses').select('amount').eq('event_id', ev.id);
                const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

                const utilizationPct = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

                const ctx = {
                  budget_utilization_pct: utilizationPct,
                  total_budget: totalBudget,
                  total_expenses: totalExpenses,
                  title: ev.title,
                  event_id: ev.id,
                  record_id: ev.id,
                  rule_name: rule.name,
                  link: `/events/${ev.id}`,
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: ev.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          case 'APPROVAL_PENDING': {
            // Approval escalation check: requests pending > 3 days
            const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
            const { data: pendingApprovals } = await db
              .from('approval_requests')
              .select('id, title, created_at, requested_by, current_step')
              .eq('status', 'PENDING')
              .lt('created_at', threeDaysAgo);

            if (pendingApprovals) {
              for (const req of pendingApprovals) {
                const daysPending = Math.round((Date.now() - new Date(req.created_at).getTime()) / 86400000);
                const ctx = {
                  days_pending: daysPending,
                  title: req.title,
                  record_id: req.id,
                  rule_name: rule.name,
                  link: '/approvals',
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: req.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          case 'MEETING_REMINDER': {
            // Check meetings in next 24 hours
            const nowIso = new Date().toISOString();
            const next24hIso = new Date(Date.now() + 24 * 3600000).toISOString();
            const { data: upcomingMeetings } = await db
              .from('meetings')
              .select('id, title, meeting_date, start_time')
              .gte('meeting_date', todayStr)
              .lte('meeting_date', next24hIso.split('T')[0]);

            if (upcomingMeetings) {
              for (const m of upcomingMeetings) {
                const ctx = {
                  hours_before_meeting: 24,
                  title: m.title,
                  meeting_id: m.id,
                  record_id: m.id,
                  rule_name: rule.name,
                  link: '/meetings',
                };

                if (this.evaluateConditions(rule.conditions, ctx)) {
                  for (const act of rule.actions) {
                    const outcome = await this.executeAction(act, ctx, rule.id, rule.trigger_type);
                    await automationRepository.logExecution({
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      action_type: act.type,
                      result: outcome.result,
                      status: outcome.success ? 'SUCCESS' : 'FAILED',
                      error_message: outcome.error || null,
                      record_id: m.id,
                    });
                    if (outcome.success) executed++;
                    else errors++;
                  }
                }
              }
            }
            break;
          }

          default:
            break;
        }
      } catch (ruleErr: any) {
        errors++;
        await automationRepository.logExecution({
          rule_id: rule.id,
          trigger_type: rule.trigger_type,
          action_type: 'EVALUATE_RULE',
          result: {},
          status: 'FAILED',
          error_message: ruleErr.message,
        });
      }
    }

    return { evaluated, executed, errors };
  }
}

export const automationEngine = new AutomationEngine();
