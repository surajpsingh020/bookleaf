import { Response } from 'express';

interface ConnectedClient {
  id: string;
  userId: string;
  role: 'author' | 'admin';
  authorId?: string | null;
  res: Response;
}

class SseService {
  private clients: ConnectedClient[] = [];

  constructor() {
    // Send keep-alive comments every 25 seconds to keep HTTP connections alive
    setInterval(() => {
      this.sendKeepAlive();
    }, 25000);
  }

  public addClient(client: ConnectedClient) {
    this.clients.push(client);

    // Initial greeting event
    this.sendEventToClient(client, 'connected', {
      message: 'Connected to BookLeaf Real-Time Event Stream',
      timestamp: new Date().toISOString()
    });

    client.res.on('close', () => {
      this.removeClient(client.id);
    });
  }

  public removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  public broadcastToAdmins(event: string, payload: any) {
    const adminClients = this.clients.filter((c) => c.role === 'admin');
    for (const client of adminClients) {
      this.sendEventToClient(client, event, payload);
    }
  }

  public sendToAuthor(authorId: string, event: string, payload: any) {
    const authorClients = this.clients.filter(
      (c) => c.role === 'author' && c.authorId === authorId
    );
    for (const client of authorClients) {
      this.sendEventToClient(client, event, payload);
    }
  }

  public broadcastTicketUpdate(ticket: any, eventType: string = 'ticket_updated') {
    // Send to author who owns the ticket
    if (ticket.authorId) {
      this.sendToAuthor(ticket.authorId, eventType, ticket);
    }
    // Also notify all admins so their queue stays live
    this.broadcastToAdmins(eventType, ticket);
  }

  private sendEventToClient(client: ConnectedClient, event: string, payload: any) {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      this.removeClient(client.id);
    }
  }

  private sendKeepAlive() {
    for (const client of this.clients) {
      try {
        client.res.write(': keep-alive\n\n');
      } catch (err) {
        this.removeClient(client.id);
      }
    }
  }
}

export const sseService = new SseService();
