import * as fs from 'fs';
import * as path from 'path';
import {
  renderMemberWelcomeEmail,
  renderUserWelcomeEmail,
  renderPaymentConfirmationEmail,
  renderExpenseApprovedEmail,
  renderExpenseRejectedEmail,
  renderEventNotificationEmail,
  renderMeetingInvitationEmail,
  renderReminderEmail,
  renderPasswordResetEmail,
  renderExpenseSubmittedEmail,
  renderTaskAssignedEmail,
  renderTestEmail,
  renderAccountInvitationEmail,
  renderEmailVerificationEmail,
  renderPasswordChangedEmail,
  renderRoleChangedEmail,
  renderAccountStatusEmail,
} from '../src/modules/email/email.templates';

const outputDir = 'C:\\Users\\Siami\\.gemini\\antigravity-ide\\brain\\fd585ff2-8d0b-4560-b955-900c3b2761e1\\scratch\\email_previews';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Generating email previews to: ${outputDir}`);

const templates = [
  {
    name: '01_member_welcome',
    rendered: renderMemberWelcomeEmail({
      memberName: 'Tashfiq Ahmed',
      memberId: 'MEM-2026-0042',
      tier: 'Executive Member',
      recipientEmail: 'tashfiq@diu.edu.bd',
    }),
  },
  {
    name: '02_user_welcome',
    rendered: renderUserWelcomeEmail({
      userName: 'Ibna Siam',
      portalUrl: 'https://invesmentclub.top/dashboard',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '03_payment_confirmation',
    rendered: renderPaymentConfirmationEmail({
      memberName: 'Ibna Siam',
      amount: 1500,
      paymentReference: 'TRX-2026-987654',
      paymentMethod: 'bKash Merchant Payment',
      paymentType: 'Annual Executive Dues',
      paymentDate: 'September 12, 2026',
      receiptNumber: 'REC-2026-0042',
      receiptToken: 'sec_tok_9f8e7d6c5b4a3',
      recipientEmail: 'siamibna75@gmail.com',
    }),
  },
  {
    name: '04_expense_approved',
    rendered: renderExpenseApprovedEmail({
      userName: 'Siam Ibna',
      expenseReference: 'EXP-2026-1122',
      expenseTitle: 'National Stock Exchange Workshop Banner & Refreshments',
      amount: 4500,
      approvalDate: 'September 12, 2026',
      approverName: 'Office of the Treasurer',
      notes: 'Approved according to Q3 Club Events budget allocation.',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '05_expense_rejected',
    rendered: renderExpenseRejectedEmail({
      userName: 'Siam Ibna',
      expenseReference: 'EXP-2026-1123',
      expenseTitle: 'Stationery Supplies Claim',
      amount: 1200,
      reason: 'Official tax receipt voucher missing from submission attachments. Please re-upload with official invoice.',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '06_event_notification',
    rendered: renderEventNotificationEmail({
      memberName: 'Ibna Siam',
      eventTitle: 'Capital Markets Summit 2026: Navigating the Dhaka Stock Exchange',
      eventDate: 'October 15, 2026',
      eventTime: '02:00 PM – 05:30 PM (BST)',
      location: 'International Conference Hall, DIU Smart Campus, Ashulia',
      description: 'Join industry veterans and top equity analysts for an in-depth exploration of market valuation models and portfolio management strategies.',
      eventUrl: 'https://invesmentclub.top/events/capital-markets-summit-2026',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '07_meeting_invitation',
    rendered: renderMeetingInvitationEmail({
      memberName: 'Executive Board Member',
      meetingTitle: 'Executive Committee Strategic Planning & Financial Review (Q3)',
      meetingDate: 'September 20, 2026',
      meetingTime: '04:00 PM BST',
      location: 'Meeting Room 402 / Online via Google Meet',
      agendaSummary: 'Review of audited accounts, approval of upcoming Investment Summit budget, and leadership election timeline.',
      meetingUrl: 'https://invesmentclub.top/meetings/q3-strategy',
      recipientEmail: 'board@invesmentclub.top',
    }),
  },
  {
    name: '08_reminder_payment',
    rendered: renderReminderEmail({
      memberName: 'Ibna Siam',
      reminderType: 'payment',
      title: 'Annual Membership Renewal Dues 2026-2027',
      dueDateOrDate: 'September 30, 2026',
      description: 'Your membership renewal window is now open. Prompt renewal ensures continuous access to club portals, stock valuation tooling, and trading workshops.',
      actionUrl: 'https://invesmentclub.top/dues',
      actionLabel: 'Complete Renewal Payment',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '09_password_reset',
    rendered: renderPasswordResetEmail({
      userName: 'Ibna Siam',
      resetUrl: 'https://invesmentclub.top/reset-password?token=sample_secure_reset_token_123',
      expiresInMinutes: 30,
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '10_expense_submitted',
    rendered: renderExpenseSubmittedEmail({
      approverName: 'Treasurer & Financial Controller',
      submitterName: 'Ibna Siam',
      expenseReference: 'EXP-2026-1124',
      expenseTitle: 'Bloomberg Terminal & Financial Research Subscriptions',
      amount: 18500,
      categoryName: 'Club Research Tools',
      submittedDate: 'September 12, 2026',
      recipientEmail: 'treasurer@invesmentclub.top',
    }),
  },
  {
    name: '11_task_assigned',
    rendered: renderTaskAssignedEmail({
      assigneeName: 'Ibna Siam',
      assignedByName: 'President & Executive Committee',
      taskTitle: 'Prepare Audited Q3 Financial Portfolio Presentation',
      dueDate: 'September 25, 2026',
      priority: 'URGENT',
      description: 'Consolidate all verified receipts, payment logs, and bank statement reconciliations for the general assembly presentation.',
      taskId: 'task_2026_q3_audit',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '12_test_verification',
    rendered: renderTestEmail({
      recipientName: 'Ibna Siam (Super Admin)',
      serverTime: new Date().toUTCString(),
      environment: 'PRODUCTION',
      notes: 'Email system rendering verification test. Validating light institutional layout and domain headers.',
      recipientEmail: 'siamibna75@gmail.com',
    }),
  },
  {
    name: '13_account_invitation',
    rendered: renderAccountInvitationEmail({
      userName: 'Dr. Academic Advisor',
      setupUrl: 'https://invesmentclub.top/setup-password?token=faculty_invite_token_456',
      roleName: 'FACULTY_ADVISOR',
      expiresInHours: 48,
      recipientEmail: 'advisor@diu.edu.bd',
    }),
  },
  {
    name: '14_email_verification',
    rendered: renderEmailVerificationEmail({
      userName: 'New Member',
      verificationUrl: 'https://invesmentclub.top/verify-email?token=email_verify_token_789',
      expiresInMinutes: 60,
      recipientEmail: 'newmember@diu.edu.bd',
    }),
  },
  {
    name: '15_password_changed',
    rendered: renderPasswordChangedEmail({
      userName: 'Ibna Siam',
      changedAt: 'September 12, 2026 at 12:15 PM UTC',
      ipAddress: '103.145.230.12 (Dhaka, Bangladesh)',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '16_role_changed',
    rendered: renderRoleChangedEmail({
      userName: 'Ibna Siam',
      newRoleName: 'SUPER_ADMIN',
      changedBy: 'Executive Board Resolution',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
  {
    name: '17_account_status_suspended',
    rendered: renderAccountStatusEmail({
      userName: 'Suspended Account',
      status: 'suspended',
      reason: 'Academic status verification pending with Daffodil International University Registrar Office.',
      recipientEmail: 'student@diu.edu.bd',
    }),
  },
  {
    name: '18_account_status_restored',
    rendered: renderAccountStatusEmail({
      userName: 'Ibna Siam',
      status: 'active',
      recipientEmail: 'siam@diu.edu.bd',
    }),
  },
];

for (const t of templates) {
  const htmlPath = path.join(outputDir, `${t.name}.html`);
  const textPath = path.join(outputDir, `${t.name}.txt`);
  fs.writeFileSync(htmlPath, t.rendered.html, 'utf-8');
  fs.writeFileSync(textPath, t.rendered.text, 'utf-8');
  console.log(`✅ [Preview Generated] ${t.name} -> Subject: "${t.rendered.subject}"`);
}

console.log('\nAll 18 email previews generated successfully without sending any emails.');
