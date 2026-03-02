// lib/toast.ts
// Typed Sonner toast helpers for consistent notification UX.

import { toast as sonner } from "sonner";

export const toast = {
  success: (msg: string) => sonner.success(msg),
  error: (msg: string) => sonner.error(msg),
  loading: (msg: string) => sonner.loading(msg),
  info: (msg: string) => sonner.info(msg),
  warning: (msg: string) => sonner.warning(msg),

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
  ) =>
    sonner.promise(promise, {
      loading: msgs.loading,
      success: msgs.success,
      error: msgs.error,
    }),

  dismiss: sonner.dismiss,
};
