import { prisma } from '../server/src/db.js';
import { aiService } from '../server/src/services/aiService.js';
import { ticketService } from '../server/src/services/ticketService.js';
import { catalogService } from '../server/src/services/catalogService.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_jwt_secret_dev_key_2026_eval';

async function runEdgeCaseTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE EDGE CASE VERIFICATION SUITE');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Books in Production (Midnight in Mysore & Raising Roots)
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Books in Production Handling ---');
  const snehaCatalog = await catalogService.getAuthorCatalog('AUTH007');
  const prodBook = snehaCatalog.books.find((b) => b.bookId === 'BK013');
  assert(prodBook !== undefined, 'Author AUTH007 owns BK013 (Midnight in Mysore)');
  assert(
    prodBook?.status === 'In Production - Cover Design',
    'BK013 correctly marked as "In Production - Cover Design"'
  );
  assert(
    prodBook?.totalCopiesSold === 0 && prodBook?.royaltyPending === 0,
    'BK013 has 0 sales and 0 pending royalties'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Sub-Threshold Royalty Policy Handling (< ₹1,000 threshold)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Sub-Threshold Royalty (< ₹1,000) ---');
  const kavitaCatalog = await catalogService.getAuthorCatalog('AUTH009');
  assert(
    kavitaCatalog.summary.totalRoyaltyPending === 850,
    'Kavita Deshmukh has exactly ₹850 pending royalty (< ₹1,000 threshold)'
  );

  const subThresholdDraft = aiService.heuristicDraft(
    'Royalty & Payments',
    'Kavita Deshmukh',
    'The Nagpur Notebooks',
    { royaltyPending: 850 },
    'When will my ₹850 royalty be sent?'
  );
  assert(
    subThresholdDraft.includes('₹1,000') && subThresholdDraft.includes('80/20'),
    'AI Draft cites the ₹1,000 policy threshold and 80/20 split'
  );

  // --------------------------------------------------------------------------
  // TEST 3: AI Triage Auto-Classification Accuracy across Categories
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: AI Triage Classification Accuracy ---');
  const triage1 = aiService.heuristicClassify(
    'Amazon says unavailable',
    'My book is listed as currently unavailable on Amazon India'
  );
  assert(
    triage1.category === 'Distribution & Availability',
    'Classifies "Amazon unavailable" as Distribution & Availability'
  );

  const triage2 = aiService.heuristicClassify(
    'Pages misprinted in copy',
    'The author copies have blurry cover images and misaligned binding'
  );
  assert(
    triage2.category === 'Printing & Quality' && (triage2.priority === 'High' || triage2.priority === 'Critical'),
    'Classifies misprint defect as Printing & Quality with High/Critical priority'
  );

  const triage3 = aiService.heuristicClassify(
    'Unpaid royalties for 6 months',
    'I have not received payment for over 6 months now'
  );
  assert(
    triage3.category === 'Royalty & Payments' && triage3.priority === 'Critical',
    'Classifies overdue 6-month payment as Royalty & Payments with Critical priority'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Follow-up Query Context Adaptation (Sunday / Office Hours)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Dynamic Follow-up Handling (Sundays/Hours) ---');
  const sundayDraft = aiService.heuristicDraft(
    'General Inquiry',
    'Rohit Kapoor',
    null,
    null,
    'are you open on sundays?'
  );
  assert(
    sundayDraft.toLowerCase().includes('monday through friday') && sundayDraft.toLowerCase().includes('sunday'),
    'AI response dynamically addresses Sunday/office hour inquiries'
  );

  // --------------------------------------------------------------------------
  // TEST 5: Data Security & Internal Note Leak Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: RBAC & Internal Note Secrecy ---');
  // Find or create a ticket with both public reply and internal note
  const sampleTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: 'BL-TKT-1002' },
    include: { messages: true }
  });

  if (sampleTicket) {
    const authorView = await ticketService.getAuthorTicketById(sampleTicket.authorId, sampleTicket.id);
    const authorMessages = authorView?.messages || [];
    const hasInternalNote = authorMessages.some((m) => m.isInternalNote);
    assert(
      !hasInternalNote,
      'Internal notes (isInternalNote: true) are strictly excluded from Author queries'
    );

    const adminView = await ticketService.getAdminTicketById(sampleTicket.id);
    const adminMessages = adminView?.messages || [];
    const adminHasInternalNote = adminMessages.some((m) => m.isInternalNote);
    assert(
      adminHasInternalNote,
      'Internal notes ARE visible in Admin Operations view'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Author Access Isolation Guard
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Cross-Author Data Isolation Guard ---');
  // Priya (AUTH001) attempts to query ticket belonging to Sneha (AUTH007)
  const unauthorizedTicket = await ticketService.getAuthorTicketById('AUTH001', sampleTicket?.id || '');
  assert(
    unauthorizedTicket === null,
    'Author AUTH001 is denied access to ticket belonging to AUTH007'
  );

  console.log('\n========================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEdgeCaseTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
