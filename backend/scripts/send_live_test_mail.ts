import dotenv from 'dotenv';
import path from 'path';

// Load backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { emailService } from '../src/modules/email/email.service';
import { emailProvider } from '../src/modules/email/email.provider';
import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';

async function main() {
  console.log('====================================================');
  console.log('  DIU INVESTMENT CLUB - LIVE RESEND EMAIL DISPATCH   ');
  console.log('====================================================\n');

  console.log(`Provider: ${emailProvider.name}`);
  console.log(`Configured: ${emailProvider.isConfigured()}`);
  console.log(`From: ${DEFAULT_FROM_EMAIL}`);
  console.log(`Email Mode: ${process.env.EMAIL_MODE || 'LIVE'}`);

  const testRecipient = 'siamibna75@gmail.com';
  console.log(`\nInitiating live email transmission to test recipient: ${testRecipient}...`);

  const result = await emailService.sendTestEmail({
    to: testRecipient,
    recipientName: 'Ibna Siam',
    notes: 'Official live transmission test from verified domain investmentclub.top via Resend API.',
  });

  console.log('\nTransmission Result:');
  console.log('--------------------');
  console.log(`Success:    ${result.success}`);
  console.log(`Message ID: ${result.id || 'N/A'}`);
  console.log(`Recipient:  ${JSON.stringify(result.recipient)}`);
  console.log(`Provider:   ${result.provider}`);
  console.log(`Sent At:    ${result.sentAt}`);
  if (result.error) {
    console.error(`Error:      ${result.error}`);
    process.exit(1);
  } else {
    console.log('\n>>> Text and HTML email delivered successfully to test recipient! <<<');
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
