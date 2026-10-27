import React, { useState, useEffect } from 'react';
import { Ticket } from '../../types';
import { api } from '../../services/api';
import {
  Inbox,
  Filter,
  Search,
  Sparkles,
  Send,
  Lock,
  UserCheck,
  RotateCw,
  BookOpen
} from 'lucide-react';

interface AdminConsoleProps {
  realtimeTicketUpdate?: any;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ realtimeTicketUpdate }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'response' | 'notes'>('response');

  // Response & Note states
  const [editableDraft, setEditableDraft] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState(false);
  const [draftSuccessNotice, setDraftSuccessNotice] = useState(false);

  const fetchTicketsAndStats = async () => {
    try {
      const [tktData, statData] = await Promise.all([
        api.getAdminTickets({
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          search: searchQuery,
        }),
        api.getAdminStats(),
      ]);

      setTickets(tktData);
      setStats(statData);

      if (selectedTicket) {
        const found = tktData.find((t) => t.id === selectedTicket.id);
        if (found) {
          setSelectedTicket(found);
          if (!editableDraft) {
            setEditableDraft(found.aiDraftResponse || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      // Data fetch complete
    }
  };

  useEffect(() => {
    fetchTicketsAndStats();
  }, [statusFilter, priorityFilter, categoryFilter]);

  // Real-time update handler: When SSE delivers a ticket update or new message
  useEffect(() => {
    if (!realtimeTicketUpdate) return;

    setTickets((prev) => {
      const index = prev.findIndex((t) => t.id === realtimeTicketUpdate.id);
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
      if (realtimeTicketUpdate.aiDraftResponse) {
        setEditableDraft(realtimeTicketUpdate.aiDraftResponse);
      }
    }
  }, [realtimeTicketUpdate]);

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditableDraft(ticket.aiDraftResponse || '');
    setAssignedAgent(ticket.assignedTo || '');
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !editableDraft.trim()) return;

    setSubmittingAction(true);
    try {
      await api.sendAdminMessage(selectedTicket.id, editableDraft.trim(), false);
      const updated = await api.getAdminTicketById(selectedTicket.id);
      setSelectedTicket(updated);
      setEditableDraft('');
      fetchTicketsAndStats();
    } catch (err) {
      console.error('Failed to send admin response:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedTicket || !internalNote.trim()) return;

    setSubmittingAction(true);
    try {
      await api.sendAdminMessage(selectedTicket.id, internalNote.trim(), true);
      const updated = await api.getAdminTicketById(selectedTicket.id);
      setSelectedTicket(updated);
      setInternalNote('');
    } catch (err) {
      console.error('Failed to add internal note:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    try {
      const updated = await api.updateAdminTicket(selectedTicket.id, { status: newStatus });
      setSelectedTicket(updated);
      fetchTicketsAndStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleOverrideCategory = async (newCategory: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateAdminTicket(selectedTicket.id, { category: newCategory });
      setSelectedTicket(updated);
      fetchTicketsAndStats();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleOverridePriority = async (newPriority: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateAdminTicket(selectedTicket.id, { priority: newPriority });
      setSelectedTicket(updated);
      fetchTicketsAndStats();
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateAdminTicket(selectedTicket.id, {
        assignedTo: assignedAgent.trim() || null,
      });
      setSelectedTicket(updated);
      fetchTicketsAndStats();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!selectedTicket) return;
    setRegeneratingDraft(true);
    try {
      const updated = await api.regenerateAiDraft(selectedTicket.id);
      setSelectedTicket(updated);
      setEditableDraft(updated.aiDraftResponse || '');
      setDraftSuccessNotice(true);
      setTimeout(() => setDraftSuccessNotice(false), 4000);
    } catch (err) {
      console.error('Failed to regenerate draft:', err);
    } finally {
      setRegeneratingDraft(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Operations Header & KPIs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 text-slate-200 text-xs font-semibold mb-2">
            <Inbox className="h-3.5 w-3.5 text-emerald-400" />
            <span>BookLeaf Operations Command Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Support Triage & Response Queue</h1>
          <p className="text-xs text-slate-500">AI-assisted author inquiry resolution with human-in-the-loop governance</p>
        </div>

        {/* Stats Pills */}
        {stats && (
          <div className="flex items-center gap-3">
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Open</span>
              <p className="text-base font-bold text-sky-600">{stats.open}</p>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">In Progress</span>
              <p className="text-base font-bold text-amber-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Critical</span>
              <p className="text-base font-bold text-rose-600">{stats.critical}</p>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Resolved</span>
              <p className="text-base font-bold text-emerald-600">{stats.resolved}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer max-w-[160px]"
            >
              <option value="All">All Categories</option>
              <option value="Royalty & Payments">Royalty & Payments</option>
              <option value="ISBN & Metadata Issues">ISBN & Metadata</option>
              <option value="Printing & Quality">Printing & Quality</option>
              <option value="Distribution & Availability">Distribution</option>
              <option value="Book Status & Production Updates">Production Updates</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search author, ticket #, subject..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Trigger debounced search or direct fetch
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchTicketsAndStats();
            }}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Main Split: Ticket Queue Table (Left) + Ticket Inspector & AI Studio (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket Queue List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[750px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Inbound Queue ({tickets.length})</h2>
              <p className="text-[11px] text-slate-400">Sorted by urgency & arrival timestamp</p>
            </div>
            <button
              onClick={fetchTicketsAndStats}
              title="Refresh queue"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No tickets match the selected filters.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const isCritical = t.priority === 'Critical';
                const isHigh = t.priority === 'High';

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`p-4 cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : isCritical
                        ? 'hover:bg-rose-50/40 border-l-4 border-rose-500'
                        : isHigh
                        ? 'hover:bg-amber-50/40 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-600">{t.ticketNumber}</span>
                        {isCritical && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white animate-pulse">
                            CRITICAL
                          </span>
                        )}
                      </div>
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
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      By: <span className="font-semibold text-slate-700">{t.author?.name}</span> ({t.author?.email})
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {t.category}
                      </span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Ticket Inspector & AI Assistant (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[750px] overflow-hidden">
          {selectedTicket ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header with Ticket Details & Overrides */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-emerald-700">{selectedTicket.ticketNumber}</span>
                      <span className="text-xs font-medium text-slate-500">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.subject}</h2>
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Ticket Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* AI Triage Badges & Manual Overrides */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70 text-xs">
                  {/* Category Override */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                      <span>CATEGORY (AI)</span>
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                    </div>
                    <select
                      value={selectedTicket.category}
                      onChange={(e) => handleOverrideCategory(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                    >
                      <option value="Royalty & Payments">Royalty & Payments</option>
                      <option value="ISBN & Metadata Issues">ISBN & Metadata</option>
                      <option value="Printing & Quality">Printing & Quality</option>
                      <option value="Distribution & Availability">Distribution</option>
                      <option value="Book Status & Production Updates">Production Updates</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  {/* Priority Override */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                      <span>PRIORITY (AI)</span>
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                    </div>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleOverridePriority(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                      <span>ASSIGNED TO</span>
                      <UserCheck className="h-3 w-3 text-slate-400" />
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="e.g. Rohan (Ops)"
                        value={assignedAgent}
                        onChange={(e) => setAssignedAgent(e.target.value)}
                        onBlur={handleAssignAgent}
                        className="w-full text-xs text-slate-800 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Author & Book Context Pill Bar */}
                <div className="p-2.5 bg-slate-100/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{selectedTicket.author?.name}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500">{selectedTicket.author?.email}</span>
                  </div>

                  {selectedTicket.book ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{selectedTicket.book.title} ({selectedTicket.book.status})</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">General / Account Level</span>
                  )}
                </div>
              </div>

              {/* Middle Section: Query & Conversation Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {/* Original Query */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-bold text-slate-800">Author Inquiry</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-line">{selectedTicket.description}</p>
                </div>

                {/* Conversation & Internal Notes */}
                {selectedTicket.messages?.map((msg) => {
                  if (msg.isInternalNote) {
                    return (
                      <div
                        key={msg.id}
                        className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 mb-1">
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            <span>INTERNAL OPS NOTE (Hidden from Author)</span>
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs whitespace-pre-line">{msg.messageText}</p>
                        <p className="text-[10px] text-amber-700 mt-1">Logged by: {msg.senderName}</p>
                      </div>
                    );
                  }

                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl border ${
                        isAdmin
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-800">
                          {isAdmin ? `BookLeaf Desk (${msg.senderName})` : selectedTicket.author?.name}
                        </span>
                        <span className="text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-line">{msg.messageText}</p>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Section: AI Draft Response vs Internal Notes */}
              <div className="border-t border-slate-200 bg-white p-4 space-y-3">
                {/* Tabs */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 border-b border-slate-100">
                    <button
                      onClick={() => setActiveTab('response')}
                      className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                        activeTab === 'response'
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>AI Draft Response</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                        activeTab === 'notes'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Private Internal Note</span>
                    </button>
                  </div>

                  {activeTab === 'response' && (
                    <div className="flex items-center gap-2.5">
                      {draftSuccessNotice && (
                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Draft refreshed with latest question!
                        </span>
                      )}
                      <button
                        onClick={handleRegenerateDraft}
                        disabled={regeneratingDraft}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                      >
                        <RotateCw className={`h-3 w-3 ${regeneratingDraft ? 'animate-spin' : ''}`} />
                        <span>{regeneratingDraft ? 'Drafting...' : 'Re-Draft with AI'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tab 1: AI Draft Editor */}
                {activeTab === 'response' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={editableDraft}
                      onChange={(e) => setEditableDraft(e.target.value)}
                      placeholder="Review or edit the AI-generated draft response..."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed transition"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400">
                        * Grounded in BookLeaf Knowledge Base & author data. Review before sending.
                      </p>
                      <button
                        onClick={handleSendResponse}
                        disabled={submittingAction || !editableDraft.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{submittingAction ? 'Sending...' : 'Send to Author'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Tab 2: Internal Notes */
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Write an internal operational note (e.g. 'Triggered manual reprint on Job #4412 with Repro India')..."
                      className="w-full p-3 text-xs bg-amber-50/40 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-700 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Strictly confidential: invisible to author.
                      </span>
                      <button
                        onClick={handleAddInternalNote}
                        disabled={submittingAction || !internalNote.trim()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Save Internal Note</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
              <Inbox className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Select a Ticket to Begin Triage</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                View author book status, inspect AI auto-classification and priority, and review the grounded draft response before sending.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
