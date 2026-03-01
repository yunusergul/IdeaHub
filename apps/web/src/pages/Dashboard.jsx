import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Paperclip, TrendingUp, Loader2, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar, Badge, VoteControl } from '../components/UI';
import { MarkdownContent } from '../components/MarkdownContent';
import NewIdeaModal from '../components/NewIdeaModal';

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const ideas = useAppStore(s => s.ideas);
  const ideasTotal = useAppStore(s => s.ideasTotal);
  const ideasHasMore = useAppStore(s => s.ideasHasMore);
  const ideasLoadingMore = useAppStore(s => s.ideasLoadingMore);
  const loadMoreIdeas = useAppStore(s => s.loadMoreIdeas);
  const statuses = useAppStore(s => s.statusList);
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
  const [sortOpen, setSortOpen] = useState(false);

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

      {/* Sort bar */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${sortBy !== 'newest' ? 'var(--primary-300)' : 'var(--border-default)'}`,
            background: sortBy !== 'newest' ? 'var(--primary-50)' : 'var(--bg-primary)',
            color: sortBy !== 'newest' ? 'var(--primary-700)' : 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <SlidersHorizontal size={14} />
          {t('sortBy', { label: sortOptions.find(o => o.id === sortBy)?.label })}
        </button>
        <AnimatePresence>
          {sortOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {sortOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setSortOpen(false); }}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1px solid ${sortBy === opt.id ? 'var(--primary-300)' : 'var(--border-default)'}`,
                      background: sortBy === opt.id ? 'var(--primary-50)' : 'var(--bg-primary)',
                      color: sortBy === opt.id ? 'var(--primary-700)' : 'var(--text-secondary)',
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
                      {status.label}
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
