import { getDbAdmin } from '../src/config/supabase';
import { departmentsRepository } from '../src/modules/departments/departments.repository';
import { membersRepository } from '../src/modules/members/members.repository';
import { isValidEmail } from '../src/modules/email/email.security';

async function verifyAll() {
  console.log('================================================================');
  console.log('VERIFYING DEPARTMENTS DIRECTORY & MEMBER VALIDATION RULES');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // 1. Verify departments directory
  const activeDepts = await departmentsRepository.findAll({ activeOnly: true });
  console.log(`✅ Loaded ${activeDepts.length} active DIU departments.`);

  const accDept = await departmentsRepository.findByOfficialName('Department of Accounting');
  if (!accDept) {
    throw new Error('FAILED: "Department of Accounting" not found in departments directory!');
  }
  console.log(`✅ Found Department of Accounting: Code=${accDept.code}, Faculty=${accDept.faculty}, Active=${accDept.active}`);

  const sweDept = await departmentsRepository.findByOfficialName('Software Engineering');
  if (!sweDept) {
    throw new Error('FAILED: "Software Engineering" not found in departments directory!');
  }
  console.log(`✅ Found Software Engineering: Code=${sweDept.code}, Faculty=${sweDept.faculty}, Active=${sweDept.active}`);

  // 2. Test email validation
  console.log('\n--- Testing Email Validation ---');
  const testValidEmail = '252-58-082@diu.edu.bd';
  const testInvalidEmail1 = '252-58-082@diu.edi.bd'; // typo domain
  const testInvalidEmail2 = 'not-an-email';

  console.log(`Email "${testValidEmail}" isValid:`, isValidEmail(testValidEmail));
  console.log(`Email "${testInvalidEmail1}" isValid:`, isValidEmail(testInvalidEmail1));
  console.log(`Email "${testInvalidEmail2}" isValid:`, isValidEmail(testInvalidEmail2));

  if (!isValidEmail(testValidEmail)) throw new Error('Valid email failed validation');
  if (isValidEmail(testInvalidEmail2)) throw new Error('Invalid email passed validation');

  // 3. Test department validation
  console.log('\n--- Testing Department Validation ---');
  const fakeDept = await departmentsRepository.findByOfficialName('Fake Department That Does Not Exist');
  console.log('Lookup "Fake Department That Does Not Exist":', fakeDept === null ? 'NULL (Correct)' : 'Found (Wrong)');
  if (fakeDept !== null) throw new Error('Fake department found in directory');

  // 4. Verify Junnat Ara Jui record in DB
  console.log('\n--- Verifying Junnat Ara Jui Live Record ---');
  const member = await membersRepository.findById('7d92037d-bc0e-46c6-ae10-0d73f7e481a3');
  if (!member) throw new Error('Junnat Ara Jui member record not found');

  console.log('Member Code:', member.member_code);
  console.log('Full Name:', member.full_name);
  console.log('Email:', member.email);
  console.log('Department:', member.department);
  console.log('Student ID:', member.student_id);

  if (member.member_code !== 'DIC-2026-00056') throw new Error(`Wrong member code: ${member.member_code}`);
  if (member.full_name !== 'Junnat Ara Jui') throw new Error(`Wrong full name: ${member.full_name}`);
  if (member.email !== '252-58-082@diu.edu.bd') throw new Error(`Wrong email: ${member.email}`);
  if (member.department !== 'Department of Accounting') throw new Error(`Wrong department: ${member.department}`);

  // 5. Verify email logs for recovery
  console.log('\n--- Verifying Recovery Email Logs in DB ---');
  const supabase = getDbAdmin();
  const { data: logs, error: logsErr } = await supabase
    .from('email_logs')
    .select('id, idempotency_key, email_type, recipient, provider_message_id, status')
    .eq('recipient', '252-58-082@diu.edu.bd');

  if (logsErr) throw new Error(`Failed to query email_logs: ${logsErr.message}`);
  console.log(`Found ${logs?.length || 0} delivery logs for 252-58-082@diu.edu.bd:`);
  logs?.forEach((l) => {
    console.log(` - [${l.email_type}] Status: ${l.status} | Resend ID: ${l.provider_message_id} | Key: ${l.idempotency_key}`);
  });

  if (!logs || logs.length < 2) {
    throw new Error(`Expected at least 2 recovery logs, found ${logs?.length || 0}`);
  }

  console.log('\n🎉 ALL PRODUCTION AUDIT AND VALIDATION CHECKS PASSED!');
}

verifyAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
