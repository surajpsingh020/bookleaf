/**
 * BookLeaf Knowledge Base structured into modular chunks for token-cost optimization.
 * Instead of dumping the entire KB into prompts, the AI orchestrator dynamically
 * slices only the relevant policy module.
 */

export const KB_COMPANY_CORE = `
BOOKLEAF COMPANY OVERVIEW:
- BookLeaf Publishing is a leading self-publishing platform operating in India and the US, releasing 1,200+ titles monthly with a 22,000+ catalog.
- We offer publishing packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package with marketing add-ons).
- In-house printing facility and warehouse are in Delhi; external print partners include Repro India and Epitome Books.
- Authors are our creative partners, not customers to be deflected. Always communicate empathetically, take ownership, cite specific numbers/dates, and give clear resolution timelines.
`;

export const KB_ROYALTY_POLICY = `
ROYALTY POLICY:
- Royalty Split: 80/20 split (80% of net profit to the author, 20% to BookLeaf).
- Net Profit Formula: MRP minus printing cost, platform sales commission (Amazon/Flipkart), and shipping charges.
- Payout Schedule: Calculated quarterly and paid out within 45 days of the quarter ending.
- Minimum Payout Threshold: ₹1,000. If an author's accumulated pending royalties are below ₹1,000, they automatically roll over to the subsequent quarter.
- Payment Method: Direct bank transfer to the account linked in the author's dashboard.
- Author Dashboard shows complete breakdown: MRP, copies sold, royalty per copy, paid amount, and pending balance.
`;

export const KB_ISBN_POLICY = `
ISBN POLICY:
- Unique ISBN: Every book published through BookLeaf receives a unique 13-digit ISBN assigned by BookLeaf under BookLeaf's publisher imprint.
- Independent ISBNs: Authors wanting their own publisher imprint must acquire ISBNs independently.
- ISBN Errors: Any report of duplicate ISBNs, incorrect book linking on retail sites, or barcode errors is treated as HIGH/CRITICAL priority and immediately escalated to the production desk (48-hour SLA).
`;

export const KB_PRINTING_QUALITY = `
PRINTING & QUALITY POLICY:
- Facilities: Handled by Delhi in-house facility; overflow/special formats go to Repro India or Epitome Books.
- Standard Turnaround: 5–7 business days from order confirmation to dispatch.
- Defect Policy: In case of misprints, binding defects, damaged covers, or color inconsistencies, BookLeaf arranges a 100% FREE reprint after photo verification.
- Author Action: Author is requested to upload clear photos of defective copies for swift verification.
`;

export const KB_DISTRIBUTION_AVAILABILITY = `
DISTRIBUTION & AVAILABILITY POLICY:
- Retail Platforms: Amazon India, Flipkart, Amazon US, Amazon UK, and the direct BookLeaf Store.
- Listing Timeline: New book listings typically go live within 7–10 business days after production completion.
- "Currently Unavailable" on Amazon/Flipkart: Usually indicates a stock synchronization or distributor catalog feed delay. BookLeaf operations can trigger an expedited stock re-sync within 24–48 hours.
`;

export const KB_PRODUCTION_STAGES = `
PRODUCTION STAGES:
- Complete Lifecycle: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Email Updates: Authors receive automated notifications as their book completes each milestone.
- Common Bottlenecks: Delays most frequently occur during Cover Design (awaiting author feedback/approval) and Proofreading (author revision rounds).
- Tone on delays: Check actual production status honestly. Frame delays collaboratively with clear updated timelines; never assign blame.
`;

export const KB_SAMPLE_FEW_SHOTS = `
FEW-SHOT CALIBRATION EXAMPLES:
Q: "I published my book 4 months ago and still haven't received any royalty. What's going on?"
A: "Dear Author, I completely understand your concern and apologise for any anxiety caused. Royalties are calculated on a quarterly cycle and disbursed within 45 days of quarter end. Let me verify your linked bank account right away. Your pending royalty exceeds our ₹1,000 payout threshold, so I have escalated this to our accounts desk for immediate verification within 48 hours."

Q: "My royalty amount seems too low. I sold 200 copies but only received ₹3,000."
A: "Hello! We are committed to complete transparency regarding your earnings. Our 80/20 royalty split applies to net profit (MRP minus printing cost, distributor fees like Amazon/Flipkart commission, and shipping charges). I would be delighted to share a line-by-line breakdown for all 200 copies sold so you can review each transaction."

Q: "I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned."
A: "Hello, I am very sorry to hear that your author copies did not arrive in pristine condition. That is certainly not the quality standard we hold ourselves to. Could you kindly share a couple of photos showing the misaligned pages? As soon as we verify them, we will immediately initiate a complimentary reprint (5–7 business days turnaround) at zero cost to you."
`;

/**
 * Returns targeted context chunk for a given category to minimize prompt token usage.
 */
export function getContextForCategory(category: string): string {
  switch (category) {
    case 'Royalty & Payments':
      return `${KB_COMPANY_CORE}\n${KB_ROYALTY_POLICY}`;
    case 'ISBN & Metadata Issues':
      return `${KB_COMPANY_CORE}\n${KB_ISBN_POLICY}`;
    case 'Printing & Quality':
      return `${KB_COMPANY_CORE}\n${KB_PRINTING_QUALITY}`;
    case 'Distribution & Availability':
      return `${KB_COMPANY_CORE}\n${KB_DISTRIBUTION_AVAILABILITY}`;
    case 'Book Status & Production Updates':
      return `${KB_COMPANY_CORE}\n${KB_PRODUCTION_STAGES}`;
    default:
      return `${KB_COMPANY_CORE}\n${KB_ROYALTY_POLICY}\n${KB_PRODUCTION_STAGES}`;
  }
}
