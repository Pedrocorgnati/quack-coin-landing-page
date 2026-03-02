// lib/services/messenger.service.ts
// Admin-to-user messenger backend.
// Delegates SSE delivery to SseManager (single stream per user, ADR-0006).
// NOTE: SSE connections are in-memory. PM2 must run in single-process mode (not cluster).

import { prisma } from "@/lib/prisma";
import { SseManager } from "@/lib/sse/sseManager";

export interface MessagePayload {
  id: string;
  conversationId: string;
  body: string;
  isFromAdmin: boolean;
  authorId: string;
  createdAt: string;
}

export const MessengerService = {
  /**
   * Send a message from admin to user.
   * Persists to DB, pushes SSE if user is connected.
   */
  async sendToUser(
    adminId: string,
    toUserId: string,
    content: string,
  ): Promise<MessagePayload> {
    // Get or create conversation for this user
    let conversation = await prisma.conversation.findFirst({
      where: { userId: toUserId },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId: toUserId, adminId },
      });
    } else if (conversation.adminId !== adminId) {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { adminId },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        authorId: adminId,
        body: content,
        isFromAdmin: true,
      },
    });

    // Increment unread for the recipient
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { unreadCount: { increment: 1 } },
    });

    const payload: MessagePayload = {
      id: message.id,
      conversationId: conversation.id,
      body: message.body,
      isFromAdmin: true,
      authorId: adminId,
      createdAt: message.createdAt.toISOString(),
    };

    // Push real-time event (no-op if user is offline)
    SseManager.emit(toUserId, "message", payload);

    return payload;
  },

  /**
   * Get conversation history for a user (or all conversations for admin).
   */
  async getConversation(userId: string): Promise<{
    id: string;
    unreadCount: number;
    messages: MessagePayload[];
  } | null> {
    const conversation = await prisma.conversation.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, conversationId: true, body: true, isFromAdmin: true, authorId: true, createdAt: true },
        },
      },
    });

    if (!conversation) return null;

    return {
      id: conversation.id,
      unreadCount: conversation.unreadCount,
      messages: conversation.messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },

  /** Get all conversations (admin view). */
  async getAllConversations() {
    return prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, isFromAdmin: true },
        },
      },
    });
  },

  /** Mark all messages in a user's conversation as read. */
  async markRead(userId: string): Promise<void> {
    await prisma.conversation.updateMany({
      where: { userId, unreadCount: { gt: 0 } },
      data: { unreadCount: 0 },
    });
  },
};
