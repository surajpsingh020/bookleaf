import React, { useState, useEffect } from 'react';
import { Book, Ticket } from '../../types';
import { api } from '../../services/api';
import { NewTicketModal } from './NewTicketModal';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  Send,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

interface AuthorDashboardProps {
  realtimeTicketUpdate?: any;
}

export const AuthorDashboard: React.FC<AuthorDashboardProps> = ({ realtimeTicketUpdate }) => {
  const [catalog, setCatalog] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchData = async () => {
    try {
      const [catData, tktData] = await Promise.all([
        api.getAuthorBooks(),
        api.getAuthorTickets(),
      ]);
      setCatalog(catData);
      setTickets(tktData);

      // Keep active ticket in sync if selected
      if (selectedTicket) {
        const found = tktData.find((t) => t.id === selectedTicket.id);
        if (found) setSelectedTicket(found);
      }
    } catch (err) {
      console.error('Failed to load author data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time update handler: When SSE delivers a ticket update or new message
  useEffect(() => {
    if (!realtimeTicketUpdate) return;

    setTickets((prev) => {
      const index = prev.findIndex(
        (t) => t.id === realtimeTicketUpdate.id || t.ticketNumber === realtimeTicketUpdate.ticketNumber
      );
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = realtimeTicketUpdate;
        return updated;
      } else {
        return [realtimeTicketUpdate, ...prev];
      }
    });

    if (selectedTicket && selectedTicket.id === realtimeTicketUpdate.id) {
      setSelectedTicket(realtimeTicketUpdate);
    }
  }, [realtimeTicketUpdate]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      await api.sendAuthorMessage(selectedTicket.id, replyText.trim());
      setReplyText('');
      // Refetch ticket thread
      const updated = await api.getAuthorTicketById(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const summary = catalog?.summary || {
    totalBooks: 0,
    totalCopiesSold: 0,
    totalRoyaltyEarned: 0,
    totalRoyaltyPaid: 0,
    totalRoyaltyPending: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>BookLeaf Verified Author</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {catalog?.author?.name}
            </h1>
            <p className="mt-1 text-sm text-emerald-100 max-w-xl">
              Track your publication milestones, sales performance, quarterly royalty disbursements, and contact support.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-semibold text-xs shadow-md hover:bg-emerald-50 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 text-emerald-600" />
              <span>Submit Support Query</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Titles</span>
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.totalBooks}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across India & International</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Copies Sold</span>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.totalCopiesSold.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-500 mt-1">Amazon, Flipkart & BookLeaf Store</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Royalty Earned</span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{summary.totalRoyaltyEarned.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">80% Net Profit Share</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Royalty Pending</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">₹{summary.totalRoyaltyPending.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.totalRoyaltyPending >= 1000 ? 'Eligible for next quarterly payout' : 'Rolls over (min ₹1,000 threshold)'}
          </p>
        </div>
      </div>

      {/* Section 1: My Books Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Books</h2>
            <p className="text-xs text-slate-500">Full catalog status, retail channels, and royalty breakdown</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {catalog?.books?.length || 0} Titles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Book Title & ISBN</th>
                <th className="px-4 py-3.5">Genre & Status</th>
                <th className="px-4 py-3.5">MRP / Share</th>
                <th className="px-4 py-3.5 text-center">Copies Sold</th>
                <th className="px-4 py-3.5">Royalty Earned</th>
                <th className="px-4 py-3.5">Paid vs Pending</th>
                <th className="px-6 py-3.5">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {catalog?.books?.map((book: Book) => {
                const inProduction = book.status.includes('In Production');
                return (
                  <tr key={book.bookId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{book.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{book.isbn}</p>
                      {book.publicationDate && (
                        <p className="text-[10px] text-slate-400">
                          Pub: {new Date(book.publicationDate).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-800">{book.genre}</p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inProduction
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {book.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {inProduction ? (
                        <span className="text-slate-400 italic">Production phase</span>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900">₹{book.mrp}</p>
                          <p className="text-[10px] text-slate-500">₹{book.authorRoyaltyPerCopy}/copy</p>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-slate-900">
                      {book.totalCopiesSold.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {inProduction ? '—' : `₹${book.totalRoyaltyEarned.toLocaleString('en-IN')}`}
                    </td>

                    <td className="px-4 py-4">
                      {inProduction ? (
                        <span className="text-slate-400 italic">Pending release</span>
                      ) : (
                        <div>
                          <p className="text-emerald-700 font-medium">Paid: ₹{book.royaltyPaid.toLocaleString('en-IN')}</p>
                          <p className={book.royaltyPending > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                            Pending: ₹{book.royaltyPending.toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {book.availableOn && book.availableOn.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {book.availableOn.map((plat) => (
                            <span
                              key={plat}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                            >
                              {plat}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Channels pending release</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Support Tickets & Live Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Support Tickets</h2>
              <p className="text-xs text-slate-500">Real-time status tracking & responses</p>
            </div>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Ticket</span>
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>You have not raised any support queries yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {tickets
                .filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id || x.ticketNumber === t.ticketNumber) === idx)
                .map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-500">{t.ticketNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === 'Open'
                            ? 'bg-sky-100 text-sky-800'
                            : t.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{t.description}</p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{t.category}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Ticket Conversation Thread */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between min-h-[500px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              {/* Thread Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-700">{selectedTicket.ticketNumber}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                    {selectedTicket.book && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Referenced Title: <span className="font-medium text-slate-700">{selectedTicket.book.title}</span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedTicket.status === 'Open'
                        ? 'bg-sky-100 text-sky-800'
                        : selectedTicket.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedTicket.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Messages Timeline */}
                <div className="py-4 space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {/* Original Author Query */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">You (Original Query)</span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line">{selectedTicket.description}</p>
                  </div>

                  {/* Admin and Author Replies */}
                  {selectedTicket.messages?.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-3.5 border ${
                          isAdmin
                            ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={`font-semibold ${isAdmin ? 'text-emerald-800' : 'text-slate-800'}`}>
                            {isAdmin ? 'BookLeaf Support Operations' : 'You'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-line">{msg.messageText}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a follow-up response or question..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>{sendingReply ? 'Sending...' : 'Reply'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No ticket selected</p>
              <p className="text-xs text-slate-400">Select any ticket from the left queue to view real-time conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        books={catalog?.books || []}
        isOpen={showNewTicketModal}
        onClose={() => setShowNewTicketModal(false)}
        onTicketCreated={(ticket) => {
          setTickets((prev) => {
            if (prev.some((t) => t.id === ticket.id || t.ticketNumber === ticket.ticketNumber)) {
              return prev;
            }
            return [ticket, ...prev];
          });
          setSelectedTicket(ticket);
        }}
      />
    </div>
  );
};
