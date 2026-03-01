import { create } from 'zustand';
import type { ToastItem } from '../types';

let nextId = 0;

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type'], duration?: number) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, type = 'error', duration = 4000) => {
    const id = ++nextId;
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    if (duration > 0) {
      setTimeout(() => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
      }, duration);
    }
  },

  removeToast: (id) => set(s => ({
    toasts: s.toasts.filter(t => t.id !== id),
  })),
}));

export const toast = {
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning'),
};
