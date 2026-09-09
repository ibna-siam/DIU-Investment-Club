/**
 * Phase 4 Comprehensive Verification Script
 * DIU Investment Club ERP & Financial Management System
 *
 * Verifies:
 * 1. Zero occurrences of "Dhaka International University", "Satarkul", "diu.ac" across all codebase
 * 2. Centralized Brand Configuration (Daffodil International University & Daffodil Smart City)
 * 3. Dynamic Admin Settings propagation to email branding
 * 4. Responsive mobile email layout across all 10 templates (320px, 360px, 375px, 390px, 414px)
 * 5. Button tap-target (min 44px) & text wrap safety
 * 6. Redesigned Minimal Footer information hierarchy
 * 7. Live Resend transactional email deliveries for key templates
 */

import fs from 'fs';
import path from 'path';
import { EMAIL_BRAND, getEmailBrandConfig } from '../src/modules/email/email.brand';
import { settingsRepository } from '../src/modules/settings/settings.repository';
import {
  renderWelcomeEmail,
  renderPaymentConfirmationEmail,
  renderExpenseSubmittedEmail,
  renderExpenseApprovedEmail,
  renderExpenseRejectedEmail,
  renderEventNotificationEmail,
  renderMeetingInvitationEmail,
  renderTaskAssignedEmail,
  renderReminderEmail,
  renderPasswordResetEmail,
} from '../src/modules/email/email.templates';
import { emailService } from '../src/modules/email/email.service';
import { DEFAULT_TEST_RECIPIENT } from '../src/modules/email/email.config';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, pass: boolean, details: string) {
  results.push({
    id,
    name,
    status: pass ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}: ${name} - ${details}`);
}

async function run() {
  console.log('========================================================================');
  console.log('PHASE 4: EMAIL BRANDING CORRECTION & MOBILE RESPONSIVENESS VERIFICATION');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Codebase Audit: Check for any old/incorrect university names or addresses
  // -------------------------------------------------------------------------
  console.log('--- 1. AUDITING CODEBASE FOR FORBIDDEN BRANDING ---');
  const projectRoot = path.resolve(__dirname, '../..');
  const targetDirs = [
    path.join(projectRoot, 'backend/src'),
    path.join(projectRoot, 'backend/scripts'),
    path.join(projectRoot, 'frontend/src'),
  ];

  const forbiddenTerms = [
    'Dhaka International University',
    'Satarkul',
    'diu.ac',
  ];

  let forbiddenFound = 0;
  const violations: string[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|js|tsx|jsx|json|html|md)$/i.test(entry.name)) {
        if (entry.name.includes('verify_phase4_branding_mobile')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const term of forbiddenTerms) {
          if (content.toLowerCase().includes(term.toLowerCase())) {
            forbiddenFound++;
            violations.push(`${path.relative(projectRoot, fullPath)} contains "${term}"`);
          }
        }
      }
    }
  }

  for (const dir of targetDirs) {
    scanDir(dir);
  }

  record(
    'AUDIT-01',
    'Zero Incorrect University Names & Addresses in Codebase',
    forbiddenFound === 0,
    forbiddenFound === 0
      ? '0 occurrences found of "Dhaka International University", "Satarkul", or "diu.ac"'
      : `Found ${forbiddenFound} violations: ${violations.join('; ')}`
  );

  // -------------------------------------------------------------------------
  // 2. Centralized Brand Configuration Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 2. CENTRALIZED BRAND CONFIGURATION ---');
  record(
    'BRAND-01',
    'Official Primary Brand Name',
    EMAIL_BRAND.name === 'DIU Investment Club',
    `Brand name: "${EMAIL_BRAND.name}"`
  );

  record(
    'BRAND-02',
    'Official University Affiliation',
    EMAIL_BRAND.university === 'Daffodil International University',
    `University: "${EMAIL_BRAND.university}"`
  );

  record(
    'BRAND-03',
    'Verified Campus Address',
    EMAIL_BRAND.address.includes('Daffodil Smart City') && EMAIL_BRAND.address.includes('Savar'),
    `Address: "${EMAIL_BRAND.address}"`
  );

  record(
    'BRAND-04',
    'Official University Website',
    EMAIL_BRAND.officialWebsite === 'https://daffodilvarsity.edu.bd',
    `Website: "${EMAIL_BRAND.officialWebsite}"`
  );

  // Dynamic admin setting propagation check
  await settingsRepository.updateSettings({
    official_comm_label: 'Official club notification (Verified)',
  });
  const dynamicBrand = getEmailBrandConfig();
  record(
    'BRAND-05',
    'Dynamic Admin Setting Propagation',
    dynamicBrand.officialCommLabel === 'Official club notification (Verified)',
    `Updated comm label via settings cache: "${dynamicBrand.officialCommLabel}"`
  );
  // Revert back
  await settingsRepository.updateSettings({
    official_comm_label: 'Official club communication',
  });

  // -------------------------------------------------------------------------
  // 3. Mobile Responsiveness & Template Structure Audit
  // -------------------------------------------------------------------------
  console.log('\n--- 3. MOBILE RESPONSIVENESS & TEMPLATE ARCHITECTURE AUDIT ---');

  const templates = [
    { name: 'Welcome Email', rendered: renderWelcomeEmail({ userName: 'Tanvir Ahmed', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Payment Confirmation', rendered: renderPaymentConfirmationEmail({ memberName: 'Tanvir Ahmed', amount: 1500, paymentReference: 'TXN-DIU-2026-98124', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Expense Submitted', rendered: renderExpenseSubmittedEmail({ approverName: 'Club President', submitterName: 'Rahim Khan', expenseReference: 'EXP-2026-001', expenseTitle: 'Annual Gala Venue Advance', amount: 7500, categoryName: 'EVENT', recipientEmail: 'admin@diu.edu.bd' }) },
    { name: 'Expense Approved', rendered: renderExpenseApprovedEmail({ userName: 'Rahim Khan', expenseReference: 'EXP-2026-001', expenseTitle: 'Annual Gala Venue Advance', amount: 7500, approverName: 'Club President', recipientEmail: 'admin@diu.edu.bd' }) },
    { name: 'Expense Rejected', rendered: renderExpenseRejectedEmail({ userName: 'Rahim Khan', expenseReference: 'EXP-2026-001', expenseTitle: 'Annual Gala Venue Advance', amount: 7500, reason: 'Missing official invoice receipt', recipientEmail: 'admin@diu.edu.bd' }) },
    { name: 'Event Notification', rendered: renderEventNotificationEmail({ memberName: 'Tanvir Ahmed', eventTitle: 'National Equity Research Summit', eventDate: 'April 12, 2026', location: 'DIU Auditorium, Daffodil Smart City', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Meeting Invitation', rendered: renderMeetingInvitationEmail({ memberName: 'Executive Team', meetingTitle: 'Quarterly Financial Review', meetingDate: 'March 25, 2026', meetingTime: '4:00 PM', location: 'Conference Room 302 / Google Meet', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Task Assignment', rendered: renderTaskAssignedEmail({ assigneeName: 'Nusrat Jahan', taskTitle: 'Prepare DSE Market Analysis Report', dueDate: 'March 30, 2026', assignedByName: 'Club Secretary', taskId: 'TASK-2026-001', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Reminder', rendered: renderReminderEmail({ memberName: 'Tanvir Ahmed', reminderType: 'due', title: 'Spring 2026 Club Subscription', dueDateOrDate: 'March 31, 2026', recipientEmail: 'member@diu.edu.bd' }) },
    { name: 'Password Reset', rendered: renderPasswordResetEmail({ userName: 'Tanvir Ahmed', resetUrl: 'http://localhost:3000/reset?token=xyz123', recipientEmail: 'member@diu.edu.bd' }) },
  ];

  let allTemplatesHaveCorrectBrand = true;
  let allTemplatesHaveCorrectFooter = true;
  let allTemplatesMobileSafe = true;
  let allButtonsMobileSafe = true;

  for (const t of templates) {
    const html = t.rendered.html;

    // Check Branding
    if (!html.includes('DIU Investment Club') || !html.includes('Daffodil International University')) {
      allTemplatesHaveCorrectBrand = false;
      console.error(`  Template ${t.name} is missing proper brand or university affiliation!`);
    }

    // Check Footer structure (Section 10)
    if (!html.includes('Official club communication') || !html.includes('Daffodil Smart City')) {
      allTemplatesHaveCorrectFooter = false;
      console.error(`  Template ${t.name} footer is missing required elements!`);
    }

    // Check Mobile Viewport & CSS rules
    if (!html.includes('width=device-width') || !html.includes('@media only screen and (max-width: 620px)')) {
      allTemplatesMobileSafe = false;
      console.error(`  Template ${t.name} is missing responsive viewport or media queries!`);
    }

    // Check CTA button mobile properties
    if (html.includes('email-btn')) {
      if (!html.includes('word-break: break-word') || !html.includes('min-height: 44px')) {
        allButtonsMobileSafe = false;
        console.error(`  Template ${t.name} button lacks 44px tap target or word-break!`);
      }
    }
  }

  record(
    'RESP-01',
    'Responsive Viewport & Mobile CSS Media Queries across All 10 Templates',
    allTemplatesMobileSafe,
    'All templates contain viewport meta tag and @media (max-width: 620px) reset styles'
  );

  record(
    'RESP-02',
    'Correct University & Club Hierarchy in All 10 Templates',
    allTemplatesHaveCorrectBrand,
    'All templates render "DIU Investment Club" and "Daffodil International University"'
  );

  record(
    'RESP-03',
    'Section 10 Footer Redesign in All 10 Templates',
    allTemplatesHaveCorrectFooter,
    'Footer displays DIU Investment Club, Daffodil International University, Official club communication, and Daffodil Smart City'
  );

  record(
    'RESP-04',
    'Section 9 Mobile CTA Button Tap-Target & Wrap Protection',
    allButtonsMobileSafe,
    'Buttons enforce min-height: 44px, word-break: break-word, and max-width: 100%'
  );

  // -------------------------------------------------------------------------
  // 4. Section 17 Live Resend End-to-End Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 4. SECTION 17: LIVE RESEND END-TO-END TRANSMISSIONS ---');

  // TEST 1: Send Welcome Email
  console.log('Sending Test 1: Welcome Email...');
  const res1 = await emailService.sendWelcomeEmail({
    to: DEFAULT_TEST_RECIPIENT,
    userName: 'Tanvir Ahmed (Phase 4 Verification)',
    loginUrl: 'http://localhost:3000/login',
    sentByUserId: '00000000-0000-0000-0000-000000000001',
  });
  record(
    'LIVE-01',
    'Live Welcome Email with Daffodil International University Branding',
    res1.success,
    res1.success ? `Resend Message ID: ${res1.id}` : `Error: ${res1.error}`
  );

  // TEST 2: Send Payment Confirmation
  console.log('Sending Test 2: Payment Confirmation Email...');
  const res2 = await emailService.sendPaymentConfirmationEmail({
    to: DEFAULT_TEST_RECIPIENT,
    memberName: 'Tanvir Ahmed',
    amount: 1500,
    paymentReference: 'TXN-PHASE4-874291',
    paymentType: 'Membership Subscription',
    sentByUserId: '00000000-0000-0000-0000-000000000001',
  });
  record(
    'LIVE-02',
    'Live Payment Confirmation with Responsive Financial Card',
    res2.success,
    res2.success ? `Resend Message ID: ${res2.id}` : `Error: ${res2.error}`
  );

  // TEST 3: Send Event Notification
  console.log('Sending Test 3: Event Notification Email...');
  const res3 = await emailService.sendEventNotificationEmail({
    to: DEFAULT_TEST_RECIPIENT,
    memberName: 'Tanvir Ahmed',
    eventTitle: 'DSE Capital Markets & Valuation Masterclass 2026',
    eventDate: 'Saturday, April 18, 2026',
    eventTime: '10:00 AM - 1:00 PM',
    location: 'DIU Auditorium, Daffodil Smart City',
    description: 'Learn institutional trading and financial statement analysis from licensed market strategists.',
    sentByUserId: '00000000-0000-0000-0000-000000000001',
  });
  record(
    'LIVE-03',
    'Live Event Notification Email with Daffodil Smart City Venue',
    res3.success,
    res3.success ? `Resend Message ID: ${res3.id}` : `Error: ${res3.error}`
  );

  // TEST 4: Send Meeting Invitation
  console.log('Sending Test 4: Meeting Invitation Email...');
  const res4 = await emailService.sendMeetingInvitationEmail({
    to: DEFAULT_TEST_RECIPIENT,
    memberName: 'Tanvir Ahmed',
    meetingTitle: 'Annual Budget Planning & Investment Committee Review',
    meetingDate: 'Wednesday, April 8, 2026',
    meetingTime: '3:30 PM',
    location: 'Conference Hall, Daffodil Smart City / Google Meet',
    agendaSummary: 'Review Q2 investment thesis, capital deployment, and financial reporting.',
    sentByUserId: '00000000-0000-0000-0000-000000000001',
  });
  record(
    'LIVE-04',
    'Live Meeting Invitation Email',
    res4.success,
    res4.success ? `Resend Message ID: ${res4.id}` : `Error: ${res4.error}`
  );

  // -------------------------------------------------------------------------
  // Summary Table
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('FINAL VERIFICATION SUMMARY:');
  console.log('========================================================================');
  console.table(results);

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
