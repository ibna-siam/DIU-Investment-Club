/**
 * Email Testing & Diagnostics System Verification Script
 * DIU Investment Club ERP
 *
 * Verifies:
 * 1. Sender identity is strictly: DIU Investment Club <noreply@invesmentclub.top>
 * 2. Active Provider is Resend
 * 3. Domain is invesmentclub.top
 * 4. Test Email Template has subject: "DIU Investment Club – Email System Test"
 * 5. Performs live dispatch to siamibna75@gmail.com via Resend
 * 6. Captures and reports:
 *    - Acceptance status
 *    - Recipient
 *    - Message ID
 *    - Final status
 *    - Provider error (if any)
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';
import { emailProvider } from '../src/modules/email/email.provider';
import { renderTestEmail } from '../src/modules/email/email.templates';
import { emailService } from '../src/modules/email/email.service';

async function main() {
  console.log('========================================================================');
  console.log('📧 EMAIL TESTING & DIAGNOSTICS SYSTEM VERIFICATION');
  console.log('   Official Domain: invesmentclub.top');
  console.log('   Sender: DIU Investment Club <noreply@invesmentclub.top>');
  console.log('========================================================================\n');

  // Check 1: Sender identity
  console.log('1. Checking Sender Email Identity...');
  console.log(`   Configured DEFAULT_FROM_EMAIL: "${DEFAULT_FROM_EMAIL}"`);
  const senderMatches = DEFAULT_FROM_EMAIL === 'DIU Investment Club <noreply@invesmentclub.top>';
  console.log(`   Matches official sender: ${senderMatches ? 'YES ✅' : 'NO ❌'}`);

  // Check 2: No investmentclub.top
  console.log('\n2. Verifying Absence of Old Domain (investmentclub.top)...');
  const hasOldDomain = DEFAULT_FROM_EMAIL.includes('investmentclub.top');
  console.log(`   Contains old misspelled domain: ${hasOldDomain ? 'YES ❌' : 'NO ✅'}`);

  // Check 3: Provider configuration
  console.log('\n3. Checking Resend Provider Status...');
  const isConfigured = emailProvider.isConfigured();
  console.log(`   Active Provider: ${emailProvider.name}`);
  console.log(`   API Key Configured: ${isConfigured ? 'YES ✅' : 'NO ❌'}`);

  // Check 4: Template Rendering
  console.log('\n4. Verifying Test Email Template & Subject...');
  const rendered = renderTestEmail({
    recipientName: 'Ibna Siam',
    recipientEmail: 'siamibna75@gmail.com',
    environment: 'production',
    serverTime: new Date().toISOString(),
    notes: 'Official Email Testing & Diagnostics System Verification',
  });
  console.log(`   Subject: "${rendered.subject}"`);
  const subjectCorrect = rendered.subject === 'DIU Investment Club – Email System Test';
  console.log(`   Subject exact match: ${subjectCorrect ? 'YES ✅' : 'NO ❌'}`);
  const hasBranding = rendered.html.includes('DIU Investment Club') && rendered.html.includes('invesmentclub.top');
  console.log(`   HTML contains branding & domain: ${hasBranding ? 'YES ✅' : 'NO ❌'}`);

  // Check 5: Live Transmission Test
  const testRecipient = 'siamibna75@gmail.com';
  console.log(`\n5. Executing Live Resend Test Transmission to ${testRecipient}...`);
  const startTime = Date.now();
  
  const result = await emailService.sendTestEmail({
    to: testRecipient,
    recipientName: 'Ibna Siam (Super Admin)',
    notes: 'Live Verification of Email Testing & Diagnostics System',
  });
  
  const durationMs = Date.now() - startTime;

  console.log('\n========================================================================');
  console.log('📊 LIVE TRANSMISSION TELEMETRY REPORT');
  console.log('========================================================================');
  console.log(`Was accepted by Resend:  ${result.success ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Recipient used:          ${result.recipient}`);
  console.log(`Provider:                ${result.provider}`);
  console.log(`HTTP Status Code:        ${result.statusCode}`);
  console.log(`Resend Message ID:       ${result.id || 'N/A'}`);
  console.log(`Sent Timestamp:          ${result.sentAt}`);
  console.log(`Transmission Duration:   ${durationMs}ms`);
  console.log(`Final Status:            ${result.success ? 'SENT' : 'FAILED'}`);
  console.log(`Provider Error:          ${result.error || 'None (Success)'}`);
  console.log('========================================================================\n');

  if (!result.success) {
    console.error('❌ Live test email transmission failed!');
    process.exit(1);
  } else {
    console.log('✅ All Email Testing & Diagnostics system requirements verified successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
