/**
 * DIU Investment Club - Professional Transactional Email Templates
 *
 * All templates adhere strictly to:
 * - Brand Name: "DIU Investment Club"
 * - Mobile responsive layout
 * - Sanitized dynamic inputs (HTML injection proof)
 * - Complete Plain-Text fallback
 * - Standardized subject lines
 */

import { EMAIL_BRAND } from './email.brand';
import { DEFAULT_FROM_EMAIL } from './email.config';
import { escapeHtml } from './email.security';
import {
  renderBaseLayout,
  renderGreeting,
  renderParagraph,
  renderInfoCard,
  renderFinancialCard,
  renderAlertBox,
  renderDivider,
  renderSecondaryLink,
} from './email.components';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * 1A. Member Welcome Email (Strictly for Member Directory Registrations)
 * - Welcome message only
 * - NEVER includes: Access Your Account button, login URL, activation link, invitation token, or password setup
 */
export interface MemberWelcomeEmailParams {
  userName: string;
  recipientEmail?: string;
  department?: string | null;
  batch?: string | null;
  memberCode?: string | null;
}

export function renderMemberWelcomeEmail(params: MemberWelcomeEmailParams): RenderedEmail {
  const subject = `Welcome to ${EMAIL_BRAND.name}`;

  const membershipDetailsItems = [];
  if (params.memberCode) {
    membershipDetailsItems.push({ label: 'Member ID', value: params.memberCode, highlight: true });
  }
  if (params.department) {
    membershipDetailsItems.push({ label: 'Department', value: params.department });
  }
  if (params.batch) {
    membershipDetailsItems.push({ label: 'Batch', value: params.batch });
  }
  membershipDetailsItems.push({ label: 'Affiliation', value: EMAIL_BRAND.university });

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(`We are delighted to officially welcome you to <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>!`)}
    ${renderParagraph(
      "Your registration in the club's official Member Directory is complete. As a member of our student-led investment and financial community, you are part of a vibrant ecosystem dedicated to capital markets research, financial literacy, portfolio management workshops, and collaborative leadership."
    )}
    ${
      membershipDetailsItems.length > 0
        ? renderInfoCard({
            title: 'Membership Registration Details',
            items: membershipDetailsItems,
          })
        : ''
    }
    ${renderParagraph(
      'Stay engaged with our upcoming general meetings, hands-on investment sessions, and club networking events announced through our official communications.'
    )}
    ${renderAlertBox(
      `If you have any questions regarding your club membership, please contact the club administration at ${EMAIL_BRAND.supportEmail}.`,
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Warm regards,<br />
      <strong style="color: #ffffff;">Executive Committee • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  // Explicitly NO actionButton and NO account access or login links
  const html = renderBaseLayout({
    title: subject,
    preheader: `Welcome to ${EMAIL_BRAND.name}! Your membership registration is confirmed.`,
    content,
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const detailsText = [
    params.memberCode ? `- Member ID: ${params.memberCode}` : null,
    params.department ? `- Department: ${params.department}` : null,
    params.batch ? `- Batch: ${params.batch}` : null,
    `- Affiliation: ${EMAIL_BRAND.university}`,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `
Welcome to ${EMAIL_BRAND.name}

Hello ${params.userName},

We are delighted to officially welcome you to ${EMAIL_BRAND.name}!

Your registration in the club's official Member Directory is complete. As a member of our student-led investment and financial community, you are part of a vibrant ecosystem dedicated to capital markets research, financial literacy, portfolio management workshops, and collaborative leadership.

MEMBERSHIP DETAILS:
${detailsText}

Stay engaged with our upcoming general meetings, hands-on investment sessions, and club networking events announced through our official communications.

If you have any questions regarding your club membership, please contact the club administration at ${EMAIL_BRAND.supportEmail}.

Warm regards,
Executive Committee • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 1B. System User Welcome Email (Strictly for User Account Management)
 * - Professional welcome message for administrative system users
 * - Informs the user that a separate Account Activation / Invitation email has been sent
 * - Does NOT contain the Access Your Account button (the button is strictly in ACCOUNT_INVITATION)
 */
export interface UserWelcomeEmailParams {
  userName: string;
  recipientEmail?: string;
}

export function renderUserWelcomeEmail(params: UserWelcomeEmailParams): RenderedEmail {
  const subject = `Welcome to the ${EMAIL_BRAND.name} Portal`;

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
      `Your administrative user profile has been successfully created in the <strong>${escapeHtml(EMAIL_BRAND.name)} ERP & Financial Management System</strong>.`
    )}
    ${renderParagraph(
      'As an authorized system user, you will have access to club operations, financial records, reporting tools, and member management according to your assigned privileges.'
    )}
    ${renderAlertBox(
      'A separate Account Activation email containing your secure authorization token has been sent. Please refer to that email to establish your password and access your account.',
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">System Administration • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  // Explicitly NO actionButton - Access button is strictly in ACCOUNT_INVITATION
  const html = renderBaseLayout({
    title: subject,
    preheader: `Welcome to ${EMAIL_BRAND.name} ERP System. Your user profile is ready.`,
    content,
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Welcome to the ${EMAIL_BRAND.name} Portal

Hello ${params.userName},

Your administrative user profile has been successfully created in the ${EMAIL_BRAND.name} ERP & Financial Management System.

As an authorized system user, you will have access to club operations, financial records, reporting tools, and member management according to your assigned privileges.

A separate Account Activation email containing your secure authorization token has been sent. Please refer to that email to establish your password and access your account.

If this profile was created unexpectedly, please contact system administration at ${EMAIL_BRAND.supportEmail}.

Regards,
System Administration • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * Legacy alias for backwards compatibility
 */
export function renderWelcomeEmail(params: {
  userName: string;
  loginUrl?: string;
  recipientEmail?: string;
}): RenderedEmail {
  return renderUserWelcomeEmail({ userName: params.userName, recipientEmail: params.recipientEmail });
}

/**
 * 2. Payment Confirmation Email (Section 7)
 */
export function renderPaymentConfirmationEmail(params: {
  memberName: string;
  amount: number;
  paymentDate?: string;
  paymentReference: string;
  paymentType?: string;
  receiptNumber?: string;
  receiptToken?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Payment Confirmation ${EMAIL_BRAND.subjectSuffix}`;
  const date = params.paymentDate || new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
  const receiptUrl = params.receiptToken
    ? `https://invesmentclub.top/receipt/${params.receiptToken}`
    : `${EMAIL_BRAND.portalUrl}/receipts`;

  const content = `
    ${renderGreeting(params.memberName)}
    ${renderParagraph(
    `Thank you for your payment to <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>. Your transaction has been confirmed and recorded in the official club records.`
  )}
    ${renderFinancialCard({
    title: 'Payment Received',
    amount: params.amount,
    currency: 'BDT (৳)',
    statusText: 'CONFIRMED',
    statusVariant: 'success',
    items: [
      { label: 'Payment Reference', value: params.paymentReference, highlight: true },
      { label: 'Payment Type', value: params.paymentType || 'Membership / Club Dues' },
      { label: 'Date Confirmed', value: date },
      ...(params.receiptNumber ? [{ label: 'Official Receipt #', value: params.receiptNumber }] : []),
    ],
  })}
    ${renderParagraph(
    'A formal public digital receipt has been generated and archived for your official club records. Click the button below to view or print your digital receipt anytime without requiring a dashboard login.'
  )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Office of the Treasurer • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Payment confirmation of ৳ ${params.amount} BDT for ${EMAIL_BRAND.name}.`,
    content,
    actionButton: {
      label: 'View Digital Receipt',
      url: receiptUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Payment Confirmation | ${EMAIL_BRAND.name}

Hello ${params.memberName},

Thank you for your payment to ${EMAIL_BRAND.name}. Your transaction has been confirmed.

PAYMENT DETAILS:
- Amount: ৳ ${params.amount.toLocaleString()} BDT
- Status: CONFIRMED
- Reference: ${params.paymentReference}
- Type: ${params.paymentType || 'Membership / Club Dues'}
- Date: ${date}
${params.receiptNumber ? `- Receipt: ${params.receiptNumber}\n` : ''}
View Digital Receipt: ${receiptUrl}

Regards,
Office of the Treasurer
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 3A. Expense Approved Email (Section 8)
 */
export function renderExpenseApprovedEmail(params: {
  userName: string;
  expenseReference: string;
  expenseTitle: string;
  amount: number;
  approvalDate?: string;
  approverName?: string;
  notes?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Expense Approved ${EMAIL_BRAND.subjectSuffix}`;
  const date = params.approvalDate || new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
    `Your expense reimbursement claim for <strong>"${escapeHtml(params.expenseTitle)}"</strong> has been reviewed and officially <strong>APPROVED</strong>.`
  )}
    ${renderFinancialCard({
    title: 'Approved Reimbursement',
    amount: params.amount,
    currency: 'BDT (৳)',
    statusText: 'APPROVED',
    statusVariant: 'success',
    items: [
      { label: 'Expense Title', value: params.expenseTitle },
      { label: 'Claim Reference', value: params.expenseReference, highlight: true },
      { label: 'Approved Date', value: date },
      ...(params.approverName ? [{ label: 'Approved By', value: params.approverName }] : []),
    ],
  })}
    ${params.notes ? renderAlertBox(`Approval Note: ${params.notes}`, 'success') : ''}
    ${renderParagraph(
    '<strong>Next Steps:</strong> The Office of the Treasurer will process and schedule the fund disbursement to your registered payout account.'
  )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Executive Board • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Your expense claim for ৳ ${params.amount} BDT has been approved.`,
    content,
    actionButton: {
      label: 'View Expense Record',
      url: `${EMAIL_BRAND.portalUrl}/expenses`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Expense Approved | ${EMAIL_BRAND.name}

Hello ${params.userName},

Your expense reimbursement claim "${params.expenseTitle}" has been officially APPROVED.

DETAILS:
- Reference: ${params.expenseReference}
- Amount: ৳ ${params.amount.toLocaleString()} BDT
- Status: APPROVED
- Date: ${date}
${params.approverName ? `- Approved By: ${params.approverName}\n` : ''}
${params.notes ? `Note: ${params.notes}\n` : ''}
Next Steps: The Treasurer will process the fund disbursement.

Regards,
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 3B. Expense Rejected / Update Required Email (Section 8)
 */
export function renderExpenseRejectedEmail(params: {
  userName: string;
  expenseReference: string;
  expenseTitle: string;
  amount: number;
  reason: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Expense Update Required ${EMAIL_BRAND.subjectSuffix}`;

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
    `We have reviewed your expense claim for <strong>"${escapeHtml(params.expenseTitle)}"</strong> (Reference: <code>${escapeHtml(params.expenseReference)}</code>) for <strong>৳ ${params.amount.toLocaleString()} BDT</strong>.`
  )}
    ${renderAlertBox(
    `Decision Notice: ${params.reason}`,
    'warning'
  )}
    ${renderParagraph(
    '<strong>Next Steps:</strong> Please review the reviewer feedback above. If supporting documentation (e.g. valid voucher or receipt image) was missing or requires clarification, you may resubmit your claim through the portal.'
  )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Audit & Financial Review Team • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Update required for your expense claim: "${params.expenseTitle}".`,
    content,
    actionButton: {
      label: 'Review Claim Details',
      url: `${EMAIL_BRAND.portalUrl}/expenses`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Expense Update Required | ${EMAIL_BRAND.name}

Hello ${params.userName},

We have reviewed your expense claim for "${params.expenseTitle}" (Reference: ${params.expenseReference}) for ৳ ${params.amount} BDT.

DECISION NOTICE:
${params.reason}

Next Steps: Please review your claim details and submit updated vouchers or documentation if applicable.
URL: ${EMAIL_BRAND.portalUrl}/expenses

Regards,
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 4. Event Notification Email (Section 9)
 */
export function renderEventNotificationEmail(params: {
  memberName: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  location: string;
  description?: string;
  eventUrl?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Event Invitation ${EMAIL_BRAND.subjectSuffix}`;
  const eventUrl = params.eventUrl || `${EMAIL_BRAND.portalUrl}/events`;

  const content = `
    ${renderGreeting(params.memberName)}
    ${renderParagraph(
    `You are invited to participate in an upcoming event organized by <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>.`
  )}
    <h3 style="font-size: 18px; color: #ffffff; margin: 16px 0 12px 0; letter-spacing: -0.01em;">
      ${escapeHtml(params.eventTitle)}
    </h3>
    ${renderInfoCard({
    items: [
      { label: 'Event Date', value: params.eventDate, highlight: true },
      ...(params.eventTime ? [{ label: 'Time', value: params.eventTime }] : []),
      { label: 'Venue / Location', value: params.location },
    ],
  })}
    ${params.description ? renderParagraph(escapeHtml(params.description)) : ''}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Events Committee • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Upcoming Club Event: ${params.eventTitle} on ${params.eventDate}.`,
    content,
    actionButton: {
      label: 'View Event Details',
      url: eventUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: true,
  });

  const text = `
Event Invitation | ${EMAIL_BRAND.name}

Hello ${params.memberName},

You are invited to an upcoming event organized by ${EMAIL_BRAND.name}:
${params.eventTitle}

DETAILS:
- Date: ${params.eventDate}
${params.eventTime ? `- Time: ${params.eventTime}\n` : ''}
- Venue: ${params.location}

${params.description ? `${params.description}\n\n` : ''}
View Event: ${eventUrl}

Regards,
Events Committee
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 5. Meeting Invitation Email (Section 10)
 */
export function renderMeetingInvitationEmail(params: {
  memberName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  location: string;
  agendaSummary?: string;
  meetingUrl?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Meeting Invitation ${EMAIL_BRAND.subjectSuffix}`;
  const meetingUrl = params.meetingUrl || `${EMAIL_BRAND.portalUrl}/meetings`;

  const content = `
    ${renderGreeting(params.memberName)}
    ${renderParagraph(
    `You are formally notified of an upcoming meeting convened by <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>.`
  )}
    <h3 style="font-size: 18px; color: #ffffff; margin: 16px 0 12px 0;">
      ${escapeHtml(params.meetingTitle)}
    </h3>
    ${renderInfoCard({
    items: [
      { label: 'Date', value: params.meetingDate, highlight: true },
      { label: 'Scheduled Time', value: params.meetingTime },
      { label: 'Location / Link', value: params.location },
    ],
  })}
    ${params.agendaSummary ? renderAlertBox(`Agenda Summary: ${params.agendaSummary}`, 'info') : ''}
    ${renderParagraph('Please ensure timely attendance or notify the General Secretary in advance of any conflict.')}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Executive Committee • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Meeting Invitation: ${params.meetingTitle} on ${params.meetingDate}.`,
    content,
    actionButton: {
      label: 'View Meeting Details',
      url: meetingUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: true,
  });

  const text = `
Meeting Invitation | ${EMAIL_BRAND.name}

Hello ${params.memberName},

You are formally invited to a meeting convened by ${EMAIL_BRAND.name}:
${params.meetingTitle}

DETAILS:
- Date: ${params.meetingDate}
- Time: ${params.meetingTime}
- Location: ${params.location}
${params.agendaSummary ? `\nAgenda: ${params.agendaSummary}\n` : ''}
View Details: ${meetingUrl}

Regards,
Executive Committee
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 6. Reminder Email (Section 11)
 * Dynamically adapts to: payment, due, meeting, event, or task
 */
export function renderReminderEmail(params: {
  memberName: string;
  reminderType: 'payment' | 'due' | 'meeting' | 'event' | 'task';
  title: string;
  dueDateOrDate: string;
  description?: string;
  actionUrl?: string;
  actionLabel?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Reminder ${EMAIL_BRAND.subjectSuffix}`;
  const defaultUrl = `${EMAIL_BRAND.portalUrl}/dashboard`;
  const actionUrl = params.actionUrl || defaultUrl;
  const actionLabel = params.actionLabel || 'View in Portal';

  let typeBadgeLabel = 'General Reminder';
  let badgeVariant: 'warning' | 'info' | 'danger' = 'info';

  if (params.reminderType === 'payment' || params.reminderType === 'due') {
    typeBadgeLabel = 'Payment Due';
    badgeVariant = 'warning';
  } else if (params.reminderType === 'meeting') {
    typeBadgeLabel = 'Meeting Reminder';
    badgeVariant = 'info';
  } else if (params.reminderType === 'event') {
    typeBadgeLabel = 'Event Reminder';
    badgeVariant = 'info';
  } else if (params.reminderType === 'task') {
    typeBadgeLabel = 'Task Due';
    badgeVariant = 'warning';
  }

  const content = `
    ${renderGreeting(params.memberName)}
    ${renderParagraph(
    `This is a friendly reminder from <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> regarding an upcoming deadline or schedule.`
  )}
    ${renderInfoCard({
    title: typeBadgeLabel,
    items: [
      { label: 'Subject', value: params.title, highlight: true },
      { label: 'Date / Due Date', value: params.dueDateOrDate },
    ],
  })}
    ${params.description ? renderAlertBox(params.description, badgeVariant) : ''}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Reminder: ${params.title} - ${EMAIL_BRAND.name}.`,
    content,
    actionButton: {
      label: actionLabel,
      url: actionUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: true,
  });

  const text = `
Reminder | ${EMAIL_BRAND.name}

Hello ${params.memberName},

This is a reminder from ${EMAIL_BRAND.name}:
- Subject: ${params.title}
- Date / Due Date: ${params.dueDateOrDate}
${params.description ? `\nDetails: ${params.description}\n` : ''}
Action: ${actionUrl}

Regards,
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 7. Password Reset Email (Section 12)
 */
export function renderPasswordResetEmail(params: {
  userName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Reset Your Password ${EMAIL_BRAND.subjectSuffix}`;
  const minutes = params.expiresInMinutes || 30;

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
    `We received a request to reset your password for your <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> account.`
  )}
    ${renderParagraph(
    'Click the button below to establish a new password. This link is time-sensitive for your security.'
  )}
    ${renderAlertBox(
    `This secure link will expire in ${minutes} minutes. If you did not initiate this request, no action is required and your account remains safe.`,
    'warning'
  )}
    ${renderDivider()}
    <p style="margin: 0; font-size: 12px; color: ${EMAIL_BRAND.colors.textMuted};">
      Security Notice: Never share this link or your credentials with anyone. ${escapeHtml(EMAIL_BRAND.name)} will never ask for your password.
    </p>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Reset your password for ${EMAIL_BRAND.name}.`,
    content,
    actionButton: {
      label: 'Reset Password',
      url: params.resetUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Reset Your Password | ${EMAIL_BRAND.name}

Hello ${params.userName},

We received a request to reset your password for your ${EMAIL_BRAND.name} account.

Reset your password here:
${params.resetUrl}

This link will expire in ${minutes} minutes. If you did not request this, please ignore this email.

Security Notice: Never share your credentials.
${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 7B. Expense Submitted for Review Notification Email (Section 4)
 */
export function renderExpenseSubmittedEmail(params: {
  approverName: string;
  submitterName: string;
  expenseReference: string;
  expenseTitle: string;
  amount: number;
  categoryName?: string;
  submittedDate?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Expense Submitted for Review ${EMAIL_BRAND.subjectSuffix}`;
  const date = params.submittedDate || new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

  const content = `
    ${renderGreeting(params.approverName)}
    ${renderParagraph(
      `A new expense reimbursement claim has been submitted by <strong>${escapeHtml(params.submitterName)}</strong> and requires your authorized financial review.`
    )}
    ${renderFinancialCard({
      title: 'Submitted Expense Details',
      amount: params.amount,
      currency: 'BDT (৳)',
      statusText: 'PENDING APPROVAL',
      statusVariant: 'warning',
      items: [
        { label: 'Expense Title', value: params.expenseTitle },
        { label: 'Claim Reference', value: params.expenseReference, highlight: true },
        { label: 'Submitted By', value: params.submitterName },
        { label: 'Submission Date', value: date },
        ...(params.categoryName ? [{ label: 'Category', value: params.categoryName }] : []),
      ],
    })}
    ${renderAlertBox(
      'Please review this expense according to DIU Investment Club financial policies and the Four-Eyes Principle.',
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Financial Control • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `New expense claim for ৳ ${params.amount} BDT submitted by ${params.submitterName}.`,
    content,
    actionButton: {
      label: 'Review Approval Queue',
      url: `${EMAIL_BRAND.portalUrl}/approvals`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Expense Submitted for Review | ${EMAIL_BRAND.name}

Hello ${params.approverName},

A new expense claim has been submitted by ${params.submitterName} and requires your authorized review.

DETAILS:
- Reference: ${params.expenseReference}
- Title: ${params.expenseTitle}
- Submitter: ${params.submitterName}
- Amount: ৳ ${params.amount.toLocaleString()} BDT
- Status: PENDING APPROVAL
- Date: ${date}
${params.categoryName ? `- Category: ${params.categoryName}\n` : ''}

Please review this in the approvals queue: ${EMAIL_BRAND.portalUrl}/approvals

Regards,
Financial Control • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 7C. Task Assigned Notification Email (Section 9)
 */
export function renderTaskAssignedEmail(params: {
  assigneeName: string;
  assignedByName?: string;
  taskTitle: string;
  dueDate?: string;
  priority?: string;
  description?: string;
  taskId: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Task Assigned: ${params.taskTitle} ${EMAIL_BRAND.subjectSuffix}`;
  const priority = (params.priority || 'NORMAL').toUpperCase();

  const content = `
    ${renderGreeting(params.assigneeName)}
    ${renderParagraph(
      `You have been assigned a new task by <strong>${escapeHtml(params.assignedByName || 'Club Administration')}</strong>.`
    )}
    ${renderInfoCard({
      title: 'Task Assignment Details',
      items: [
        { label: 'Task Title', value: params.taskTitle, highlight: true },
        { label: 'Assigned By', value: params.assignedByName || 'Administration' },
        { label: 'Priority', value: priority },
        ...(params.dueDate ? [{ label: 'Due Date', value: params.dueDate }] : []),
        ...(params.description ? [{ label: 'Description', value: params.description }] : []),
      ],
    })}
    ${priority === 'URGENT' ? renderAlertBox('This task is marked with URGENT priority. Please review immediately.', 'warning') : ''}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Operations • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `New task assigned: ${params.taskTitle}`,
    content,
    actionButton: {
      label: 'View Assigned Task',
      url: `${EMAIL_BRAND.portalUrl}/tasks`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: true,
  });

  const text = `
Task Assigned | ${EMAIL_BRAND.name}

Hello ${params.assigneeName},

You have been assigned a new task by ${params.assignedByName || 'Club Administration'}.

DETAILS:
- Task: ${params.taskTitle}
- Assigned By: ${params.assignedByName || 'Administration'}
- Priority: ${priority}
${params.dueDate ? `- Due Date: ${params.dueDate}\n` : ''}
${params.description ? `- Description: ${params.description}\n` : ''}

View Task: ${EMAIL_BRAND.portalUrl}/tasks

Regards,
Operations • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 8. Integration / Diagnostics Test Email
 */
export function renderTestEmail(params: {
  recipientName?: string;
  serverTime: string;
  environment: string;
  notes?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `DIU Investment Club – Email System Test`;
  const name = params.recipientName || 'Super Admin';

  const content = `
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #10b981; letter-spacing: 0.1em; text-transform: uppercase;">
        ⚡ [SYSTEM TEST EMAIL] — NO ACTION REQUIRED
      </span>
    </div>

    ${renderGreeting(name)}
    ${renderParagraph(
      `This message confirms that the <strong>DIU Investment Club Email System</strong> is fully operational and actively transmitting via the <strong>Resend</strong> provider using verified custom domain <strong style="color: #10b981;">invesmentclub.top</strong>.`
    )}

    ${renderInfoCard({
      title: 'Email Diagnostics & Delivery Telemetry',
      items: [
        { label: 'System Status', value: 'OPERATIONAL (SUCCESS)', highlight: true },
        { label: 'Delivery Provider', value: 'Resend API (Official SDK)' },
        { label: 'Official Sender', value: DEFAULT_FROM_EMAIL },
        { label: 'Verified Domain', value: 'invesmentclub.top' },
        { label: 'Target Recipient', value: params.recipientEmail || 'siamibna75@gmail.com' },
        { label: 'Environment Mode', value: params.environment.toUpperCase() },
        { label: 'Server Timestamp', value: params.serverTime },
      ],
    })}

    ${params.notes ? renderAlertBox(params.notes, 'info') : ''}

    <div style="margin-top: 24px; padding: 16px; background: rgba(255, 255, 255, 0.02); border-left: 3px solid #10b981; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: ${EMAIL_BRAND.colors.textSecondary}; line-height: 1.5;">
        <strong>System Verification Note:</strong> All core email infrastructure (branded templates, SPF/DKIM authentication on <code style="color: #10b981;">invesmentclub.top</code>, and Resend delivery credentials) is active and verified. Live production automation workflows remain safe and isolated from test runs.
      </p>
    </div>

    <div style="margin-top: 24px; font-size: 13px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Verified by:<br />
      <strong style="color: #ffffff;">${escapeHtml(EMAIL_BRAND.name)} Technical Administration</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `DIU Investment Club Email System Test - All delivery pipelines operational.`,
    content,
    actionButton: {
      label: 'Open Club Portal',
      url: EMAIL_BRAND.portalUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
DIU Investment Club – Email System Test
--------------------------------------------------
[SYSTEM TEST EMAIL — NO ACTION REQUIRED]

Hello ${name},

This message confirms that the DIU Investment Club Email System is fully operational and actively transmitting via Resend using verified custom domain invesmentclub.top.

DIAGNOSTICS TELEMETRY:
- System Status: OPERATIONAL (SUCCESS)
- Delivery Provider: Resend API
- Official Sender: ${DEFAULT_FROM_EMAIL}
- Verified Domain: invesmentclub.top
- Target Recipient: ${params.recipientEmail || 'siamibna75@gmail.com'}
- Environment Mode: ${params.environment}
- Server Timestamp: ${params.serverTime}
${params.notes ? `- Notes: ${params.notes}\n` : ''}

All core email capabilities, domain authentication, and transactional pipelines are verified.

Portal: ${EMAIL_BRAND.portalUrl}

DIU Investment Club
  `.trim();

  return { subject, html, text };
}

/**
 * 9. New User Account Invitation Email (Phase 6 - Section 3)
 */
export function renderAccountInvitationEmail(params: {
  userName: string;
  setupUrl: string;
  roleName?: string;
  expiresInHours?: number;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Your ${EMAIL_BRAND.name} Account Is Ready`;
  const hours = params.expiresInHours || 48;
  const roleDisplay = params.roleName ? params.roleName.replace(/_/g, ' ') : 'Member';

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
      `An authorized account has been provisioned for you at <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>.`
    )}
    ${renderInfoCard({
      title: 'Account Provisioning Details',
      items: [
        { label: 'Assigned Role', value: roleDisplay, highlight: true },
        { label: 'Registered Email', value: params.recipientEmail || 'Registered Address' },
        { label: 'Affiliation', value: EMAIL_BRAND.university },
        { label: 'Setup Window', value: `${hours} hours` },
      ],
    })}
    ${renderParagraph(
      'To access club operations, financial services, and member portals, please establish your confidential password by clicking the button below.'
    )}
    ${renderAlertBox(
      `For your security, this invitation link will expire in ${hours} hours. Please complete your account activation promptly.`,
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Administration • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Your account is ready. Complete your setup for ${EMAIL_BRAND.name}.`,
    content,
    actionButton: {
      label: 'Set Your Password',
      url: params.setupUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Your ${EMAIL_BRAND.name} Account Is Ready

Hello ${params.userName},

An authorized account has been provisioned for you at ${EMAIL_BRAND.name}.

DETAILS:
- Assigned Role: ${roleDisplay}
- Registered Email: ${params.recipientEmail || ''}
- Affiliation: ${EMAIL_BRAND.university}

Please establish your confidential password and access your account using this secure link:
Set Your Password: ${params.setupUrl}

This link expires in ${hours} hours.

Regards,
Administration • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 10. Email Verification Email (Phase 6 - Section 4)
 */
export function renderEmailVerificationEmail(params: {
  userName: string;
  verificationUrl: string;
  expiresInMinutes?: number;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Verify Your Email | ${EMAIL_BRAND.name}`;
  const minutes = params.expiresInMinutes || 60;

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
      `Please verify your email address to complete your registration with <strong>${escapeHtml(EMAIL_BRAND.name)}</strong>.`
    )}
    ${renderParagraph(
      'Verifying your email confirms ownership and ensures you receive official club announcements, financial receipts, and critical security notices.'
    )}
    ${renderAlertBox(
      `This verification link will expire in ${minutes} minutes. If you did not create an account with ${escapeHtml(EMAIL_BRAND.name)}, please disregard this message.`,
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Member Services • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Verify your email address for ${EMAIL_BRAND.name}.`,
    content,
    actionButton: {
      label: 'Verify Email Address',
      url: params.verificationUrl,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Verify Your Email | ${EMAIL_BRAND.name}

Hello ${params.userName},

Please verify your email address to complete your registration with ${EMAIL_BRAND.name}:
${params.verificationUrl}

This link expires in ${minutes} minutes. If you did not create this account, please ignore this email.

Regards,
Member Services • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 11. Password Change Security Alert (Phase 6 - Section 7)
 */
export function renderPasswordChangedEmail(params: {
  userName: string;
  changedAt?: string;
  ipAddress?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Your Password Was Changed | ${EMAIL_BRAND.name}`;
  const dateStr = params.changedAt || new Date().toUTCString();

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
      `This is an important security notice regarding your <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> account.`
    )}
    ${renderInfoCard({
      title: 'Security Event Details',
      items: [
        { label: 'Event', value: 'Password Successfully Updated', highlight: true },
        { label: 'Timestamp', value: dateStr },
        ...(params.ipAddress ? [{ label: 'Source IP', value: params.ipAddress }] : []),
      ],
    })}
    ${renderAlertBox(
      `<strong>Security Warning:</strong> If you did not make this change, contact the system administrator immediately at ${escapeHtml(EMAIL_BRAND.supportEmail)} to lock your account and prevent unauthorized access.`,
      'danger'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Security Office • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Security Alert: Your password for ${EMAIL_BRAND.name} was changed.`,
    content,
    actionButton: {
      label: 'Review Account Security',
      url: `${EMAIL_BRAND.portalUrl}/settings`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Your Password Was Changed | ${EMAIL_BRAND.name}

Hello ${params.userName},

This is an important security notice. The password for your ${EMAIL_BRAND.name} account was changed on ${dateStr}.

If you did not make this change, contact the system administrator immediately at ${EMAIL_BRAND.supportEmail}.

Review Account: ${EMAIL_BRAND.portalUrl}/settings

Regards,
Security Office • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 12. Role Change Security Notification (Phase 6 - Section 9)
 */
export function renderRoleChangedEmail(params: {
  userName: string;
  newRoleName: string;
  changedBy?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const subject = `Access Permissions Updated | ${EMAIL_BRAND.name}`;
  const formattedRole = params.newRoleName.replace(/_/g, ' ');

  const content = `
    ${renderGreeting(params.userName)}
    ${renderParagraph(
      `Your system access permissions and assigned role within <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> have been updated.`
    )}
    ${renderInfoCard({
      title: 'Updated Authorization Profile',
      items: [
        { label: 'New Assigned Role', value: formattedRole, highlight: true },
        ...(params.changedBy ? [{ label: 'Authorized By', value: params.changedBy }] : []),
        { label: 'Effective Date', value: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }) },
      ],
    })}
    ${renderParagraph(
      'Your next login or page refresh will automatically reflect these updated permissions. If you have any active sessions, please log out and log back in to refresh your access tokens.'
    )}
    ${renderAlertBox(
      'If you have questions about this role update, please reach out to your club administrator or executive supervisor.',
      'info'
    )}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Governance • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: `Your system access permissions in ${EMAIL_BRAND.name} have been updated.`,
    content,
    actionButton: {
      label: 'Open Dashboard',
      url: `${EMAIL_BRAND.portalUrl}/dashboard`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
Access Permissions Updated | ${EMAIL_BRAND.name}

Hello ${params.userName},

Your system access permissions and assigned role within ${EMAIL_BRAND.name} have been updated.

New Role: ${formattedRole}
${params.changedBy ? `Authorized By: ${params.changedBy}\n` : ''}

Please log out and log back in to refresh your active session tokens.

Regards,
Governance • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}

/**
 * 13. Account Disabled / Restored Security Notification (Phase 6 - Section 10)
 */
export function renderAccountStatusEmail(params: {
  userName: string;
  status: 'active' | 'suspended' | 'inactive';
  reason?: string;
  recipientEmail?: string;
}): RenderedEmail {
  const isSuspended = params.status === 'suspended' || params.status === 'inactive';
  const subject = isSuspended
    ? `Account Access Suspended | ${EMAIL_BRAND.name}`
    : `Your Account Access Has Been Restored | ${EMAIL_BRAND.name}`;

  const content = `
    ${renderGreeting(params.userName)}
    ${isSuspended ? `
      ${renderParagraph(
        `Access to your <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> account has been suspended by club administration.`
      )}
      ${params.reason ? renderAlertBox(`Reason: ${escapeHtml(params.reason)}`, 'danger') : ''}
      ${renderParagraph(
        `All active sessions have been invalidated. If you believe this action was taken in error or wish to appeal, please contact the administration at <strong>${escapeHtml(EMAIL_BRAND.supportEmail)}</strong>.`
      )}
    ` : `
      ${renderParagraph(
        `We are pleased to inform you that your account access for <strong>${escapeHtml(EMAIL_BRAND.name)}</strong> has been officially restored.`
      )}
      ${renderAlertBox('You can now log in and resume using all authorized club services.', 'success')}
    `}
    <div style="margin-top: 24px; font-size: 14px; color: ${EMAIL_BRAND.colors.textSecondary};">
      Regards,<br />
      <strong style="color: #ffffff;">Administration • ${escapeHtml(EMAIL_BRAND.name)}</strong>
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader: isSuspended ? `Your account access in ${EMAIL_BRAND.name} has been suspended.` : `Your account access in ${EMAIL_BRAND.name} has been restored.`,
    content,
    actionButton: {
      label: isSuspended ? 'Contact Administration' : 'Log In to Account',
      url: isSuspended ? `mailto:${EMAIL_BRAND.supportEmail}` : `${EMAIL_BRAND.portalUrl}/login`,
    },
    recipientEmail: params.recipientEmail,
    showUnsubscribe: false,
  });

  const text = `
${subject}

Hello ${params.userName},

${isSuspended
  ? `Access to your ${EMAIL_BRAND.name} account has been suspended.\n${params.reason ? `Reason: ${params.reason}\n` : ''}Please contact ${EMAIL_BRAND.supportEmail} for assistance.`
  : `Your account access for ${EMAIL_BRAND.name} has been restored. You may now log in.`}

Regards,
Administration • ${EMAIL_BRAND.name}
  `.trim();

  return { subject, html, text };
}
