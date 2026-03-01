import { useState, useRef, useMemo, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Paperclip,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Clock,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Zap,
  Filter,
  ArrowRight,
  Play,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar } from '../components/UI';
import SprintAssignModal from '../components/SprintAssignModal';
import { getStatusLabel } from '../lib/statusHelpers';
import { KanbanCardSkeleton } from '../components/Skeleton';
import type { EnrichedIdea, SprintItem, Status, AppSettings } from '../types';

interface KanbanColumnSentinelProps {
  statusId: string;
  loading: boolean;
  onIntersect: (statusId: string) => void;
}

interface PipelineStage extends Status {
  count: number;
  pct: number;
  index: number;
}

interface PipelineStats {
  stages: PipelineStage[];
  completedPct: number;
  total: number;
}

interface TimeFilter {
  id: string;
  label: string;
}

function daysAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return t('today');
  if (days === 1) return t('oneDayAgo');
  return t('daysAgo', { count: days });
}

function filterByTime(ideas: EnrichedIdea[], timeFilter: string): EnrichedIdea[] {
  if (timeFilter === 'all') return ideas;
  const now = new Date();

  if (timeFilter === 'week') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);
    return ideas.filter(i => new Date(i.createdAt) >= start);
  }
  if (timeFilter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return ideas.filter(i => new Date(i.createdAt) >= start);
  }
  const daysMap: Record<string, number> = { '7d': 7, '14d': 14, '30d': 30 };
  const days = daysMap[timeFilter];
  if (days) {
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return ideas.filter(i => new Date(i.createdAt) >= start);
  }
  return ideas;
}

function filterBySprint(ideas: EnrichedIdea[], sprintId: string): EnrichedIdea[] {
  if (sprintId === 'all') return ideas;
  return ideas.filter(i => {
    const sid = i.sprint && typeof i.sprint === 'object' ? i.sprint.id : (i.sprintId || i.sprint);
    return sid === sprintId;
  });
}

function chipStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    border: `1px solid ${active ? 'var(--primary-300)' : 'var(--border-default)'}`,
    background: active ? 'var(--primary-50)' : 'var(--bg-primary)',
    color: active ? 'var(--primary-700)' : 'var(--text-secondary)',
    fontSize: '0.75rem',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms',
  };
}

function KanbanColumnSentinel({ statusId, loading, onIntersect }: KanbanColumnSentinelProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loading) {
          onIntersect(statusId);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [statusId, loading, onIntersect]);

  return (
    <div ref={ref} style={{ padding: loading ? 0 : 8 }}>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 2 }).map((_, i) => <KanbanCardSkeleton key={i} />)}
        </div>
      )}
    </div>
  );
}

function getStatusId(idea: EnrichedIdea): string | undefined {
  if (idea.status && typeof idea.status === 'object') return idea.status.id;
  return idea.statusId || undefined;
}

