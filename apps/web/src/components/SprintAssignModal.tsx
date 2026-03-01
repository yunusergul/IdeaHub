import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Zap, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from './UI';
import { useAppStore } from '../stores/appStore';
import type { EnrichedIdea } from '../types';

interface SprintAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: EnrichedIdea | null;
  targetStatusId?: string;
}

export default function SprintAssignModal({ isOpen, onClose, idea, targetStatusId }: SprintAssignModalProps) {
  const { t, i18n } = useTranslation('kanban');
  const assignToSprint = useAppStore(s => s.assignToSprint);
  const sprints = useAppStore(s => s.sprintsList);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(() => {
    const current = sprints.find(s => s.isCurrent);
    return current?.id || null;
  });

  if (!idea) return null;

  const activeSprints = sprints.filter(s => s.id !== 'all');

  const handleAssign = () => {
    if (!selectedSprint) return;
    assignToSprint(idea.id, selectedSprint, targetStatusId);
    onClose();
  };

  const dateLocale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sprintAssignTitle')}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>{t('dismiss')}</Button>
          <Button variant="primary" onClick={handleAssign} disabled={!selectedSprint}>
            <Zap size={14} />
            {t('assignToSprint')}
          </Button>
        </div>
      }
    >
      {/* Flow indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 16,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-600)',
          padding: '3px 8px', background: 'var(--success-50)', borderRadius: 'var(--radius-full)',
        }}>
          <CheckCircle2 size={12} />
          {t('approved')}
        </span>
        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-600)',
          padding: '3px 8px', background: 'var(--primary-50)', borderRadius: 'var(--radius-full)',
        }}>
          <Zap size={12} />
          {t('sprintAssignment')}
        </span>
        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--info-600)',
          padding: '3px 8px', background: 'var(--info-50)', borderRadius: 'var(--radius-full)',
        }}>
          {t('inDevelopment')}
        </span>
      </div>

      {/* Idea summary */}
      <div style={{
        padding: '12px 14px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 16,
        border: '1px solid var(--border-default)',
      }}>
        <p style={{
          fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
          margin: 0, lineHeight: 1.4,
        }}>
          {idea.title}
        </p>
        <p style={{
          fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '4px 0 0',
        }}>
          {t('createdBy', { name: idea.author?.name })}
        </p>
      </div>

      {/* Sprint selection */}
      <label style={{
        display: 'block', fontSize: '0.8125rem', fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 8,
      }}>
        {t('targetSprint')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activeSprints.map(sprint => {
          const isSelected = selectedSprint === sprint.id;
          return (
            <motion.button
              key={sprint.id}
              onClick={() => setSelectedSprint(sprint.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${isSelected ? 'var(--primary-400)' : 'var(--border-default)'}`,
                background: isSelected ? 'var(--primary-50)' : 'var(--bg-primary)',
                cursor: 'pointer',
                transition: 'all 150ms',
                textAlign: 'left',
              }}
            >
              {/* Radio circle */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--primary-500)' : 'var(--border-default)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 150ms',
              }}>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--primary-500)',
                    }}
                  />
                )}
              </div>

              {/* Sprint info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={13} style={{ color: isSelected ? 'var(--primary-600)' : 'var(--text-tertiary)' }} />
                  <span style={{
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: isSelected ? 'var(--primary-700)' : 'var(--text-primary)',
                  }}>
                    {sprint.label}
                  </span>
                  {sprint.isCurrent && (
                    <span style={{
                      fontSize: '0.5625rem', fontWeight: 700, color: 'white',
                      background: 'var(--success-500)', padding: '1px 6px',
                      borderRadius: 'var(--radius-full)', letterSpacing: '0.04em',
                    }}>
                      {t('activeLabel')}
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
                }}>
                  <Calendar size={11} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    {sprint.startDate && new Date(sprint.startDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}
                    {' — '}
                    {sprint.endDate && new Date(sprint.endDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}
