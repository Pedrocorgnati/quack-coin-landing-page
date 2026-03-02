// lib/events/eventQueue.ts
// Thin event queue wrapper. In dev/production, calls handleQcEvent synchronously.
// Replace with a real queue (BullMQ, etc.) for distributed systems.

import { handleQcEvent } from "./qcEventHandler";
import type { QcEarnEvent } from "./qcEvents";

export const eventQueue = {
  /**
   * Enqueue a QC earn event. Currently synchronous (single process).
   */
  async enqueue(event: QcEarnEvent): Promise<void> {
    await handleQcEvent(event);
  },

  /**
   * Enqueue without waiting. For fire-and-forget (e.g. from login callbacks).
   */
  enqueueAsync(event: QcEarnEvent): void {
    void handleQcEvent(event).catch((err) => {
      console.error("[eventQueue] Failed to handle QC event:", event.type, err);
    });
  },
};
