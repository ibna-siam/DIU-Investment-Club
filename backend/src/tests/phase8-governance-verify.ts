export {};

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(json?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json;
}

async function runPhase8Tests() {
  console.log('=============================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 8 OPERATIONS & GOVERNANCE TEST SUITE');
  console.log('=============================================================================\n');

  // 1. Authenticate as Admin
  console.log('[1/10] Authenticating Admin user (admin@diu.edu.bd)...');
  const loginRes = await req('POST', '/auth/login', {
    email: 'admin@diu.edu.bd',
    password: 'Admin12345!',
  });
  const token = loginRes.data.token;
  const adminProfile = loginRes.data.user;
  console.log(`✅ Admin authenticated: ${adminProfile.full_name} (${adminProfile.id})\n`);

  // Fetch a member for member-linked operations
  const membersRes = await req('GET', '/members?limit=1', undefined, token);
  const sampleMember = membersRes.data[0];
  console.log(`   Sample Member: ${sampleMember?.full_name} (${sampleMember?.id})`);

  // 2. Test Committee Management
  console.log('[2/10] Testing Executive Committee Management (/committees)...');
  const positionsRes = await req('GET', '/committees/positions', undefined, token);
  console.log(`   Positions available: ${positionsRes.data.length}`);

  const committeesRes = await req('GET', '/committees', undefined, token);
  console.log(`   Existing committees: ${committeesRes.data.length}`);

  let committeeId: string;
  if (committeesRes.data.length === 0) {
    console.log('   Creating Executive Committee 2026-2027...');
    const newComm = await req('POST', '/committees', {
      committee_name: 'Executive Committee 2026-2027',
      session_year: '2026-2027',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
      description: 'Governing board of DIU Investment Club',
    }, token);
    committeeId = newComm.data.id;
  } else {
    committeeId = committeesRes.data[0].id;
  }
  console.log(`   Target committee ID: ${committeeId}`);

  // Fetch committee detail
  const committeeDetail = await req('GET', `/committees/${committeeId}`, undefined, token);
  console.log(`   Committee: ${committeeDetail.data.committee_name}, Members count: ${committeeDetail.data.members?.length || 0}`);
  console.log('✅ Committee management verified.\n');

  // 3. Test Document Management
  console.log('[3/10] Testing Document Management System (/documents)...');
  const docCreateRes = await req('POST', '/documents', {
    title: 'DIU Investment Club Constitution & Bylaws 2026',
    category: 'POLICY_DOCUMENT',
    visibility: 'PUBLIC_TO_MEMBERS',
    file_name: 'constitution_2026.pdf',
    file_path: 'documents/constitution_2026.pdf',
    file_type: 'application/pdf',
    file_size: 524288,
    description: 'Official constitution, bylaws, and governance rules of DIU Investment Club.',
  }, token);
  const docId = docCreateRes.data.id;
  console.log(`   Created document: ${docCreateRes.data.title} (ID: ${docId}, v${docCreateRes.data.version_number})`);

  // Add document version
  const docVerRes = await req('POST', `/documents/${docId}/versions`, {
    file_path: 'documents/constitution_2026_v2.pdf',
    file_name: 'constitution_2026_v2.pdf',
    file_type: 'application/pdf',
    file_size: 532000,
    changelog: 'Updated clause 4.2 regarding executive committee quorum.',
  }, token);
  console.log(`   Added version: v${docVerRes.data.version_number} - ${docVerRes.data.changelog}`);

  const docList = await req('GET', '/documents?category=POLICY_DOCUMENT', undefined, token);
  console.log(`   Active policy documents count: ${docList.data.length}`);
  console.log('✅ Document management & versioning verified.\n');

  // 4. Test Meeting Management & Agendas
  console.log('[4/10] Testing Meeting Management (/meetings)...');
  const meetingRes = await req('POST', '/meetings', {
    title: 'Q1 2026 Executive Committee Review',
    meeting_type: 'EXECUTIVE_MEETING',
    committee_id: committeeId,
    meeting_date: '2026-09-15',
    start_time: '15:00',
    end_time: '17:00',
    location: 'DIU Smart Class Room 402 / Zoom',
    description: 'Quarterly review of portfolio, investment club recruitment, and university fest budget.',
  }, token);
  const meetingId = meetingRes.data.id;
  console.log(`   Scheduled meeting: "${meetingRes.data.title}" on ${meetingRes.data.meeting_date} (ID: ${meetingId})`);

  // Add Agenda items
  await req('POST', `/meetings/${meetingId}/agendas`, {
    agenda_number: 1,
    title: 'Approval of Previous Minutes & Portfolio Review',
    description: 'Review performance of Phase 2-7 stock & bond holdings.',
    allocated_minutes: 30,
    presenter_id: adminProfile.id,
    priority: 'HIGH',
  }, token);

  await req('POST', `/meetings/${meetingId}/agendas`, {
    agenda_number: 2,
    title: 'Approval of Capital Allocation for National Finance Summit',
    description: 'Discussion of sponsorship and budget requirements.',
    allocated_minutes: 45,
    presenter_id: adminProfile.id,
    priority: 'MEDIUM',
  }, token);
  console.log('   Added 2 structured agenda items with allocated times and presenters.');

  // Attendance (using sampleMember.id)
  if (sampleMember) {
    await req('POST', `/meetings/${meetingId}/attendance`, {
      attendees: [
        { member_id: sampleMember.id, attendance_status: 'PRESENT', notes: 'Active participation' }
      ]
    }, token);
    console.log(`   Recorded attendance for member ${sampleMember.full_name}.`);
  }

  // Minutes
  await req('POST', `/meetings/${meetingId}/minutes`, {
    summary: 'The committee thoroughly reviewed Q1 performance and noted 100% budget adherence across all accounts.',
    discussion_notes: 'Action item: Organize recruitment drive and finalize hackathon sponsorship.',
  }, token);
  console.log('   Recorded meeting minutes and official discussion record.');
  console.log('✅ Meeting lifecycle verified.\n');

  // 5. Test Decision Tracking & Action Items Pipeline
  console.log('[5/10] Testing Decision Tracking (/decisions)...');
  const decisionRes = await req('POST', '/decisions', {
    title: 'Adopt Modern Portfolio Risk Parity Strategy',
    description: 'Allocate 60% equities, 25% fixed income, 15% liquid reserves across all active sub-funds.',
    decision_type: 'GOVERNANCE',
    meeting_id: meetingId,
    responsible_person_id: adminProfile.id,
    decision_date: '2026-09-07',
    effective_date: '2026-10-31',
    status: 'PROPOSED',
  }, token);
  const decisionId = decisionRes.data.id;
  console.log(`   Proposed decision: "${decisionRes.data.title}" (ID: ${decisionId})`);

  // Update decision to APPROVED
  const approvedDecision = await req('PATCH', `/decisions/${decisionId}/status`, {
    status: 'APPROVED',
  }, token);
  console.log(`   Updated decision status: ${approvedDecision.data.status}`);

  // Pipeline: Convert Decision to Action Item (Task)
  const actionTaskRes = await req('POST', `/decisions/${decisionId}/create-action-item`, {
    title: 'Execute Portfolio Rebalancing per Risk Parity Policy',
    description: 'Rebalance active bank and broker accounts according to approved 60/25/15 ratio.',
    assigned_to: adminProfile.id,
    due_date: '2026-10-15',
    priority: 'HIGH',
  }, token);
  const actionTaskId = actionTaskRes.data.id;
  console.log(`   Generated Action Item Task from Decision: "${actionTaskRes.data.title}" (ID: ${actionTaskId})`);
  console.log('✅ Decision tracking & automated action item generation verified.\n');

  // 6. Test Task Management
  console.log('[6/10] Testing Task Management (/tasks)...');
  const taskDetail = await req('GET', `/tasks/${actionTaskId}`, undefined, token);
  console.log(`   Task: "${taskDetail.data.title}", Status: ${taskDetail.data.status}, Priority: ${taskDetail.data.priority}`);

  // Update task status
  const updatedTask = await req('PATCH', `/tasks/${actionTaskId}/status`, {
    status: 'IN_PROGRESS',
  }, token);
  console.log(`   Task transitioned to status: ${updatedTask.data.status}`);

  // Add comment
  const commentRes = await req('POST', `/tasks/${actionTaskId}/comments`, {
    comment: 'Broker account access confirmed. Ready to execute tranche 1 by Thursday.',
  }, token);
  console.log(`   Added task comment: "${commentRes.data.comment}"`);
  console.log('✅ Task management & collaboration verified.\n');

  // 7. Test Club Asset Management
  console.log('[7/10] Testing Club Asset Management (/assets)...');
  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  const assetTag = `DIU-PRJ-${randomSuffix}`;
  const assetRes = await req('POST', '/assets', {
    asset_code: assetTag,
    asset_name: 'Epson 4K Ultra HD Presentation Projector',
    category: 'ELECTRONICS',
    purchase_date: '2026-02-15',
    purchase_cost: 65000,
    current_condition: 'EXCELLENT',
    status: 'AVAILABLE',
    location: 'DIU Investment Club Office Room 304',
    description: 'High-definition laser projector for financial seminars, pitch decks, and investor meetings.',
  }, token);
  const assetId = assetRes.data.id;
  console.log(`   Created asset: ${assetRes.data.asset_name} [${assetRes.data.asset_code}] (ID: ${assetId})`);

  // Assign asset
  const assignRes = await req('POST', `/assets/${assetId}/assign`, {
    assigned_to: adminProfile.id,
    assignment_date: '2026-09-07',
    expected_return_date: '2026-09-20',
    condition_on_assignment: 'EXCELLENT',
    notes: 'Preparation for National Finance Hackathon presentations',
  }, token);
  console.log(`   Assigned asset to admin profile: ${adminProfile.full_name}`);

  // Log maintenance
  const maintRes = await req('POST', `/assets/${assetId}/maintenance`, {
    maintenance_date: '2026-09-07',
    description: 'Filter cleaning, lens calibration, and firmware upgrade to v2.4.',
    cost: 1500,
    vendor: 'Authorized Epson BD Service Lab',
    status: 'COMPLETED',
  }, token);
  console.log(`   Logged maintenance: ${maintRes.data.description}, Cost: ৳${maintRes.data.cost}`);
  console.log('✅ Asset management, assignment tracking, and maintenance verified.\n');

  // 8. Test Notification Center
  console.log('[8/10] Testing Notification Center (/notifications)...');
  const notifList = await req('GET', '/notifications', undefined, token);
  console.log(`   Notifications fetched: ${notifList.data.length}, Unread count: ${notifList.unread_count}`);

  const notifPrefs = await req('GET', '/notifications/preferences', undefined, token);
  console.log(`   Notification preferences: Task Assigned=${notifPrefs.data.task_assigned}, Meeting Reminders=${notifPrefs.data.meeting_reminders}`);

  // Test mark all as read
  await req('PATCH', '/notifications/mark-all-read', {}, token);
  console.log('   Marked all notifications as read.');
  console.log('✅ Notification Center verified.\n');

  // 9. Test Operations Summary
  console.log('[9/10] Testing Central Operations & Governance Summary (/operations/summary)...');
  const summaryRes = await req('GET', '/operations/summary', undefined, token);
  const s = summaryRes.data;
  console.log(`   Upcoming Meetings Count:    ${s.upcoming_meetings_count}`);
  console.log(`   Pending Decisions Count:     ${s.pending_decisions_count}`);
  console.log(`   Active Tasks Count:          ${s.active_tasks_count}`);
  console.log(`   Overdue Tasks Count:         ${s.overdue_tasks_count}`);
  console.log(`   Total Documents Count:       ${s.total_documents_count}`);
  console.log(`   Total Assets Count:          ${s.total_assets_count}`);
  console.log(`   Assets In Use Count:         ${s.assets_in_use_count}`);
  console.log(`   Active Committee:            ${s.active_committee_name || 'N/A'}`);
  console.log(`   Recent Activity Items:       ${s.recent_activity.length}`);
  console.log('✅ Operations Executive Summary verified.\n');

  // 10. Audit Logging Verification
  console.log('[10/10] Verifying Audit Trail Integrity for Phase 8...');
  console.log(`   Audit logs recorded for governance actions: ${s.recent_activity.length} entries shown in summary.`);
  for (const act of s.recent_activity.slice(0, 5)) {
    console.log(`   - [${act.module.toUpperCase()}] ${act.action} by ${act.user_name} at ${act.created_at}`);
  }
  console.log('✅ Audit trail verification complete.\n');

  console.log('=============================================================================');
  console.log('🎉 ALL 10 PHASE 8 BACKEND GOVERNANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('=============================================================================');
}

runPhase8Tests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
