import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ClipboardList, Star, CheckCircle, Calendar,
  Users, User, Link as LinkIcon, Clock, Zap, Trophy, Trash2
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Badge, Button, ConfirmDialog, useConfirm } from '../components/UI';
import type { EnrichedSurvey } from '../types';

interface StarRatingProps {
  rating: number;
  onRate: (star: number) => void;
  readonly?: boolean;
  size?: number;
}

function StarRating({ rating, onRate, readonly = false, size = 24 }: StarRatingProps) {
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

export default function SurveyDetail() {
  const { t } = useTranslation('surveys');
  const { id } = useParams();
  const navigate = useNavigate();
  const surveysList = useAppStore(s => s.surveysList);
  const voteSurvey = useAppStore(s => s.voteSurvey);
  const rateSurvey = useAppStore(s => s.rateSurvey);
  const currentUser = useAuthStore(s => s.user);
  const [confirmDelete, confirmDialogProps] = useConfirm();

  const survey = surveysList.find(s => s.id === id);

  if (!survey) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('surveyNotFound')}</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard/surveys')} style={{ marginTop: 16 }}>
          <ArrowLeft size={14} />
          {t('backToSurveys')}
        </Button>
      </div>
    );
  }

  const isDevelopment = survey.type === 'development';

  const getOptionVotes = (opt: EnrichedSurvey['options'][number]): number => {
    if (typeof opt.votes === 'number') return opt.votes;
    if (Array.isArray(opt.votes)) return opt.votes.length;
    return 0;
  };

  const totalVotes = survey.options.reduce((sum, o) => sum + getOptionVotes(o), 0);

  const hasVoted = (() => {
    if (survey.votedBy && Array.isArray(survey.votedBy)) {
      return survey.votedBy.includes(currentUser?.id ?? '');
    }
    return survey.options.some(opt =>
      Array.isArray(opt.votes) && opt.votes.some(v => v.userId === currentUser?.id)
    );
  })();

  const userRating = (() => {
    if (survey.ratings && !Array.isArray(survey.ratings) && currentUser) {
      return (survey.ratings as Record<string, number>)[currentUser.id] || 0;
    }
    if (Array.isArray(survey.ratings) && currentUser) {
      const r = survey.ratings.find(r => r.userId === currentUser.id);
      return r?.rating || 0;
    }
    return 0;
  })();

  const avgRating = (() => {
    if (survey.avgRating) return survey.avgRating;
    if (Array.isArray(survey.ratings) && survey.ratings.length > 0) {
      const avg = survey.ratings.reduce((s, r) => s + r.rating, 0) / survey.ratings.length;
      return Math.round(avg * 10) / 10;
    }
    return 0;
  })();

  const ratingCount = Array.isArray(survey.ratings) ? survey.ratings.length : (survey.ratingCount || 0);
  const targetDepts = survey.targetDepartments || [];

  const firstOption = survey.options[0];
  const winningOption = isDevelopment && !survey.isActive && firstOption
    ? survey.options.reduce((best, opt) => {
        const votes = getOptionVotes(opt);
        return votes > getOptionVotes(best) ? opt : best;
      }, firstOption)
    : null;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/surveys')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 20,
          transition: 'all 150ms',
        }}
      >
        <ArrowLeft size={16} />
        {t('backToSurveys')}
      </button>

      {/* Main card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '28px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={20} style={{ color: 'var(--primary-500)' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {survey.title}
            </h1>
            {isDevelopment && (
              <Badge color="var(--primary-600)" bg="var(--primary-50)">{t('development')}</Badge>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isDevelopment && avgRating > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background: 'var(--warning-50)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--warning-600)',
              }}>
                <Star size={14} fill="var(--warning-400)" stroke="var(--warning-400)" />
                {avgRating} ({ratingCount})
              </div>
            )}
            <Badge
              color={survey.isActive ? 'var(--success-600)' : 'var(--text-tertiary)'}
              bg={survey.isActive ? 'var(--success-50)' : 'var(--bg-tertiary)'}
              dot
            >
              {survey.isActive ? t('active') : t('ended')}
            </Badge>
            {currentUser?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={async () => {
                  const ok = await confirmDelete({
                    title: t('delete'),
                    message: t('deleteConfirm'),
                    confirmLabel: t('delete'),
                    cancelLabel: t('common:cancel'),
                  });
                  if (ok) {
                    useAppStore.getState().deleteSurvey(survey.id).then(() => navigate('/dashboard/surveys'));
                  }
                }}
                style={{ color: 'var(--danger-500)' }}
              >
                {t('delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Development survey meta info */}
        {isDevelopment && (survey.dueDate || survey.autoTransition) && (
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}>
            {survey.dueDate && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--warning-50)',
                border: '1px solid var(--warning-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--warning-700)',
              }}>
                <Clock size={14} />
                {t('endDate', { date: new Date(survey.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
              </div>
            )}
            {survey.autoTransition && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--primary-50)',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--primary-700)',
              }}>
                <Zap size={14} />
                {t('autoTransitionLabel')}
                {survey.targetStatus && ` → ${survey.targetStatus.label}`}
                {survey.targetSprint && ` (${survey.targetSprint.label})`}
              </div>
            )}
          </div>
        )}

        {/* Winner banner for completed development surveys */}
        {winningOption && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            background: 'linear-gradient(135deg, var(--success-50), var(--primary-50))',
            border: '1px solid var(--success-200)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 20,
          }}>
            <Trophy size={20} style={{ color: 'var(--warning-500)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-600)', marginBottom: 2 }}>
                {t('winnerIdea')}
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {winningOption.idea?.title || winningOption.label}
              </p>
              {survey.transitionedAt && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {t('transitioned', { date: new Date(survey.transitionedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          border: '1px solid var(--border-default)',
        }}>
          <p style={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
            {survey.question}
          </p>
        </div>

        {/* Options / Vote bars */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {t('options')}
          </h3>
          {survey.options.map(opt => {
            const votes = getOptionVotes(opt);
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isWinner = winningOption?.id === opt.id;
            return (
              <div
                key={opt.id}
                className="survey-bar"
                onClick={() => survey.isActive && !hasVoted && voteSurvey(survey.id, opt.id)}
                style={{
                  cursor: survey.isActive && !hasVoted ? 'pointer' : 'default',
                  transition: 'transform 100ms ease',
                  ...(isWinner ? { border: '1.5px solid var(--success-300)', background: 'var(--success-50)' } : {}),
                }}
                onMouseEnter={(e) => {
                  if (survey.isActive && !hasVoted) (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                <div className="survey-bar__header">
                  <span className="survey-bar__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {survey.isActive && !hasVoted && (
                      <span style={{
                        display: 'inline-flex',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid var(--border-strong)',
                        flexShrink: 0,
                        verticalAlign: 'middle',
                      }} />
                    )}
                    {isWinner && <Trophy size={14} style={{ color: 'var(--warning-500)', flexShrink: 0 }} />}
                    <span>
                      {opt.idea?.title || opt.text || opt.label}
                    </span>
                    {isDevelopment && opt.idea && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/idea/${opt.idea!.id}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--primary-500)',
                          padding: 2,
                          display: 'flex',
                          flexShrink: 0,
                        }}
                        title={t('viewIdeaTooltip')}
                      >
                        <LinkIcon size={13} />
                      </button>
                    )}
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
            marginBottom: 20,
            padding: '8px 12px',
            background: 'var(--success-50)',
            borderRadius: 'var(--radius-md)',
            width: 'fit-content',
          }}>
            <CheckCircle size={14} style={{ color: 'var(--success-600)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success-700)' }}>
              {t('voteRecorded')}
            </span>
          </div>
        )}

        {/* Rating section - hide for development surveys */}
        {!isDevelopment && (
          <div style={{
            padding: '18px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            border: '1px solid var(--border-default)',
          }}>
            <div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 4 }}>{t('rateSurvey')}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {userRating > 0 ? t('yourRating', { rating: userRating }) : t('notRated')}
              </p>
            </div>
            <StarRating
              rating={userRating}
              onRate={(r) => rateSurvey(survey.id, r)}
            />
          </div>
        )}

        {/* Linked idea */}
        {survey.ideaId && (
          <button
            onClick={() => navigate(`/dashboard/idea/${survey.ideaId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              marginBottom: 20,
              width: '100%',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--primary-700)',
              transition: 'all 150ms',
            }}
          >
            <LinkIcon size={14} />
            {t('viewLinkedIdea')}
          </button>
        )}

        {/* Meta info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          borderTop: '1px solid var(--border-default)',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {targetDepts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                <Users size={14} />
                {targetDepts.join(', ')}
              </div>
            )}
            {survey.createdBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                <User size={14} />
                {typeof survey.createdBy === 'string' ? survey.createdBy : survey.createdBy.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {survey.createdAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                <Calendar size={14} />
                {new Date(survey.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('totalVotes', { count: totalVotes })}
            </span>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