export default function KanbanBoard(): React.JSX.Element {
  const { t } = useTranslation('kanban');
  const kanbanIdeas = useAppStore(s => s.kanbanIdeas) as EnrichedIdea[];
  const fallbackIdeas = useAppStore(s => s.ideas) as EnrichedIdea[];
  const fetchKanbanIdeas = useAppStore(s => s.fetchKanbanIdeas) as () => void;
  const fetchKanbanIdeasForStatus = useAppStore(s => s.fetchKanbanIdeasForStatus) as (statusId: string) => void;
  const kanbanColumnHasMore = useAppStore(s => s.kanbanColumnHasMore) as Record<string, boolean>;
  const kanbanColumnLoading = useAppStore(s => s.kanbanColumnLoading) as Record<string, boolean>;
  const initialized = useAppStore(s => s.initialized) as boolean;
  const ideas = kanbanIdeas.length > 0 ? kanbanIdeas : fallbackIdeas;
  const searchQuery = useAppStore(s => s.searchQuery) as string;
  const rawStatuses = useAppStore(s => s.statusList) as Status[];
  const updateIdeaStatus = useAppStore(s => s.updateIdeaStatus) as (ideaId: string, statusId: string) => void;
  const appSettings = useAppStore(s => s.appSettings) as AppSettings;
  const currentUser = useAuthStore(s => s.user) as { id: string; name: string; role: string } | null;
  const sprints = useAppStore(s => s.sprintsList) as SprintItem[];
  const statuses = useMemo(() => [...rawStatuses].sort((a, b) => {
    const oa = a.order ?? 999;
    const ob = b.order ?? 999;
    if (oa === 0 && ob === 0) return 0;
    if (oa === 0) return 1;
    if (ob === 0) return 1;
    return oa - ob;
  }), [rawStatuses]);
  useEffect(() => { if (initialized) fetchKanbanIdeas(); }, [initialized, fetchKanbanIdeas]);

  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'product_manager';
  const canDrag = isManager || appSettings?.kanban_user_readonly !== 'true';
  const navigate = useNavigate();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [sprintAssignIdea, setSprintAssignIdea] = useState<EnrichedIdea | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const dragCounter = useRef<Record<string, number>>({});

  // Filters
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [pipelineOpen, setPipelineOpen] = useState<boolean>(false);

  const timeFilters: TimeFilter[] = [
    { id: 'all', label: t('allTime') },
    { id: 'week', label: t('thisWeek') },
    { id: 'month', label: t('thisMonth') },
    { id: '7d', label: t('last7d') },
    { id: '14d', label: t('last14d') },
    { id: '30d', label: t('last30d') },
  ];

  const filteredIdeas = useMemo(() => {
    let result = ideas;
    result = filterBySprint(result, selectedSprint);
    result = filterByTime(result, selectedTime);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.summary || '').toLowerCase().includes(q) ||
        (i.content || '').toLowerCase().includes(q) ||
        (i.author?.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [ideas, selectedSprint, selectedTime, searchQuery]);

  const activeFilterCount = (selectedSprint !== 'all' ? 1 : 0) + (selectedTime !== 'all' ? 1 : 0);

  const pipelineStats = useMemo((): PipelineStats => {
    const total = filteredIdeas.length;
    if (total === 0) return { stages: [], completedPct: 0, total: 0 };

    const completedStatus = statuses.find(s => s.id === 'completed');
    const completedId = completedStatus?.id;
    const completedCount = filteredIdeas.filter(i => getStatusId(i) === completedId).length;
    const completedPct = Math.round((completedCount / total) * 100);

    const stages: PipelineStage[] = statuses.map((s, idx) => {
      const count = filteredIdeas.filter(i => getStatusId(i) === s.id).length;
      return { ...s, count, pct: Math.round((count / total) * 100), index: idx };
    });

    return { stages, completedPct, total };
  }, [filteredIdeas, statuses]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ideaId: string): void => {
    setDraggedId(ideaId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ideaId);
  };

  const handleDragEnd = (): void => {
    setDraggedId(null);
    setOverColumn(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, statusId: string): void => {
    e.preventDefault();
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) + 1;
    setOverColumn(statusId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, statusId: string): void => {
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) - 1;
    if (dragCounter.current[statusId] <= 0) {
      dragCounter.current[statusId] = 0;
      if (overColumn === statusId) setOverColumn(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Find "in-progress" status by label
  const inProgressStatus = statuses.find(s => s.id === 'in-progress');
  const inProgressId = inProgressStatus?.id;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, statusId: string): void => {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData('text/plain');
    if (ideaId) {
      // If dropping onto "in-progress", require sprint assignment
      if (statusId === inProgressId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (idea && getStatusId(idea) !== inProgressId) {
          setSprintAssignIdea(idea);
        }
      } else {
        updateIdeaStatus(ideaId, statusId);
      }
    }
    setDraggedId(null);
    setOverColumn(null);
    dragCounter.current = {};
  };

  const clearFilters = (): void => {
    setSelectedSprint('all');
    setSelectedTime('all');
  };

  const selectedSprintData = sprints.find(s => s.id === selectedSprint);

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {t('subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filterOpen || activeFilterCount > 0 ? 'var(--primary-300)' : 'var(--border-default)'}`,
              background: filterOpen || activeFilterCount > 0 ? 'var(--primary-50)' : 'var(--bg-primary)',
              color: filterOpen || activeFilterCount > 0 ? 'var(--primary-700)' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <Filter size={14} />
            {t('filterBtn')}
            {activeFilterCount > 0 && (
              <span style={{
                background: 'var(--primary-600)',
                color: 'white',
                fontSize: '0.625rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                lineHeight: 1.4,
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: 'var(--error-50)',
                color: 'var(--error-600)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              marginBottom: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              {/* Sprint filter */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('sprintLabel')}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sprints.map(sprint => (
                    <button
                      key={sprint.id}
                      onClick={() => setSelectedSprint(sprint.id)}
                      style={{
                        ...chipStyle(selectedSprint === sprint.id),
                        gap: 6,
                      }}
                    >
                      {sprint.id !== 'all' && <Zap size={11} />}
                      {sprint.label}
                      {sprint.isCurrent && (
                        <span style={{
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          color: 'var(--success-600)',
                          background: 'var(--success-50)',
                          padding: '0px 5px',
                          borderRadius: 'var(--radius-full)',
                        }}>
                          {t('activeSprint')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border-default)' }} />
              {/* Time filter */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('timeLabel')}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {timeFilters.map(tf => (
                    <button
                      key={tf.id}
                      onClick={() => setSelectedTime(tf.id)}
                      style={chipStyle(selectedTime === tf.id)}
                    >
                      {tf.id !== 'all' && <Calendar size={11} />}
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprint info bar (when sprint selected) */}
      {selectedSprint !== 'all' && selectedSprintData?.startDate && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--primary-50)',
          border: '1px solid var(--primary-200)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 14,
          flexShrink: 0,
        }}>
          <Zap size={14} style={{ color: 'var(--primary-600)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-700)' }}>
            {selectedSprintData.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)' }}>
            {new Date(selectedSprintData.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
            {' — '}
            {new Date(selectedSprintData.endDate!).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
          </span>
          {selectedSprintData.isCurrent && (
            <span style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'white',
              background: 'var(--success-500)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}>
              {t('activeSprint')}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-600)' }}>
            {t('ideas', { count: filteredIdeas.length })}
          </span>
        </div>
      )}

      {/* Pipeline Progress Overview — Accordion */}
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 16,
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Accordion header — always visible */}
        <button
          onClick={() => setPipelineOpen(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '14px 20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('totalIdeas', { count: pipelineStats.total })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} style={{ color: 'var(--success-500)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('completed', { pct: pipelineStats.completedPct })}
            </span>
          </div>
          <div style={{
            flex: 1,
            height: 6,
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pipelineStats.completedPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary-500), var(--success-500))',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
          <motion.div
            animate={{ rotate: pipelineOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ flexShrink: 0, color: 'var(--text-tertiary)', display: 'flex' }}
          >
            <ChevronDown size={16} />
          </motion.div>
        </button>

        {/* Accordion body — stage details */}
        <AnimatePresence>
          {pipelineOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                overflowX: 'auto',
                padding: '0 20px 14px',
              }}>
                {pipelineStats.stages.map((stage, idx) => (
                  <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: stage.count > 0 ? `color-mix(in srgb, ${stage.color} 10%, var(--bg-primary))` : 'var(--bg-tertiary)',
                      border: `1px solid ${stage.count > 0 ? stage.color + '40' : 'var(--border-default)'}`,
                      flex: 1,
                      minWidth: 0,
                      transition: 'all 200ms',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: stage.color, flexShrink: 0,
                        boxShadow: stage.count > 0 ? `0 0 6px ${stage.color}60` : 'none',
                      }} />
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        color: stage.count > 0 ? stage.color : 'var(--text-tertiary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {getStatusLabel(stage)}
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 700,
                        color: stage.count > 0 ? stage.color : 'var(--text-tertiary)', flexShrink: 0,
                      }}>
                        {stage.count}
                      </span>
                    </div>
                    {idx < pipelineStats.stages.length - 1 && (
                      <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.4, margin: '0 2px' }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div style={{
        display: 'flex',
        gap: 16,
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: 8,
      }}>
        {statuses.map((status, colIdx) => {
          const columnIdeas = filteredIdeas.filter(i => getStatusId(i) === status.id);
          const isOver = overColumn === status.id && draggedId;
          const draggedIdea = filteredIdeas.find(i => i.id === draggedId);
          const isDragSource = draggedIdea ? getStatusId(draggedIdea) === status.id : false;
          const pct = pipelineStats.stages[colIdx]?.pct || 0;

          return (
            <div
              key={status.id}
              onDragEnter={(e) => handleDragEnter(e, status.id)}
              onDragLeave={(e) => handleDragLeave(e, status.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
              style={{
                minWidth: 260,
                maxWidth: 320,
                flex: '0 0 clamp(260px, 70vw, 280px)',
                display: 'flex',
                flexDirection: 'column',
                background: isOver && !isDragSource ? `color-mix(in srgb, ${status.color} 10%, var(--bg-primary))` : 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                border: `2px ${isOver && !isDragSource ? 'dashed' : 'solid'} ${isOver && !isDragSource ? status.color : 'var(--border-default)'}`,
                transition: 'border-color 200ms, background 200ms',
                overflow: 'hidden',
              }}
            >
              {/* Column header */}
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem',
                    color: 'var(--text-primary)', letterSpacing: '-0.01em',
                  }}>
                    {getStatusLabel(status)}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600,
                    color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)',
                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  }}>
                    {columnIdeas.length}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, height: 3, background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-full)', overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: colIdx * 0.08 }}
                      style={{ height: '100%', background: status.color, borderRadius: 'var(--radius-full)' }}
                    />
                  </div>
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-tertiary)',
                    flexShrink: 0, minWidth: 28, textAlign: 'right',
                  }}>
                    %{pct}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '8px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {columnIdeas.map(idea => {
                  const sprintInfo: SprintItem | undefined = idea.sprint && typeof idea.sprint === 'object'
                    ? idea.sprint
                    : sprints.find(s => s.id === (idea.sprintId || undefined));
                  return (
                    <motion.div
                      key={idea.id}
                      layout
                      draggable={canDrag}
                      onDragStart={(e) => canDrag && handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, idea.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/dashboard/idea/${idea.id}`)}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        cursor: canDrag ? 'grab' : 'default',
                        opacity: draggedId === idea.id ? 0.4 : 1,
                        transition: 'opacity 150ms, box-shadow 150ms',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                      whileHover={{ boxShadow: 'var(--shadow-md)' }}
                    >
                      {/* Drag handle + title */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        {canDrag && <GripVertical size={14} style={{
                          color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2, opacity: 0.5,
                        }} />}
                        <h4 style={{
                          fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
                          lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0,
                        }}>
                          {idea.title}
                        </h4>
                      </div>

                      {/* Tags row: time + sprint */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 6px', background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          <Clock size={10} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                            {daysAgo(idea.createdAt, t)}
                          </span>
                        </div>
                        {sprintInfo && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 6px',
                            background: sprintInfo.isCurrent ? 'var(--primary-50)' : 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                          }}>
                            <Zap size={10} style={{ color: sprintInfo.isCurrent ? 'var(--primary-500)' : 'var(--text-tertiary)' }} />
                            <span style={{
                              fontSize: '0.625rem', fontWeight: 500,
                              color: sprintInfo.isCurrent ? 'var(--primary-600)' : 'var(--text-tertiary)',
                            }}>
                              {sprintInfo.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Sprint'e Al button for approved ideas */}
                      {getStatusId(idea) === 'approved' && isManager && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSprintAssignIdea(idea); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            width: '100%',
                            marginTop: 8,
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px dashed var(--primary-300)',
                            background: 'var(--primary-50)',
                            color: 'var(--primary-700)',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          <Play size={11} fill="currentColor" />
                          {t('addToSprint')}
                          <ArrowRight size={11} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                        </button>
                      )}

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Avatar name={idea.author.name} initials={idea.author.initials} size="xs" />
                        <span style={{
                          fontSize: '0.6875rem', color: 'var(--text-tertiary)', flex: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {idea.author.name}
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: '0.6875rem', fontWeight: 600,
                          color: idea.upvotes - idea.downvotes > 0 ? 'var(--success-600)' : 'var(--text-tertiary)',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                          {idea.upvotes - idea.downvotes}
                        </span>
                        {idea.commentCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            <MessageSquare size={11} />
                            {idea.commentCount}
                          </span>
                        )}
                        {idea.attachments && idea.attachments.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            <Paperclip size={11} />
                            {idea.attachments.length}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Infinite scroll sentinel */}
                {kanbanColumnHasMore[status.id] && (
                  <KanbanColumnSentinel
                    statusId={status.id}
                    loading={kanbanColumnLoading[status.id] ?? false}
                    onIntersect={fetchKanbanIdeasForStatus}
                  />
                )}

                {columnIdeas.length === 0 && (
                  <div style={{
                    padding: '24px 12px', textAlign: 'center',
                    color: 'var(--text-tertiary)', fontSize: '0.75rem', fontStyle: 'italic',
                  }}>
                    {t('noIdeas')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SprintAssignModal
        isOpen={!!sprintAssignIdea}
        onClose={() => setSprintAssignIdea(null)}
        idea={sprintAssignIdea}
        targetStatusId={inProgressId}
      />
    </div>
  );
}
