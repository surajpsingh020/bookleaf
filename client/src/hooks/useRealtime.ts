import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export interface RealtimeEvent {
  type: 'ticket_created' | 'ticket_updated' | 'new_message' | 'connected';
  data: any;
  timestamp: string;
}

export function useRealtime(onEvent?: (event: RealtimeEvent) => void) {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const sseUrl = `/api/realtime/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = (err) => {
      console.warn('SSE stream disconnected, browser will auto-reconnect:', err);
      setIsConnected(false);
    };

    const handleEvent = (type: RealtimeEvent['type']) => (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const eventPayload: RealtimeEvent = {
          type,
          data: parsed,
          timestamp: new Date().toISOString(),
        };
        onEvent?.(eventPayload);
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    es.addEventListener('connected', handleEvent('connected'));
    es.addEventListener('ticket_created', handleEvent('ticket_created'));
    es.addEventListener('ticket_updated', handleEvent('ticket_updated'));
    es.addEventListener('new_message', handleEvent('new_message'));

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [token, user]);

  return { isConnected };
}
