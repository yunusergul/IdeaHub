import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from './UI';
import { useAppStore } from '../stores/appStore';

const presetColors = [
  { color: '#6366f1', bg: '#eef2ff' },
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#22c55e', bg: '#f0fdf4' },
  { color: '#f59e0b', bg: '#fffbeb' },
  { color: '#ef4444', bg: '#fef2f2' },
  { color: '#ec4899', bg: '#fdf2f8' },
  { color: '#8b5cf6', bg: '#f5f3ff' },
  { color: '#14b8a6', bg: '#f0fdfa' },
];

export default function AddStageModal({ isOpen, onClose }) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const addStatus = useAppStore(s => s.addStatus);
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    addStatus({
      label: label.trim(),
      color: presetColors[selectedColor].color,
      bg: presetColors[selectedColor].bg,
    });
    setLabel('');
    setSelectedColor(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('categories.stageTitle')}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!label.trim()}>
            {tCommon('add')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>
            {t('categories.stageName')}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('categories.stageNamePlaceholder')}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>
            {t('categories.color')}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presetColors.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedColor(i)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: c.bg,
                  border: selectedColor === i
                    ? `2px solid ${c.color}`
                    : '2px solid var(--border-default)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 150ms',
                }}
              >
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: c.color,
                }} />
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
