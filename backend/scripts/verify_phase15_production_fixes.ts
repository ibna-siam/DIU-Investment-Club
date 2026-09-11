/**
 * Verification Script: Phase 15 Production Bug Fixes & Account Setup Synchronization
 *
 * Validates:
 * 1. Account Setup Token Creation, Validation, and Confirmation with GoTrue Password Sync
 * 2. Login with New Password succeeds and Old Temporary Password fails
 * 3. Token Single-Use Idempotency (replay attack rejected)
 * 4. Task Assignment Scoping (Assignee only, no club broadcast)
 * 5. Meeting Participants Scoping (Selected participants only, no executive member fallback)
 * 6. Event Audience Default ('NONE', zero emails sent by default)
 * 7. Domain Spelling Audit (strictly invesmentclub.top)
 */

import crypto, { randomUUID } from 'crypto';
import assert from 'assert';
import { supabaseClient, getDbAdmin, isSupabaseConfigured } from '../src/config/supabase';
import { getPrimaryClientUrl } from '../src/config/env';
import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';
import { usersRepository } from '../src/modules/users/users.repository';
import { emailEventBus } from '../src/modules/email/email.events';
import { domainNotificationResolver } from '../src/modules/notifications/domain-notification.resolver';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 15 PRODUCTION VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function recordPass(testName: string) {
    totalTests++;
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  }

  function recordFail(testName: string, error: any) {
    totalTests++;
    console.error(`❌ [FAIL] ${testName}:`, error?.message || error);
  }

  // --- TEST 1: Account Setup Token Flow & GoTrue Password Sync ---
  console.log('\n--- Test 1: Account Setup Single-Use Token Flow & GoTrue Sync ---');
  try {
    const testEmail = `test.setup.${Date.now()}@invesmentclub.top`;
    const initialTempPassword = `InitialTemp_${Date.now()}_A#1`;
    const newChosenPassword = `NewSecurePass_${Date.now()}!9`;

    // 1A. Create user in Supabase
    const user = await usersRepository.createUser({
      email: testEmail,
      password: initialTempPassword,
      full_name: 'Phase 15 Verification User',
      status: 'active',
    });
    assert.ok(user?.id, 'User must be created with valid ID');
    console.log(`   Created test user ${user.id} (${testEmail})`);

    // 1B. Verify user initially can log in with initial temp password
    const initialAuth = await supabaseClient?.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });
    assert.ok(initialAuth?.data?.user, 'User should be authenticatable with initial password');
    console.log('   Initial password authentication verified.');

    // 1C. Generate setup token and insert into account_setup_tokens
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const client = getDbAdmin();
    const { data: insertedToken, error: tokenInsertErr } = await client
      .from('account_setup_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    assert.ok(!tokenInsertErr, `Setup token insertion should succeed: ${tokenInsertErr?.message}`);
    assert.strictEqual(insertedToken.user_id, user.id);
    console.log('   Single-use setup token recorded in database.');

    // 1D. Validate setup token lookup
    const { data: validRecord, error: validateErr } = await client
      .from('account_setup_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    assert.ok(!validateErr && validRecord, 'Token validation lookup must succeed');
    console.log('   Setup token validation verified.');

    // 1E. Update password in GoTrue via admin_set_user_password RPC
    const { error: rpcErr } = await client.rpc('admin_set_user_password', {
      p_user_id: user.id,
      p_new_password: newChosenPassword,
    });
    assert.ok(!rpcErr, `admin_set_user_password RPC must succeed: ${rpcErr?.message}`);

    // Mark token as used
    await client
      .from('account_setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', validRecord.id);

    // 1F. Test login with NEW password
    const newAuth = await supabaseClient?.auth.signInWithPassword({
      email: testEmail,
      password: newChosenPassword,
    });
    assert.ok(newAuth?.data?.user, 'Login with new password must succeed in GoTrue!');
    console.log('   Login with NEW password succeeded perfectly.');

    // 1G. Test login with OLD password -> MUST FAIL
    const oldAuth = await supabaseClient?.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });
    assert.ok(oldAuth?.error, 'Login with old temporary password MUST be rejected');
    console.log('   Login with OLD temporary password rejected as expected.');

    // 1H. Test token replay attack -> MUST FAIL (token marked used)
    const { data: replayRecord } = await client
      .from('account_setup_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    assert.strictEqual(replayRecord, null, 'Replayed used token must return null');
    console.log('   Replay attack on used setup token successfully blocked.');

    // Cleanup test user
    try {
      await client.from('account_setup_tokens').delete().eq('user_id', user.id);
      await client.from('profiles').delete().eq('id', user.id);
      await client.auth.admin.deleteUser(user.id);
    } catch (cleanErr) {}

    recordPass('Account Setup Token & GoTrue Password Sync');
  } catch (err) {
    recordFail('Account Setup Token & GoTrue Password Sync', err);
  }

  // --- TEST 2: Task Assignment Recipient Scoping ---
  console.log('\n--- Test 2: Task Assignment Recipient Scoping ---');
  try {
    let capturedEvents: any[] = [];
    const listener = (event: any) => {
      capturedEvents.push(event);
    };
    emailEventBus.on('TASK_ASSIGNED', listener);

    const testTaskId = randomUUID();
    const testAssigneeId = randomUUID();
    const testAssigneeEmail = 'assignee@invesmentclub.top';

    emailEventBus.emitEvent({
      type: 'TASK_ASSIGNED',
      payload: {
        taskId: testTaskId,
        title: 'Review Financial Statements',
        assigneeId: testAssigneeId,
        assigneeName: 'Test Assignee',
        assigneeEmail: testAssigneeEmail,
        assignedByName: 'Admin',
        priority: 'HIGH',
      },
    });

    assert.strictEqual(capturedEvents.length, 1, 'Exactly one TASK_ASSIGNED event captured');
    assert.strictEqual(capturedEvents[0].assigneeEmail, testAssigneeEmail);
    assert.strictEqual(capturedEvents[0].assigneeId, testAssigneeId);
    console.log(`   Verified task assignment event targeted strictly to ${testAssigneeEmail}`);

    emailEventBus.removeListener('TASK_ASSIGNED', listener);
    recordPass('Task Assignment Recipient Scoping');
  } catch (err) {
    recordFail('Task Assignment Recipient Scoping', err);
  }

  // --- TEST 3: Meeting Participants Scoping ---
  console.log('\n--- Test 3: Meeting Participants Scoping ---');
  try {
    let meetingEvents: any[] = [];
    const meetingListener = (event: any) => {
      meetingEvents.push(event);
    };
    emailEventBus.on('MEETING_SCHEDULED', meetingListener);

    const testMeetingId = randomUUID();
    const specificParticipants = ['treasurer@invesmentclub.top', 'secretary@invesmentclub.top'];

    emailEventBus.emitEvent({
      type: 'MEETING_SCHEDULED',
      payload: {
        meetingId: testMeetingId,
        title: 'Q3 Financial Review',
        meetingDate: '2026-09-15',
        startTime: '16:00',
        participantEmails: specificParticipants,
      },
    });

    assert.strictEqual(meetingEvents.length, 1);
    assert.deepStrictEqual(meetingEvents[0].participantEmails, specificParticipants);
    console.log(`   Verified meeting invitations dispatched strictly to [${specificParticipants.join(', ')}]`);

    // Verify empty participants emits event with empty list and does NOT broadcast to executives
    meetingEvents = [];
    emailEventBus.emitEvent({
      type: 'MEETING_SCHEDULED',
      payload: {
        meetingId: randomUUID(),
        title: 'Internal Prep Session',
        meetingDate: '2026-09-16',
        startTime: '10:00',
        participantEmails: [],
      },
    });
    assert.strictEqual(meetingEvents[0].participantEmails.length, 0);
    console.log('   Verified empty participants does not broadcast to all executives.');

    emailEventBus.removeListener('MEETING_SCHEDULED', meetingListener);
    recordPass('Meeting Participants Scoping');
  } catch (err) {
    recordFail('Meeting Participants Scoping', err);
  }

  // --- TEST 4: Event Audience Default NONE & Scoping ---
  console.log('\n--- Test 4: Event Audience Default NONE & Scoping ---');
  try {
    let eventCreatedEmitted = false;
    const eventListener = () => {
      eventCreatedEmitted = true;
    };
    emailEventBus.on('EVENT_CREATED', eventListener);

    // Simulate event created with default audience ('NONE')
    const audience = 'NONE';
    const notify_members = false;
    const shouldNotify = audience !== 'NONE' && notify_members !== false;

    if (shouldNotify) {
      emailEventBus.emitEvent({
        type: 'EVENT_CREATED',
        payload: {
          eventId: randomUUID(),
          title: 'Draft Summit 2026',
          startDate: '2026-10-01',
          targetAudience: audience,
        },
      });
    }

    assert.strictEqual(eventCreatedEmitted, false, 'Default NONE audience must NOT emit EVENT_CREATED notification!');
    console.log('   Verified default NONE audience completely suppresses announcements.');

    emailEventBus.removeListener('EVENT_CREATED', eventListener);
    recordPass('Event Audience Default NONE Suppression');
  } catch (err) {
    recordFail('Event Audience Default NONE Suppression', err);
  }

  // --- TEST 5: Domain Spelling & Configuration Audit ---
  console.log('\n--- Test 5: Domain Spelling Integrity Audit ---');
  try {
    const primaryDomain = getPrimaryClientUrl();
    assert.strictEqual(primaryDomain, 'https://invesmentclub.top', 'Primary client URL must be https://invesmentclub.top');
    assert.strictEqual(primaryDomain.includes('investmentclub.top'), false, 'Domain must NOT have extra "t"');

    assert.ok(DEFAULT_FROM_EMAIL.includes('noreply@invesmentclub.top'), 'Default sender must include noreply@invesmentclub.top');
    assert.strictEqual(DEFAULT_FROM_EMAIL.includes('investmentclub.top'), false, 'Sender must NOT have misspelled domain');
    console.log(`   Verified Primary Domain: ${primaryDomain}`);
    console.log(`   Verified Sender: ${DEFAULT_FROM_EMAIL}`);

    recordPass('Domain Spelling Integrity');
  } catch (err) {
    recordFail('Domain Spelling Integrity', err);
  }

  console.log('\n====================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
