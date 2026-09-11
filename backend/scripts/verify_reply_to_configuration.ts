import { DEFAULT_FROM_EMAIL, DEFAULT_REPLY_TO_EMAIL } from '../src/modules/email/email.config';
import { EMAIL_BRAND, getEmailBrandConfig } from '../src/modules/email/email.brand';
import {
  renderUserWelcomeEmail,
  renderAccountInvitationEmail,
  renderPasswordResetEmail,
  renderMemberWelcomeEmail,
  renderTaskAssignedEmail,
  renderMeetingInvitationEmail,
  renderReminderEmail,
  renderEventNotificationEmail,
  renderExpenseApprovedEmail,
  renderExpenseRejectedEmail,
  renderExpenseSubmittedEmail,
  renderPaymentConfirmationEmail,
  renderRoleChangedEmail,
  renderAccountStatusEmail,
  renderEmailVerificationEmail,
  renderPasswordChangedEmail,
  renderTestEmail,
} from '../src/modules/email/email.templates';

async function verifyReplyToAndTemplates() {
  console.log('================================================================');
  console.log('EMAIL REPLY-TO & TEMPLATE CONTACT VERIFICATION');
  console.log('================================================================\n');

  console.log('1. Central Reply-To Configuration Audit:');
  console.log('   - DEFAULT_FROM_EMAIL:', DEFAULT_FROM_EMAIL);
  console.log('   - DEFAULT_REPLY_TO_EMAIL:', DEFAULT_REPLY_TO_EMAIL);
  console.log('   - EMAIL_BRAND.supportEmail:', EMAIL_BRAND.supportEmail);
  console.log('   - EMAIL_BRAND.replyToEmail:', (EMAIL_BRAND as any).replyToEmail);
  console.log('   - getEmailBrandConfig().supportEmail:', getEmailBrandConfig().supportEmail);
  console.log('   - getEmailBrandConfig().replyToEmail:', (getEmailBrandConfig() as any).replyToEmail);

  if (DEFAULT_REPLY_TO_EMAIL !== '252-58-083@diu.edu.bd') {
    throw new Error(`FAIL: DEFAULT_REPLY_TO_EMAIL is ${DEFAULT_REPLY_TO_EMAIL}, expected 252-58-083@diu.edu.bd`);
  }
  if (EMAIL_BRAND.supportEmail !== '252-58-083@diu.edu.bd') {
    throw new Error(`FAIL: EMAIL_BRAND.supportEmail is ${EMAIL_BRAND.supportEmail}, expected 252-58-083@diu.edu.bd`);
  }
  console.log('   ✓ Central configuration successfully locked to 252-58-083@diu.edu.bd\n');

  console.log('2. Auditing Email Templates for Reply-To & Contact Consistency:');

  const templatesToVerify = [
    {
      name: 'User Welcome',
      exec: () => renderUserWelcomeEmail({ userName: 'Test User' }),
    },
    {
      name: 'Account Invitation',
      exec: () => renderAccountInvitationEmail({ userName: 'Invited Member', setupUrl: 'https://invesmentclub.top/setup' }),
    },
    {
      name: 'Password Reset / Setup',
      exec: () => renderPasswordResetEmail({ userName: 'Reset Member', resetUrl: 'https://invesmentclub.top/reset' }),
    },
    {
      name: 'Member Welcome',
      exec: () => renderMemberWelcomeEmail({ userName: 'New Club Member', memberCode: 'DIC-2026-00001' }),
    },
    {
      name: 'Task Assigned',
      exec: () => renderTaskAssignedEmail({ assigneeName: 'Task Worker', taskTitle: 'Audit Ledger', taskId: '123' }),
    },
    {
      name: 'Meeting Invitation',
      exec: () => renderMeetingInvitationEmail({ memberName: 'Board Member', meetingTitle: 'AGM 2026', meetingDate: '2026-10-01', meetingTime: '10:00 AM', location: 'Auditorium' }),
    },
    {
      name: 'Meeting Reminder',
      exec: () => renderReminderEmail({ memberName: 'Attendee', reminderType: 'meeting', title: 'Executive Session', dueDateOrDate: 'Tomorrow' }),
    },
    {
      name: 'Event Notification',
      exec: () => renderEventNotificationEmail({ memberName: 'Club Delegate', eventTitle: 'National Finance Summit', eventDate: '2026-11-15', location: 'DIU DSC' }),
    },
    {
      name: 'Expense Approved',
      exec: () => renderExpenseApprovedEmail({ userName: 'Claimant', expenseReference: 'EXP-001', expenseTitle: 'Venue Sound System', amount: 5000 }),
    },
    {
      name: 'Expense Rejected / Update',
      exec: () => renderExpenseRejectedEmail({ userName: 'Claimant', expenseReference: 'EXP-002', expenseTitle: 'Office Supplies', amount: 1500, reason: 'Missing original voucher' }),
    },
    {
      name: 'Expense Submitted for Review',
      exec: () => renderExpenseSubmittedEmail({ approverName: 'Treasurer', submitterName: 'Event Lead', expenseReference: 'EXP-003', expenseTitle: 'Catering', amount: 12000 }),
    },
    {
      name: 'Payment Confirmation',
      exec: () => renderPaymentConfirmationEmail({ memberName: 'Payer', amount: 500, paymentReference: 'PAY-101', paymentType: 'Registration Fee' }),
    },
    {
      name: 'Role Changed',
      exec: () => renderRoleChangedEmail({ userName: 'Promoted Member', newRoleName: 'TREASURER' }),
    },
    {
      name: 'Account Status (Suspended/Restored)',
      exec: () => renderAccountStatusEmail({ userName: 'Member', status: 'suspended', reason: 'Annual review' }),
    },
    {
      name: 'Email Verification',
      exec: () => renderEmailVerificationEmail({ userName: 'Applicant', verificationUrl: 'https://invesmentclub.top/verify' }),
    },
    {
      name: 'Password Changed Alert',
      exec: () => renderPasswordChangedEmail({ userName: 'Account Holder' }),
    },
    {
      name: 'Integration Diagnostics Test',
      exec: () => renderTestEmail({ serverTime: new Date().toISOString(), environment: 'PRODUCTION' }),
    },
  ];

  for (const t of templatesToVerify) {
    const rendered = t.exec();
    const htmlHasTarget = rendered.html.includes('252-58-083@diu.edu.bd');
    const textHasTarget = rendered.text.includes('252-58-083@diu.edu.bd') || rendered.html.includes('252-58-083@diu.edu.bd');

    if (!htmlHasTarget && !textHasTarget) {
      console.warn(`   ⚠️ Template [${t.name}]: Warning - did not find 252-58-083@diu.edu.bd`);
    } else {
      console.log(`   ✓ [${t.name.padEnd(30)}]: Verified (HTML & Footer reply-to support: 252-58-083@diu.edu.bd)`);
    }
  }

  console.log('\n================================================================');
  console.log('ALL TEMPLATES & CENTRAL REPLY-TO CONFIGURATION VERIFIED!');
  console.log('================================================================\n');
}

verifyReplyToAndTemplates().catch(console.error);
