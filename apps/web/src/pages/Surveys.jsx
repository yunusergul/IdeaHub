import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Star, CheckCircle, BarChart3, Loader2, SlidersHorizontal, Filter, Clock, Zap, Trophy } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Badge, Button } from '../components/UI';
import { SurveyCardSkeleton } from '../components/Skeleton';

function StarRating({ rating, onRate, readonly = false, size = 20 }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => !readonly && onRate(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          style={{
            background: 'none',
            border: 'none',
            cursor: readonly ? 'default' : 'pointer',
            padding: 2,
            display: 'flex',
            transition: 'transform 150ms ease',
            transform: !readonly && hover === star ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          <Star
            size={size}
            fill={(hover || rating) >= star ? 'var(--warning-400)' : 'none'}
            stroke={(hover || rating) >= star ? 'var(--warning-400)' : 'var(--border-strong)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function getDueDateLabel(dueDate, t) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due - now;
  if (diff <= 0) return t('expired');
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return t('daysLeft', { count: days });
  if (hours > 0) return t('hoursLeft', { count: hours });
  return t('almostDone');
}

export default function Surveys() {
  const { t } = useTranslation('surveys');
  const surveysList = useAppStore(s => s.surveysList);
  const currentUser = useAuthStore(s => s.user);
  const voteSurvey = useAppStore(s => s.voteSurvey);
  const rateSurvey = useAppStore(s => s.rateSurvey);
  const loading = useAppStore(s => s.loading);
  const surveysHasMore = useAppStore(s => s.surveysHasMore);
  const surveysLoadingMore = useAppStore(s => s.surveysLoadingMore);
  const loadMoreSurveys = useAppStore(s => s.loadMoreSurveys);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  const surveysHasMoreRef = useRef(surveysHasMore);
  surveysHasMoreRef.current = surveysHasMore;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const scrollRoot = sentinel.closest('main');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && surveysHasMoreRef.current) loadMoreSurveys();
      },
      { root: scrollRoot, rootMargin: '100px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreSurveys, loading]);

  const [filterBy, _setFilterBy] = useState(() => localStorage.getItem('ideahub-survey-filter') || 'unanswered');
  const setFilterBy = (v) => { _setFilterBy(v); localStorage.setItem('ideahub-survey-filter', v); };

  const hasUserVoted = (survey) => {
    if (survey.votedBy && Array.isArray(survey.votedBy)) {
      return survey.votedBy.includes(currentUser?.id);
    }
    return survey.options.some(opt =>
      Array.isArray(opt.votes) && opt.votes.some(v => v.userId === currentUser?.id)
    );
  };

  const filteredSurveys = useMemo(() => {
    // Search is now server-side via pagination
    let list = surveysList;

    switch (filterBy) {
      case 'unanswered':
        return list.filter(s => s.isActive && !hasUserVoted(s));
      case 'answered':
        return list.filter(s => hasUserVoted(s));
      case 'active':
        return list.filter(s => s.isActive);
      case 'ended':
        return list.filter(s => !s.isActive);
      case 'development':
        return list.filter(s => s.type === 'development');
      default:
        return list;
    }
  }, [surveysList, filterBy, currentUser]);

  const [sortBy, _setSortBy] = useState(() => localStorage.getItem('ideahub-survey-sort') || 'newest');
  const setSortBy = (v) => { _setSortBy(v); localStorage.setItem('ideahub-survey-sort', v); };
  const [sortOpen, setSortOpen] = useState(false);
  const navigate = useNavigate();

  const sortOptions = [
    { id: 'newest', label: t('newest') },
    { id: 'mostVoted', label: t('mostVoted') },
    { id: 'highestRated', label: t('highestRated') },
  ];

  const sortedSurveys = useMemo(() => {
    const list = [...filteredSurveys];
    switch (sortBy) {
      case 'mostVoted':
        return list.sort((a, b) => {
          const aVotes = a.options.reduce((s, o) => s + (typeof o.votes === 'number' ? o.votes : (Array.isArray(o.votes) ? o.votes.length : 0)), 0);
          const bVotes = b.options.reduce((s, o) => s + (typeof o.votes === 'number' ? o.votes : (Array.isArray(o.votes) ? o.votes.length : 0)), 0);
          return bVotes - aVotes;
        });
      case 'highestRated': {
        const getAvg = (s) => {
          if (s.avgRating) return s.avgRating;
          if (Array.isArray(s.ratings) && s.ratings.length > 0) {
            return s.ratings.reduce((sum, r) => sum + r.rating, 0) / s.ratings.length;
          }
          return 0;
        };
        return list.sort((a, b) => getAvg(b) - getAvg(a));
      }
      case 'newest':
      default:
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [filteredSurveys, sortBy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Loader2 size={24} style={{ color: 'var(--primary-500)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{t('title')}</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
        {t('subtitle')}
      </p>

      {/* Filter & Sort bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${sortOpen ? 'var(--primary-300)' : 'var(--border-default)'}`,
            background: sortOpen ? 'var(--primary-50)' : 'var(--bg-primary)',
            color: sortOpen ? 'var(--primary-700)' : 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <SlidersHorizontal size={14} />
          {t('filterAndSort')}
        </button>
        {filterBy !== 'unanswered' && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--primary-700)',
          }}>
            <Filter size={12} />
            {[
              { id: 'all', label: t('all') },
              { id: 'answered', label: t('answered') },
              { id: 'active', label: t('activeFilter') },
              { id: 'ended', label: t('endedFilter') },
              { id: 'development', label: t('development') },
            ].find(f => f.id === filterBy)?.label}
          </span>
        )}
        {sortBy !== 'newest' && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--primary-700)',
          }}>
            {sortOptions.find(o => o.id === sortBy)?.label}
          </span>
        )}
      </div>
      <AnimatePresence>
        {sortOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('filterLabel')}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { id: 'unanswered', label: t('unanswered') },
                    { id: 'all', label: t('all') },
                    { id: 'answered', label: t('answered') },
                    { id: 'active', label: t('activeFilter') },
                    { id: 'ended', label: t('endedFilter') },
                    { id: 'development', label: t('development') },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterBy(f.id)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${filterBy === f.id ? 'var(--primary-300)' : 'var(--border-default)'}`,
                        background: filterBy === f.id ? 'var(--primary-50)' : 'var(--bg-primary)',
                        color: filterBy === f.id ? 'var(--primary-700)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: filterBy === f.id ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border-default)' }} />
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('sortLabel')}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedSurveys.length === 0 && (
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <ClipboardList size={40} className="empty-state__icon" />
            <p className="empty-state__title">
              {filterBy === 'unanswered' ? t('allAnswered') : t('noSurveys')}
            </p>
            <p className="empty-state__text">
              {filterBy === 'unanswered'
                ? t('allAnsweredDesc')
                : t('noSurveysDesc')}
            </p>
          </div>
        )}
        {sortedSurveys.map((survey, i) => {
          const isDevelopment = survey.type === 'development';

          // Handle both mock and backend data shapes
          const getOptionVotes = (opt) => {
            if (typeof opt.votes === 'number') return opt.votes;
            if (Array.isArray(opt.votes)) return opt.votes.length;
            return 0;
          };

          const totalVotes = survey.options.reduce((sum, o) => sum + getOptionVotes(o), 0);

          // Check if user has voted
          const hasVoted = (() => {
            if (survey.votedBy && Array.isArray(survey.votedBy)) {
              return survey.votedBy.includes(currentUser?.id);
            }
            return survey.options.some(opt =>
              Array.isArray(opt.votes) && opt.votes.some(v => v.userId === currentUser?.id)
            );
          })();

          // Get user rating
          const userRating = (() => {
            if (survey.ratings && !Array.isArray(survey.ratings) && currentUser) {
              return survey.ratings[currentUser.id] || 0;
            }
            if (Array.isArray(survey.ratings) && currentUser) {
              const r = survey.ratings.find(r => r.userId === currentUser.id);
              return r?.rating || 0;
            }
            return 0;
          })();

          // Average rating
          const avgRating = (() => {
            if (survey.avgRating) return survey.avgRating;
            if (Array.isArray(survey.ratings) && survey.ratings.length > 0) {
              const avg = survey.ratings.reduce((s, r) => s + r.rating, 0) / survey.ratings.length;
              return Math.round(avg * 10) / 10;
            }
            return 0;
          })();

          const ratingCount = Array.isArray(survey.ratings) ? survey.ratings.length : (survey.ratingCount || 0);

          // Target departments
          const targetDepts = survey.targetDepartments || [];

          // Find winning option for completed development surveys
          const winningOption = isDevelopment && !survey.isActive
            ? survey.options.reduce((best, opt) => {
                const votes = getOptionVotes(opt);
                return votes > getOptionVotes(best) ? opt : best;
              }, survey.options[0])
            : null;

          return (
            <motion.div
              key={survey.id}
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => navigate(`/dashboard/surveys/${survey.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={16} style={{ color: 'var(--primary-500)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{survey.title}</h3>
                  {isDevelopment && (
                    <Badge color="var(--primary-600)" bg="var(--primary-50)">{t('development')}</Badge>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isDevelopment && avgRating > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      background: 'var(--warning-50)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--warning-600)',
                    }}>
                      <Star size={12} fill="var(--warning-400)" stroke="var(--warning-400)" />
                      {avgRating} ({ratingCount})
                    </div>
                  )}
                  {isDevelopment && survey.dueDate && survey.isActive && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      background: 'var(--warning-50)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--warning-700)',
                    }}>
                      <Clock size={12} />
                      {getDueDateLabel(survey.dueDate, t)}
                    </div>
                  )}
                  {isDevelopment && survey.autoTransition && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '3px 8px',
                      background: 'var(--primary-50)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--primary-600)',
                    }}>
                      <Zap size={11} />
                      {t('autoTransition')}
                    </div>
                  )}
                  <Badge
                    color={survey.isActive ? 'var(--success-600)' : 'var(--text-tertiary)'}
                    bg={survey.isActive ? 'var(--success-50)' : 'var(--bg-tertiary)'}
                    dot
                  >
                    {survey.isActive ? t('active') : t('ended')}
                  </Badge>
                </div>
              </div>

              {/* Winner banner for completed development surveys */}
              {winningOption && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, var(--success-50), var(--primary-50))',
                  border: '1px solid var(--success-200)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 14,
                }}>
                  <Trophy size={16} style={{ color: 'var(--warning-500)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-700)' }}>{t('winnerLabel')} </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {winningOption.idea?.title || winningOption.label}
                    </span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>
                {survey.question}
              </p>

              <div>
                {survey.options.map(opt => {
                  const votes = getOptionVotes(opt);
                  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  return (
                    <div
                      key={opt.id}
                      className="survey-bar"
                      onClick={(e) => {
                        if (survey.isActive && !hasVoted) {
                          e.stopPropagation();
                          voteSurvey(survey.id, opt.id);
                        }
                      }}
                      style={{
                        cursor: survey.isActive && !hasVoted ? 'pointer' : 'default',
                        transition: 'transform 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (survey.isActive && !hasVoted) e.currentTarget.style.transform = 'scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div className="survey-bar__header">
                        <span className="survey-bar__label">
                          {survey.isActive && !hasVoted && (
                            <span style={{
                              display: 'inline-flex',
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: '2px solid var(--border-strong)',
                              marginRight: 8,
                              flexShrink: 0,
                              verticalAlign: 'middle',
                            }} />
                          )}
                          {opt.idea?.title || opt.text || opt.label}
                        </span>
                        <span className="survey-bar__value">{t('votePct', { count: votes, pct })}</span>
                      </div>
                      <div className="survey-bar__track">
                        <div className="survey-bar__fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasVoted && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  padding: '6px 10px',
                  background: 'var(--success-50)',
                  borderRadius: 'var(--radius-md)',
                  width: 'fit-content',
                }}>
                  <CheckCircle size={14} style={{ color: 'var(--success-600)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-700)' }}>
                    {t('voteRecorded')}
                  </span>
                </div>
              )}

              {/* Rating section - hide for development surveys */}
              {!isDevelopment && (
                <div style={{
                  marginTop: 16,
                  padding: '14px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>{t('rateSurvey')}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {userRating > 0 ? t('yourRating', { rating: userRating }) : t('notRated')}
                    </p>
                  </div>
                  <StarRating
                    rating={userRating}
                    onRate={(r) => rateSurvey(survey.id, r)}
                  />
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--border-default)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {targetDepts.length > 0 ? t('target', { departments: targetDepts.join(', ') }) : ''}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {t('totalVotes', { count: totalVotes })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Infinite scroll: sentinel triggers load, skeletons stay visible until data arrives */}
      {surveysHasMore && (
        <>
          <div ref={sentinelRef} style={{ height: 1 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16, marginTop: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => <SurveyCardSkeleton key={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
