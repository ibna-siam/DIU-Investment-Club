require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api/v1';

async function loginAsAdmin() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@diu.edu.bd',
      password: 'Password123!',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }
  return data.data.token;
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 DIU Investment Club: Comprehensive System Verification');
  console.log('========================================================');

  const token = await loginAsAdmin();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} - ${details}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST SUITE 1: Financial Deletion Protection Guard (Section 3.C)
  // ----------------------------------------------------
  console.log('\n[Suite 1] Financial Deletion Protection:');
  const financialEndpoints = [
    '/income/some-id',
    '/expenses/some-id',
    '/transactions/some-id',
    '/member-payments/some-id',
    '/journal-entries/some-id',
  ];

  for (const endpoint of financialEndpoints) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const body = await res.json().catch(() => ({}));
    assert(
      res.status === 405 && body.error?.code === 'FINANCIAL_AUDIT_PROTECTION',
      `HTTP DELETE blocked on ${endpoint} with 405 FINANCIAL_AUDIT_PROTECTION`,
      `Status: ${res.status}, Code: ${body.error?.code}`
    );
  }

  // ----------------------------------------------------
  // TEST SUITE 2: Operational CRUD Safe Deletion
  // ----------------------------------------------------
  console.log('\n[Suite 2] Operational Categories Safe Deletion:');
  
  // 2A: Create a dummy income category, then safely delete it
  const createCatRes = await fetch(`${API_BASE}/income-categories`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Test Temp Category ${Date.now()}`,
      description: 'Temporary test category for deletion test',
    }),
  });
  const catData = await createCatRes.json();
  const catId = catData.data?.id;
  assert(createCatRes.status === 201 && catId, 'Created temporary Income Category');

  if (catId) {
    const delCatRes = await fetch(`${API_BASE}/income-categories/${catId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const delBody = await delCatRes.json();
    assert(
      delCatRes.status === 200 && delBody.success,
      'Safely deleted unreferenced Income Category',
      JSON.stringify(delBody)
    );
  }

  // ----------------------------------------------------
  // TEST SUITE 3: Member Dues Cancel Safe Workflow
  // ----------------------------------------------------
  console.log('\n[Suite 3] Member Dues Cancelation Safety:');
  // Fetch existing dues
  const duesRes = await fetch(`${API_BASE}/member-dues?limit=5`, {
    method: 'GET',
    headers: authHeaders,
  });
  const duesList = await duesRes.json();
  const sampleDue = duesList.data?.data?.[0] || duesList.data?.[0];
  if (sampleDue) {
    // If due has payment, cancel should fail or succeed cleanly based on payments
    const cancelRes = await fetch(`${API_BASE}/member-dues/${sampleDue.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Verification Test Run' }),
    });
    const cancelBody = await cancelRes.json();
    if (sampleDue.paid_amount > 0) {
      assert(
        cancelRes.status === 400 && (cancelBody.error?.message?.toLowerCase().includes('paid') || cancelBody.error?.message?.toLowerCase().includes('payment')),
        'Blocked cancellation of Member Due with existing payments',
        cancelBody.error?.message
      );
    } else {
      assert(
        cancelRes.status === 200 || cancelRes.status === 400,
        `Due cancel handled properly (Status: ${cancelRes.status})`,
        cancelBody.error?.message
      );
    }
  }

  // ----------------------------------------------------
  // TEST SUITE 4: Notification Deduplication & Permanence
  // ----------------------------------------------------
  console.log('\n[Suite 4] Notification Deduplication & Permanence:');
  const db = getDbAdmin();
  const { notificationsRepository } = require('../dist/modules/notifications/notifications.repository');

  const testEntityId = '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12);
  // First dispatch
  const notif1 = await notificationsRepository.dispatchNotification({
    user_id: 'a1111111-1111-1111-1111-111111111111',
    title: 'Automated Test Deduplication Alert',
    message: 'Testing deduplication window',
    type: 'INFO',
    category: 'SYSTEM',
    related_entity_type: 'TEST_SUITE',
    related_entity_id: testEntityId,
    deduplicateHours: 24,
  });
  assert(notif1 !== null && notif1.id, 'First notification dispatched successfully');

  // Second immediate dispatch with same entity
  const notif2 = await notificationsRepository.dispatchNotification({
    user_id: 'a1111111-1111-1111-1111-111111111111',
    title: 'Automated Test Deduplication Alert',
    message: 'Duplicate attempt within 24h',
    type: 'INFO',
    category: 'SYSTEM',
    related_entity_type: 'TEST_SUITE',
    related_entity_id: testEntityId,
    deduplicateHours: 24,
  });
  assert(notif2 === null, 'Second duplicate notification suppressed by 24h deduplication filter');

  // Mark as read and verify permanent read_at
  if (notif1?.id) {
    const markRes = await fetch(`${API_BASE}/notifications/${notif1.id}/read`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert(markRes.status === 200, 'Notification marked as read');

    const { data: verifiedNotif } = await db.from('notifications').select('*').eq('id', notif1.id).single();
    assert(
      verifiedNotif?.is_read === true && verifiedNotif?.read_at !== null,
      'Notification is_read = true and read_at timestamp permanently saved in PostgreSQL'
    );

    // Clean up test notification
    await db.from('notifications').delete().eq('id', notif1.id);
  }

  // ----------------------------------------------------
  // TEST SUITE 5: Document Upload, Storage, Download, & Safe Delete
  // ----------------------------------------------------
  console.log('\n[Suite 5] Document Upload & Supabase Storage:');

  // Create a realistic sample PDF buffer
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (DIU Investment Club Constitution) /Author (DIU) >>\nendobj\n%%EOF'
  );

  const formData = new FormData();
  const fileBlob = new Blob([samplePdfBuffer], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'test_constitution.pdf');
  formData.append('title', `DIU Governance Test Policy ${Date.now()}`);
  formData.append('category', 'POLICY_DOCUMENT');
  formData.append('visibility', 'PUBLIC_TO_MEMBERS');
  formData.append('description', 'Comprehensive automated test document upload verification');
  formData.append('original_size', '150000');
  formData.append('optimized_size', '45000');

  const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadJson = await uploadRes.json();
  const createdDoc = uploadJson.data;
  assert(
    uploadRes.status === 201 && createdDoc?.id && createdDoc?.file_path,
    `Document uploaded to Supabase Storage (Path: ${createdDoc?.file_path})`,
    JSON.stringify(uploadJson)
  );

  if (createdDoc?.id) {
    // 5B: Test signed download URL generation
    const downloadRes = await fetch(`${API_BASE}/documents/${createdDoc.id}/download`, {
      method: 'GET',
      headers: authHeaders,
    });
    const downloadJson = await downloadRes.json();
    assert(
      downloadRes.status === 200 && downloadJson.data?.download_url?.includes('http'),
      'Secure signed download URL generated for document',
      JSON.stringify(downloadJson)
    );

    // 5C: Test Soft Delete
    const softDelRes = await fetch(`${API_BASE}/documents/${createdDoc.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const softDelJson = await softDelRes.json();
    assert(
      softDelRes.status === 200 && softDelJson.success,
      'Document soft deleted (moved to trash)',
      JSON.stringify(softDelJson)
    );

    // Verify soft delete status in DB
    const { data: softDeletedDoc } = await db.from('documents').select('*').eq('id', createdDoc.id).single();
    assert(
      softDeletedDoc?.status === 'DELETED' && softDeletedDoc?.deleted_at !== null,
      'Database verifies status = DELETED and deleted_at is populated'
    );

    // 5D: Test Restore
    const restoreRes = await fetch(`${API_BASE}/documents/${createdDoc.id}/restore`, {
      method: 'POST',
      headers: authHeaders,
    });
    const restoreJson = await restoreRes.json();
    assert(restoreRes.status === 200 && restoreJson.success, 'Document restored from trash to active');

    // 5E: Test Permanent Delete (Trash Purge)
    const permDelRes = await fetch(`${API_BASE}/documents/${createdDoc.id}?permanent=true`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const permDelJson = await permDelRes.json();
    assert(
      permDelRes.status === 200 && permDelJson.success,
      'Document permanently purged from database and Supabase Storage',
      JSON.stringify(permDelJson)
    );

    // Verify record is gone from DB
    const { data: purgedDoc } = await db.from('documents').select('*').eq('id', createdDoc.id).single();
    assert(!purgedDoc, 'Database verifies document row is completely removed');
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
