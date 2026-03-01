import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWsStore } from '../stores/wsStore';

export default function ConnectionStatus() {
  const { t } = useTranslation('common');
  const connectionState = useWsStore(s => s.connectionState);

  const show = connectionState === 'reconnecting' || connectionState === 'failed';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            overflow: 'hidden',
            background: connectionState === 'failed' ? 'var(--error-50)' : 'var(--warning-50)',
            borderBottom: `1px solid ${connectionState === 'failed' ? 'var(--error-200)' : 'var(--warning-200)'}`,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '6px 16px',
          }}>
            {connectionState === 'reconnecting' ? (
              <>
                <RefreshCw size={14} style={{ color: 'var(--warning-600)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-700)' }}>
                  {t('connectionReconnecting')}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={14} style={{ color: 'var(--error-600)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error-700)' }}>
                  {t('connectionFailed')}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
