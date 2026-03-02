// lib/sse/sseManager.ts
// Authoritative singleton for all SSE connections.
// NOTE: SSE connections are in-memory. PM2 must run in single-process mode (not cluster). (ADR-0006)
//
// Both MessengerService and NotificationService use this module to push events.
// Event wire format:
//   event: <name>\ndata: <json>\n\n
//   event: ping\ndata: {}\n\n

type Controller = ReadableStreamDefaultController;

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

class SseManagerSingleton {
  private connections = new Map<string, Controller>();

  /** Register a user connection. Closes any previous connection for the same user. */
  subscribe(userId: string, controller: Controller): void {
    const existing = this.connections.get(userId);
    if (existing) {
      // ADR-0006 / ST001: single connection per user — evict the old one
      try {
        existing.enqueue(new TextEncoder().encode(formatSSE("replaced", { reason: "new_connection" })));
        existing.close();
      } catch {
        // already closed
      }
    }
    this.connections.set(userId, controller);
  }

  /** Remove a user connection. */
  unsubscribe(userId: string): void {
    this.connections.delete(userId);
  }

  /** Send an event to a specific user. Returns true if the user was connected. */
  emit(userId: string, event: string, data: unknown): boolean {
    const controller = this.connections.get(userId);
    if (!controller) return false;
    try {
      controller.enqueue(new TextEncoder().encode(formatSSE(event, data)));
      return true;
    } catch {
      this.connections.delete(userId);
      return false;
    }
  }

  /** Broadcast an event to all connected users. */
  emitToAll(event: string, data: unknown): void {
    const encoded = new TextEncoder().encode(formatSSE(event, data));
    for (const [userId, controller] of this.connections) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.connections.delete(userId);
      }
    }
  }

  /** Returns true if a user currently has an active SSE connection. */
  isConnected(userId: string): boolean {
    return this.connections.has(userId);
  }

  /** Returns the number of active SSE connections. */
  size(): number {
    return this.connections.size;
  }

  get connectionCount(): number {
    return this.connections.size;
  }
}

// Process-level singleton
declare global {
   
  var __sseManager: SseManagerSingleton | undefined;
}

export const SseManager: SseManagerSingleton =
  globalThis.__sseManager ?? (globalThis.__sseManager = new SseManagerSingleton());
