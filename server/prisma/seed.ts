import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BookLeaf database seeding...');

  // 1. Locate sample data file
  const possiblePaths = [
    path.join(__dirname, '../../bookleaf_sample_data.json'),
    path.join(process.cwd(), 'bookleaf_sample_data.json'),
    path.join(process.cwd(), '../bookleaf_sample_data.json')
  ];

  let rawData = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      rawData = fs.readFileSync(p, 'utf-8');
      console.log(`📖 Loaded sample data from: ${p}`);
      break;
    }
  }

  if (!rawData) {
    throw new Error('Could not find bookleaf_sample_data.json in root or server directory');
  }

  const sampleData = JSON.parse(rawData);
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 2. Create Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bookleafpub.com' },
    update: {},
    create: {
      email: 'admin@bookleafpub.com',
      passwordHash: adminPasswordHash,
      role: 'admin'
    }
  });
  console.log(`👤 Admin user seeded: ${adminUser.email} (password: admin123)`);

  // 3. Seed Authors and Books
  let authorCount = 0;
  let bookCount = 0;

  for (const author of sampleData.authors) {
    // Upsert Author
    const dbAuthor = await prisma.author.upsert({
      where: { authorId: author.author_id },
      update: {
        name: author.name,
        email: author.email,
        phone: author.phone,
        city: author.city,
        joinedDate: new Date(author.joined_date)
      },
      create: {
        authorId: author.author_id,
        name: author.name,
        email: author.email,
        phone: author.phone,
        city: author.city,
        joinedDate: new Date(author.joined_date)
      }
    });

    // Upsert Author User account
    await prisma.user.upsert({
      where: { email: author.email },
      update: {
        authorId: author.author_id,
        role: 'author'
      },
      create: {
        email: author.email,
        passwordHash: defaultPasswordHash,
        role: 'author',
        authorId: author.author_id
      }
    });
    authorCount++;

    // Upsert Books
    for (const book of author.books) {
      await prisma.book.upsert({
        where: { bookId: book.book_id },
        update: {
          authorId: author.author_id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publication_date ? new Date(book.publication_date) : null,
          status: book.status,
          mrp: book.mrp !== null ? Number(book.mrp) : null,
          authorRoyaltyPerCopy: book.author_royalty_per_copy !== null ? Number(book.author_royalty_per_copy) : null,
          totalCopiesSold: book.total_copies_sold || 0,
          totalRoyaltyEarned: Number(book.total_royalty_earned) || 0,
          royaltyPaid: Number(book.royalty_paid) || 0,
          royaltyPending: Number(book.royalty_pending) || 0,
          lastRoyaltyPayoutDate: book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
          printPartner: book.print_partner || null,
          availableOn: JSON.stringify(book.available_on || [])
        },
        create: {
          bookId: book.book_id,
          authorId: author.author_id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publication_date ? new Date(book.publication_date) : null,
          status: book.status,
          mrp: book.mrp !== null ? Number(book.mrp) : null,
          authorRoyaltyPerCopy: book.author_royalty_per_copy !== null ? Number(book.author_royalty_per_copy) : null,
          totalCopiesSold: book.total_copies_sold || 0,
          totalRoyaltyEarned: Number(book.total_royalty_earned) || 0,
          royaltyPaid: Number(book.royalty_paid) || 0,
          royaltyPending: Number(book.royalty_pending) || 0,
          lastRoyaltyPayoutDate: book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
          printPartner: book.print_partner || null,
          availableOn: JSON.stringify(book.available_on || [])
        }
      });
      bookCount++;
    }
  }

  console.log(`📚 Seeded ${authorCount} authors and ${bookCount} books successfully.`);

  // 4. Pre-seed realistic sample tickets for testing
  const existingTickets = await prisma.ticket.count();
  if (existingTickets === 0) {
    console.log('🎫 Pre-seeding initial realistic support tickets...');

    // Ticket 1: Royalty Query from Priya Sharma (AUTH001, BK001)
    const tkt1 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-TKT-1001',
        authorId: 'AUTH001',
        bookId: 'BK001',
        subject: 'Pending royalty payout inquiry for Q3',
        description: 'Hello BookLeaf Team, I see that 342 copies of Whispers of the Ganges have been sold, with ₹3,570 pending royalty. Could you please confirm when this will be credited?',
        status: 'Open',
        category: 'Royalty & Payments',
        priority: 'Medium',
        aiClassification: 'Royalty & Payments',
        aiPriority: 'Medium',
        aiDraftResponse: 'Hello Priya,\n\nThank you for reaching out to us. We understand how important timely payouts are for your creative journey.\n\nAs per BookLeaf policy, royalties are calculated quarterly and settled within 45 days of the quarter ending. For your book "Whispers of the Ganges", your pending balance of ₹3,570 exceeds our ₹1,000 threshold and is scheduled for processing in our next payment batch on November 15th via bank transfer. We will send you a confirmation transaction ID once dispatched.\n\nWarm regards,\nBookLeaf Author Support Team'
      }
    });

    // Ticket 2: Book Status Query from Sneha Kulkarni (AUTH007, BK013)
    const tkt2 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-TKT-1002',
        authorId: 'AUTH007',
        bookId: 'BK013',
        subject: 'Update on Midnight in Mysore cover design timeline',
        description: 'Hi team, it has been over two weeks since I submitted the brief for Midnight in Mysore. The status still shows "In Production - Cover Design". When can I expect the first proofs?',
        status: 'In Progress',
        category: 'Book Status & Production Updates',
        priority: 'Medium',
        aiClassification: 'Book Status & Production Updates',
        aiPriority: 'Medium',
        assignedTo: 'Admin Operations',
        aiDraftResponse: 'Dear Sneha,\n\nThank you for checking in on "Midnight in Mysore". We are excited about bringing your thriller to life!\n\nOur design team has finished the initial typography and is currently refining the front cover illustrations. You will receive the first set of 2 design concepts directly in your dashboard within 48 hours for your review and approval.\n\nWarm regards,\nBookLeaf Production Desk'
      }
    });

    // Add conversation history to Ticket 2
    await prisma.ticketMessage.create({
      data: {
        ticketId: tkt2.id,
        senderRole: 'admin',
        senderName: 'Admin Operations',
        messageText: 'Hello Sneha, I have personally checked in with our Senior Art Director. The draft concepts are 90% ready and will be sent to your email by tomorrow evening.',
        isInternalNote: false
      }
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: tkt2.id,
        senderRole: 'admin',
        senderName: 'Admin Operations',
        messageText: 'Internal note: Cover designer was on leave; re-assigned to Priya M. on Oct 26.',
        isInternalNote: true
      }
    });

    // Ticket 3: Printing Issue from Vikram Joshi (AUTH004, BK006)
    await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-TKT-1003',
        authorId: 'AUTH004',
        bookId: 'BK006',
        subject: 'Page alignment defect in latest author copy batch',
        description: 'I received 10 author copies of "Debugging Life" yesterday. The margins on chapters 3 and 4 are cut off and binding feels loose.',
        status: 'Open',
        category: 'Printing & Quality',
        priority: 'High',
        aiClassification: 'Printing & Quality',
        aiPriority: 'High',
        aiDraftResponse: 'Hello Vikram,\n\nWe sincerely apologise for the substandard print quality on your author copies. That certainly does not meet BookLeaf standards.\n\nCould you please upload or share a couple of photos showing the misaligned pages? Once our production team verifies this, we will immediately schedule a complimentary reprint run (turnaround: 5-7 business days) at zero cost to you.\n\nWarm regards,\nBookLeaf Operations Desk'
      }
    });

    console.log('✅ Pre-seeded 3 realistic sample tickets with threads and internal notes.');
  }

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
