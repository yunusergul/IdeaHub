import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Trash2, Loader2, Search, Clock, Zap } from 'lucide-react';
import { Modal, Button } from './UI';
import { useAppStore } from '../stores/appStore';
import type { EnrichedIdea } from '../types';

const DEPARTMENT_KEYS = [
  'deptEngineering',
  'deptProductMgmt',
  'deptHR',
  'deptSecurity',
  'deptDevOps',
  'deptDesign',
];

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea?: EnrichedIdea | null;
}

export default function SurveyModal({ isOpen, onClose, idea }: SurveyModalProps) {
  const { t } = useTranslation('surveys');
  const send = useAppStore(s => s.send);
  const ideas = useAppStore(s => s.ideas);
  const statusList = useAppStore(s => s.statusList);
  const sprintsList = useAppStore(s => s.sprintsList);

  const SURVEY_TABS = useMemo(() => [
    { id: 'poll', label: t('poll'), icon: '\u{1F4CA}' },
    { id: 'rating', label: t('rating'), icon: '\u{2B50}' },
    { id: 'development', label: t('development'), icon: '\u{1F680}' },
  ], [t]);

  const departments = useMemo(() =>
    DEPARTMENT_KEYS.map(key => ({ key, label: t(key) })),
    [t]
  );

  const [surveyType, setSurveyType] = useState('poll');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [selectedDeptKeys, setSelectedDeptKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Development-specific state
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [autoTransition, setAutoTransition] = useState(false);
  const [targetStatusId, setTargetStatusId] = useState('');
  const [targetSprintId, setTargetSprintId] = useState('');

  const filteredIdeas = useMemo(() => {
    if (!ideaSearch.trim()) return ideas.slice(0, 20);
    const q = ideaSearch.toLowerCase();
    return ideas.filter(i =>
      i.title.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [ideas, ideaSearch]);

  const selectedIdeas = useMemo(() =>
    ideas.filter(i => selectedIdeaIds.includes(i.id)),
    [ideas, selectedIdeaIds]
  );

  // Filter out the "all" placeholder from sprints
  const realSprints = useMemo(() =>
    sprintsList.filter(s => s.id !== 'all'),
    [sprintsList]
  );

  const addOption = () => setOptions(prev => [...prev, '']);

  const updateOption = (i: number, val: string) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleDept = (deptKey: string) => {
    setSelectedDeptKeys(prev =>
      prev.includes(deptKey) ? prev.filter(d => d !== deptKey) : [...prev, deptKey]
    );
  };

  const toggleIdea = (ideaId: string) => {
    setSelectedIdeaIds(prev =>
      prev.includes(ideaId) ? prev.filter(id => id !== ideaId) : [...prev, ideaId]
    );
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setSelectedDeptKeys([]);
    setSelectedIdeaIds([]);
    setIdeaSearch('');
    setDueDate('');
    setAutoTransition(false);
    setTargetStatusId('');
    setTargetSprintId('');
  };

  const canSubmit = () => {
    if (!question.trim() || selectedDeptKeys.length === 0 || submitting) return false;
    if (surveyType === 'poll') {
      return options.every(o => o.trim()) && options.length >= 2;
    }
    if (surveyType === 'development') {
      return selectedIdeaIds.length >= 2;
    }
    // rating type only needs question + departments
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    try {
      const selectedDeptLabels = selectedDeptKeys.map(key => t(key));
      const payload: Record<string, unknown> = {
        title: idea ? `${idea.title} - ${t('surveySuffix')}` : question,
        question,
        type: surveyType,
        ideaId: idea?.id || null,
        targetDepartments: selectedDeptLabels,
      };

      if (surveyType === 'poll') {
        payload.options = options.filter(o => o.trim());
      } else if (surveyType === 'development') {
        payload.options = selectedIdeas.map(i => ({ ideaId: i.id, label: i.title }));
        if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
        payload.autoTransition = autoTransition;
        if (autoTransition) {
          payload.targetStatusId = targetStatusId || null;
          payload.targetSprintId = targetSprintId || null;
        }
      }

      await send('surveys:create', payload);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Failed to create survey:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('createTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={!canSubmit()}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {t('creating')}
              </span>
            ) : (
              t('publishSurvey')
            )}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Survey type tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
        }}>
          {SURVEY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSurveyType(tab.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: surveyType === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: surveyType === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: '0.8125rem',
                fontWeight: surveyType === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 150ms',
                boxShadow: surveyType === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {idea && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--primary-50)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--primary-700)',
            fontWeight: 500,
          }}>
            {t('linkedIdea', { title: idea.title })}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('questionLabel')}</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={surveyType === 'development'
              ? t('devQuestionPlaceholder')
              : t('questionPlaceholder')}
            disabled={submitting}
          />
        </div>

        {/* Poll options */}
        {surveyType === 'poll' && (
          <div className="form-group">
            <label className="form-label">{t('optionsLabel')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid var(--border-default)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    color: 'var(--text-tertiary)',
                    fontWeight: 600,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={t('optionPlaceholder', { num: i + 1 })}
                    style={{ flex: 1 }}
                    disabled={submitting}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        padding: 4,
                        display: 'flex',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" icon={Plus} onClick={addOption} style={{ alignSelf: 'flex-start' }}>
                {t('addOption')}
              </Button>
            </div>
          </div>
        )}

        {/* Development: Idea selection */}
        {surveyType === 'development' && (
          <div className="form-group">
            <label className="form-label">{t('ideasLabel')}</label>

            {/* Selected ideas */}
            {selectedIdeas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {selectedIdeas.map(i => (
                  <div key={i.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--primary-50)',
                    border: '1px solid var(--primary-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--primary-700)',
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {i.title}
                    </span>
                    <button
                      onClick={() => toggleIdea(i.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--primary-400)',
                        padding: 2,
                        display: 'flex',
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} />
              <input
                type="text"
                value={ideaSearch}
                onChange={(e) => setIdeaSearch(e.target.value)}
                placeholder={t('searchIdeas')}
                style={{ paddingLeft: 32 }}
                disabled={submitting}
              />
            </div>

            {/* Idea list */}
            <div style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}>
              {filteredIdeas.filter(i => !selectedIdeaIds.includes(i.id)).map(i => (
                <button
                  key={i.id}
                  onClick={() => toggleIdea(i.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--border-default)',
                    background: 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-primary)'; }}
                >
                  <div style={{ fontWeight: 600 }}>{i.title}</div>
                  {i.summary && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i.summary}
                    </div>
                  )}
                </button>
              ))}
              {filteredIdeas.filter(i => !selectedIdeaIds.includes(i.id)).length === 0 && (
                <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  {t('noIdeasFound')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Development: Due date */}
        {surveyType === 'development' && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} />
              {t('dueDate')}
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        {/* Development: Auto-transition */}
        {surveyType === 'development' && (
          <div className="form-group">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: autoTransition ? 'var(--primary-50)' : 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${autoTransition ? 'var(--primary-200)' : 'var(--border-default)'}`,
              transition: 'all 150ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} style={{ color: autoTransition ? 'var(--primary-600)' : 'var(--text-tertiary)' }} />
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: autoTransition ? 'var(--primary-700)' : 'var(--text-primary)' }}>
                    {t('autoTransitionLabel')}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {t('autoTransitionDesc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutoTransition(!autoTransition)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  border: 'none',
                  background: autoTransition ? 'var(--primary-500)' : 'var(--border-strong)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: 2,
                  left: autoTransition ? 20 : 2,
                  transition: 'left 200ms',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>

            {/* Target status and sprint dropdowns */}
            {autoTransition && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    {t('targetStage')}
                  </label>
                  <select
                    value={targetStatusId}
                    onChange={(e) => setTargetStatusId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-primary)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">{t('noChange')}</option>
                    {statusList.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    {t('targetSprint')}
                  </label>
                  <select
                    value={targetSprintId}
                    onChange={(e) => setTargetSprintId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-primary)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">{t('activeSprint')}</option>
                    {realSprints.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Target departments */}
        <div className="form-group">
          <label className="form-label">{t('targetDepts')}</label>
          <p className="form-hint">{t('targetDeptsHint')}</p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 8,
          }}>
            {departments.map(dept => {
              const selected = selectedDeptKeys.includes(dept.key);
              return (
                <button
                  key={dept.key}
                  onClick={() => toggleDept(dept.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${selected ? 'var(--primary-500)' : 'var(--border-default)'}`,
                    background: selected ? 'var(--primary-50)' : 'var(--bg-primary)',
                    color: selected ? 'var(--primary-700)' : 'var(--text-secondary)',
                    fontSize: '0.8125rem',
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
