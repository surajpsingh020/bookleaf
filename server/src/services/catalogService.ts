import { prisma } from '../db.js';

export class CatalogService {
  public async getAuthorCatalog(authorId: string) {
    const author = await prisma.author.findUnique({
      where: { authorId },
      include: {
        books: true
      }
    });

    if (!author) {
      throw new Error(`Author not found for id ${authorId}`);
    }

    // Format books and parse availableOn JSON array
    const formattedBooks = author.books.map((b) => {
      let platforms: string[] = [];
      try {
        platforms = JSON.parse(b.availableOn);
      } catch (e) {
        platforms = [];
      }

      return {
        ...b,
        availableOn: platforms
      };
    });

    // Compute aggregate summary metrics
    const totalCopiesSold = formattedBooks.reduce((sum, b) => sum + b.totalCopiesSold, 0);
    const totalRoyaltyEarned = formattedBooks.reduce((sum, b) => sum + b.totalRoyaltyEarned, 0);
    const totalRoyaltyPaid = formattedBooks.reduce((sum, b) => sum + b.royaltyPaid, 0);
    const totalRoyaltyPending = formattedBooks.reduce((sum, b) => sum + b.royaltyPending, 0);

    return {
      author: {
        authorId: author.authorId,
        name: author.name,
        email: author.email,
        phone: author.phone,
        city: author.city,
        joinedDate: author.joinedDate
      },
      summary: {
        totalBooks: formattedBooks.length,
        totalCopiesSold,
        totalRoyaltyEarned,
        totalRoyaltyPaid,
        totalRoyaltyPending
      },
      books: formattedBooks
    };
  }

  public async getAllAuthors() {
    return prisma.author.findMany({
      include: {
        books: true
      },
      orderBy: { name: 'asc' }
    });
  }
}

export const catalogService = new CatalogService();
