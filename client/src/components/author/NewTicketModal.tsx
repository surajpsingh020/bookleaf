import React, { useState } from 'react';
import { Book } from '../../types';
import { api } from '../../services/api';
import { X, Send, Paperclip, AlertCircle, Sparkles } from 'lucide-react';

interface NewTicketModalProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: (ticket: any) => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  books,
  isOpen,
  onClose,
  onTicketCreated,
}) => {
  const [bookId, setBookId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const ticket = await api.createTicket({
        bookId: bookId ? bookId : null,
        subject: subject.trim(),
        description: description.trim(),
      });

      onTicketCreated(ticket);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Submit a Support Query</h3>
            <p className="text-xs text-slate-500">BookLeaf Author Care Desk</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Associated Book Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Book Related to Query
            </label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            >
              <option value="">General / Account Level (Not Book Specific)</option>
              {books.map((b) => (
                <option key={b.bookId} value={b.bookId}>
                  {b.title} ({b.status})
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Line <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Inquiring about Q3 royalty payout status"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Please provide full details (dates, order ids, copies, or specific questions)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          {/* File Attachment UI (Assignment required: UI only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attach Supporting Documents / Photos <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 text-center cursor-pointer transition">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <Paperclip className="h-5 w-5 text-slate-400 mb-1" />
                {selectedFile ? (
                  <span className="text-xs font-medium text-emerald-700">{selectedFile.name} (Ready)</span>
                ) : (
                  <>
                    <span className="text-xs text-slate-600 font-medium">Click to attach photos of defects or contracts</span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10MB</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Your ticket will be automatically classified by our AI triage engine to route directly to the responsible team.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
