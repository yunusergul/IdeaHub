import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Paperclip, TrendingUp, Loader2, SlidersHorizontal, Filter, X, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar, Badge, VoteControl } from '../components/UI';
import { MarkdownContent } from '../components/MarkdownContent';
import NewIdeaModal from '../components/NewIdeaModal';
import { getStatusLabel } from '../lib/statusHelpers';

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const ideas = useAppStore(s => s.ideas);
  const ideasTotal = useAppStore(s => s.ideasTotal);
  const ideasHasMore = useAppStore(s => s.ideasHasMore);
  const ideasLoadingMore = useAppStore(s => s.ideasLoadingMore);
  const loadMoreIdeas = useAppStore(s => s.loadMoreIdeas);
  const statuses = useAppStore(s => s.statusList);
  const selectedStatus = useAppStore(s => s.selectedStatus);
  const setSelectedStatus = useAppStore(s => s.setSelectedStatus);
  const categories = useAppStore(s => s.categories);
  const viewMode = useAppStore(s => s.viewMode);
  const vote = useAppStore(s => s.vote);
  const currentUser = useAuthStore(s => s.user);
  const loading = useAppStore(s => s.loading);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  const ideasHasMoreRef = useRef(ideasHasMore);
  ideasHasMoreRef.current = ideasHasMore;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && ideasHasMoreRef.current) loadMoreIdeas();
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreIdeas, loading]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return ideas.filter(i => new Date(i.createdAt) >= weekAgo).length;
  }, [ideas]);

  const [sortBy, setSortBy] = useState('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  const sortOptions = [
    { id: 'newest', label: t('newest') },
    { id: 'oldest', label: t('oldest') },
    { id: 'mostVoted', label: t('mostVoted') },
    { id: 'mostCommented', label: t('mostCommented') },
  ];

  const sortedIdeas = useMemo(() => {
    const list = [...ideas];
    switch (sortBy) {
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'mostVoted':
        return list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      case 'mostCommented':
        return list.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
      case 'newest':
      default:
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [ideas, sortBy]);

  const [showNewIdea, setShowNewIdea] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openNewIdea) {
      setShowNewIdea(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const getStatus = (idea) => {
    if (idea.status && typeof idea.status === 'object') return idea.status;
    return statuses.find(s => s.id === (idea.statusId || idea.status));
  };

  const getCategory = (idea) => {
    if (idea.category && typeof idea.category === 'object' && idea.category.id) return idea.category;
    return categories.find(c => c.id === (idea.categoryId || idea.category?.id || idea.category));
  };

  const hasUserVoted = (idea) => {
    if (!currentUser) return false;
    if (idea.votes && Array.isArray(idea.votes)) {
      return idea.votes.some(v => v.userId === currentUser.id);
    }
    if (idea.voters && Array.isArray(idea.voters)) {
      return idea.voters.includes(currentUser.id);
    }
    return false;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={24} style={{ color: 'var(--primary-500)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 24px) clamp(12px, 3vw, 32px)', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('ideasListed', { count: ideasTotal })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} style={{ color: 'var(--success-500)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success-600)' }}>
            {t('thisWeek', { count: thisWeekCount })}
          </span>
        </div>
      </div>

      {/* Filter & Sort toggle + active selections */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Toggle button */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filterOpen ? 'var(--primary-300)' : 'var(--border-default)'}`,
              background: filterOpen ? 'color-mix(in srgb, var(--primary-500) 8%, var(--bg-secondary))' : 'var(--bg-primary)',
              color: filterOpen ? 'var(--primary-500)' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <Filter size={14} />
            {t('filterAndSort')}
            <motion.span
              animate={{ rotate: filterOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex' }}
            >
              <ChevronDown size={14} />
            </motion.span>
          </button>

          {/* Active selections next to the button */}
          {selectedStatus !== 'all' && (() => {
            const activeStatus = statuses.find(s => s.id === selectedStatus);
            return activeStatus ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                background: `color-mix(in srgb, ${activeStatus.color} 12%, var(--bg-secondary))`,
                border: `1px solid ${activeStatus.color}`,
                fontSize: '0.75rem', fontWeight: 600, color: activeStatus.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeStatus.color }} />
                {getStatusLabel(activeStatus)}
                <button
                  onClick={() => setSelectedStatus('all')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeStatus.color, padding: 0, display: 'flex', marginLeft: 2 }}
                >
                  <X size={12} />
                </button>
              </span>
            ) : null;
          })()}
          {sortBy !== 'newest' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              background: 'color-mix(in srgb, var(--primary-500) 10%, var(--bg-secondary))',
              border: '1px solid var(--primary-300)',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-500)',
            }}>
              <SlidersHorizontal size={11} />
              {sortOptions.find(o => o.id === sortBy)?.label}
              <button
                onClick={() => setSortBy('newest')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-500)', padding: 0, display: 'flex', marginLeft: 2 }}
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        {/* Collapsible panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 10, padding: '14px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                {/* Status filter */}
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                    {t('status')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedStatus('all')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${selectedStatus === 'all' ? 'var(--primary-300)' : 'var(--border-default)'}`,
                        background: selectedStatus === 'all' ? 'color-mix(in srgb, var(--primary-500) 10%, var(--bg-primary))' : 'var(--bg-primary)',
                        color: selectedStatus === 'all' ? 'var(--primary-500)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: selectedStatus === 'all' ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      {t('allStatuses')}
                    </button>
                    {statuses.map(status => (
                      <button
                        key={status.id}
                        onClick={() => setSelectedStatus(status.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-full)',
                          border: `1px solid ${selectedStatus === status.id ? status.color : 'var(--border-default)'}`,
                          background: selectedStatus === status.id ? `color-mix(in srgb, ${status.color} 12%, var(--bg-primary))` : 'var(--bg-primary)',
                          color: selectedStatus === status.id ? status.color : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: selectedStatus === status.id ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: status.color, flexShrink: 0,
                        }} />
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort options */}
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                    {t('sort')}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-full)',
                          border: `1px solid ${sortBy === opt.id ? 'var(--primary-300)' : 'var(--border-default)'}`,
                          background: sortBy === opt.id ? 'color-mix(in srgb, var(--primary-500) 10%, var(--bg-primary))' : 'var(--bg-primary)',
                          color: sortBy === opt.id ? 'var(--primary-500)' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: sortBy === opt.id ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Idea cards */}
      <div style={{
        display: viewMode === 'grid' ? 'grid' : 'flex',
        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' : undefined,
        flexDirection: viewMode === 'feed' ? 'column' : undefined,
        gap: 16,
      }}>
        {sortedIdeas.map((idea, i) => {
          const status = getStatus(idea);
          const cat = getCategory(idea);
          const hasVoted = hasUserVoted(idea);

          return (
            <motion.div
              key={idea.id}
              className="card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              style={{
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                gap: 16,
              }}
              onClick={() => navigate(`/dashboard/idea/${idea.id}`)}
            >
              {/* Vote control */}
              <div onClick={(e) => e.stopPropagation()}>
                <VoteControl
                  upvotes={idea.upvotes}
                  hasVoted={hasVoted}
                  onVote={(type) => vote(idea.id, type)}
                />
              </div>

              {/* Card content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  {status && (
                    <Badge color={status.color} bg={status.bg} dot>
                      {getStatusLabel(status)}
                    </Badge>
                  )}
                  {cat && cat.id !== 'all' && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {cat.label}
                    </span>
                  )}
                </div>

                <h3 style={{
                  fontSize: viewMode === 'grid' ? '1rem' : '1.0625rem',
                  fontWeight: 700,
                  marginBottom: 6,
                  lineHeight: 1.35,
                  color: 'var(--text-primary)',
                }}>
                  {idea.title}
                </h3>

                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  marginBottom: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  <MarkdownContent content={idea.summary} />
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={idea.author?.name || ''} initials={idea.author?.initials || ''} size="sm" />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {idea.author?.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {formatDate(idea.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {(idea.attachments?.length || 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <Paperclip size={13} />
                        {idea.attachments.length}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      <MessageSquare size={13} />
                      {idea.commentCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Infinite scroll sentinel - always rendered so observer stays attached */}
      <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: ideasHasMore ? 24 : 0 }}>
        {ideasLoadingMore && (
          <Loader2 size={20} style={{ color: 'var(--primary-500)', animation: 'spin 1s linear infinite' }} />
        )}
      </div>

      <NewIdeaModal isOpen={showNewIdea} onClose={() => setShowNewIdea(false)} />
    </div>
  );
}
