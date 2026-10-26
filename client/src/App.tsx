import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { AuthorDashboard } from './components/author/AuthorDashboard';
import { AdminConsole } from './components/admin/AdminConsole';
import { useRealtime, RealtimeEvent } from './hooks/useRealtime';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [latestRealtimeTicket, setLatestRealtimeTicket] = useState<any>(null);

  const { isConnected } = useRealtime((event: RealtimeEvent) => {
    if (event.type === 'ticket_created' || event.type === 'ticket_updated' || event.type === 'new_message') {
      setLatestRealtimeTicket(event.data);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Loading BookLeaf Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar isConnected={isConnected} />
      <main className="flex-1">
        {user.role === 'admin' ? (
          <AdminConsole realtimeTicketUpdate={latestRealtimeTicket} />
        ) : (
          <AuthorDashboard realtimeTicketUpdate={latestRealtimeTicket} />
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>BookLeaf Publishing &copy; {new Date().getFullYear()} &bull; Author Support & Communication Portal</p>
      </footer>
    </div>
  );
};

export default App;
