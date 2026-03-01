import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../stores/toastStore';

const icons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
};

const colors = {
  error: {
    bg: 'var(--error-50)',
    border: 'var(--error-200)',
    icon: 'var(--error-500)',
    text: 'var(--error-700)',
  },
  success: {
    bg: 'var(--success-50)',
    border: 'var(--success-200)',
    icon: 'var(--success-500)',
    text: 'var(--success-700)',
  },
  warning: {
    bg: 'var(--warning-50)',
    border: 'var(--warning-200)',
    icon: 'var(--warning-500)',
    text: 'var(--warning-700)',
  },
};

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);
  const removeToast = useToastStore(s => s.removeToast);

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 400,
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = icons[t.type] || AlertCircle;
          const c = colors[t.type] || colors.error;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: c.text,
              }}
            >
              <Icon size={18} style={{ color: c.icon, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: c.text,
                  padding: 0,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
