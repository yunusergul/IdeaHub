import { forwardRef, useState, useCallback, type ReactNode, type CSSProperties, type ButtonHTMLAttributes, type ChangeEvent } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import './ui.css';

/* ============================================
   BUTTON
   ============================================ */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
  icon?: LucideIcon;
  iconRight?: ReactNode;
  full?: boolean;
  className?: string;
}

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, iconRight, full, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${full ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
      {iconRight && iconRight}
    </button>
  );
}

/* ============================================
   ICON BUTTON
   ============================================ */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: number;
  className?: string;
  badge?: number | null;
}

export function IconButton({ icon: Icon, size = 18, className = '', badge, ...props }: IconButtonProps) {
  return (
    <button className={`btn btn--ghost btn--icon ${className}`} {...props}>
      <Icon size={size} />
      {badge != null && badge > 0 && (
        <span style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--error-500)',
          color: 'white',
          fontSize: '0.625rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'translate(25%, -25%)',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ============================================
   BADGE
   ============================================ */
interface BadgeProps {
  children: ReactNode;
  color?: string;
  bg?: string;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ children, color, bg, dot = false, className = '', style }: BadgeProps) {
  return (
    <span
      className={`badge ${dot ? 'badge--dot' : ''} ${className}`}
      style={{ color, '--badge-color': color, '--badge-bg': bg, ...style } as CSSProperties}
    >
      {children}
    </span>
  );
}

/* ============================================
   AVATAR
   ============================================ */
const avatarColors = ['', '--orange', '--green', '--pink', '--cyan'];

interface AvatarProps {
  name?: string;
  initials?: string;
  size?: string;
  src?: string | null;
}

export function Avatar({ name, initials, size = 'md', src }: AvatarProps) {
  const colorIdx = name ? (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % avatarColors.length : 0;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar avatar--${size}`}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  return (
    <div className={`avatar avatar--${size} avatar${avatarColors[colorIdx]}`}>
      {initials || (name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '?')}
    </div>
  );
}

/* ============================================
   MODAL
   ============================================ */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, size = '' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={`modal ${size ? `modal--${size}` : ''}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="modal__header">
              <h3 className="modal__title">{title}</h3>
              <button className="btn btn--ghost btn--icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="modal__body">{children}</div>
            {footer && <div className="modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================
   CONFIRM DIALOG
   ============================================ */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel, variant = 'danger' }: ConfirmDialogProps) {
  const dangerColors = { icon: 'var(--error-500)', bg: 'var(--error-50)', btn: 'danger' };
  const colorMap: Record<string, { icon: string; bg: string; btn: string }> = {
    danger: dangerColors,
    warning: { icon: 'var(--warning-500)', bg: 'var(--warning-50)', btn: 'secondary' },
  };
  const colors = colorMap[variant] ?? dangerColors;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          style={{ zIndex: 1100 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              maxWidth: 400,
              width: '90%',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-full)',
                background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <AlertTriangle size={24} style={{ color: colors.icon }} />
              </div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {message}
              </p>
            </div>
            <div style={{
              padding: '12px 24px 20px', display: 'flex', gap: 10, justifyContent: 'center',
            }}>
              <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
                {cancelLabel}
              </Button>
              <Button variant={colors.btn} size="md" onClick={onConfirm} style={{ flex: 1 }}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'danger' | 'warning';
}

interface ConfirmState {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: string;
}

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ConfirmDialogProps] {
  const [state, setState] = useState<ConfirmState>({ isOpen: false, resolve: null, title: '', message: '', confirmLabel: '', cancelLabel: '', variant: 'danger' });

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, variant = 'danger' }: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, resolve, title, message, confirmLabel, cancelLabel, variant });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, isOpen: false }));
  }, [state.resolve]);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, isOpen: false }));
  }, [state.resolve]);

  const dialogProps: ConfirmDialogProps = {
    isOpen: state.isOpen,
    onClose: handleClose,
    onConfirm: handleConfirm,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant as 'danger' | 'warning',
  };

  return [confirm, dialogProps];
}

/* ============================================
   TOGGLE
   ============================================ */
interface ToggleProps {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
      {label && <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</span>}
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle__track" />
        <span className="toggle__thumb" />
      </label>
    </div>
  );
}

/* ============================================
   VOTE CONTROL
   ============================================ */
interface VoteControlProps {
  upvotes: number;
  hasVoted: boolean;
  onVote: (type: string) => void;
}

export function VoteControl({ upvotes, hasVoted, onVote }: VoteControlProps) {
  return (
    <div className="vote-control">
      <button
        className={`vote-btn ${hasVoted ? 'vote-btn--active' : ''}`}
        onClick={() => onVote('up')}
        title={hasVoted ? 'Oyunu geri al' : 'Oy ver'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>
      <span className="vote-count">{upvotes}</span>
    </div>
  );
}

/* ============================================
   SEARCH INPUT
   ============================================ */
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ value, onChange, placeholder = 'Ara...', ...props }, ref) {
  return (
    <div className="search-input">
      <svg className="search-input__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
});
