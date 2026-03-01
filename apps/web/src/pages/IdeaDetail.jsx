import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MessageSquare, FileText, Image, File, Download,
  Share2, MoreHorizontal, ClipboardList, Loader2, Heart, X, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { wsClient } from '../lib/wsClient';
import { toast } from '../stores/toastStore';
import { Avatar, Badge, VoteControl, Button, ConfirmDialog, useConfirm } from '../components/UI';
import { MarkdownContent } from '../components/MarkdownContent';
import SurveyModal from '../components/SurveyModal';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function IdeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('ideas');
  const ideas = useAppStore(s => s.ideas);
  const categories = useAppStore(s => s.categories);
  const statuses = useAppStore(s => s.statusList);
  const vote = useAppStore(s => s.vote);
  const currentUser = useAuthStore(s => s.user);
  const send = useAppStore(s => s.send);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [confirmDelete, confirmDialogProps] = useConfirm();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const loading = useAppStore(s => s.loading);
  const initialized = useAppStore(s => s.initialized);
  const idea = ideas.find(i => i.id === id);

  // Fetch comments (re-run when idea becomes available after page refresh)
  useEffect(() => {
    if (id && send && idea) {
      send('comments:list', { ideaId: id }).then(setComments).catch(() => {});
    }
  }, [id, send, !!idea]);

  // Listen for comment changes via wsClient directly
  useEffect(() => {
    const refreshComments = (data) => {
      if (data.ideaId === id) {
        send('comments:list', { ideaId: id }).then(setComments).catch(() => {});
      }
    };
    const unsub1 = wsClient.on('comment:created', refreshComments);
    const unsub2 = wsClient.on('comment:liked', refreshComments);
    return () => { unsub1(); unsub2(); };
  }, [id, send]);

  if (!idea) {
    if (loading || !initialized) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>{t('loading')}</p>
        </div>
      );
    }
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('notFound')}</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: 16 }}>
          {t('goBack')}
        </Button>
      </div>
    );
  }

  const status = typeof idea.status === 'object' ? idea.status : statuses.find(s => s.id === (idea.statusId || idea.status));
  const category = (idea.category && typeof idea.category === 'object') ? idea.category : categories.find(c => c.id === (idea.categoryId || idea.category));
  const hasVoted = currentUser && (
    (idea.votes && Array.isArray(idea.votes) && idea.votes.some(v => v.userId === currentUser.id)) ||
    (idea.voters && Array.isArray(idea.voters) && idea.voters.includes(currentUser.id))
  );
  const isAdmin = currentUser?.role === 'admin';

  const currentStatusId = status?.id || idea.statusId || idea.status;
  const statusTimeline = [
    { id: 'pending', label: t('statusPending'), date: idea.createdAt },
    { id: 'reviewing', label: t('statusReviewing'), date: null },
    { id: 'approved', label: t('statusApproved'), date: null },
    { id: 'in-progress', label: t('statusInProgress'), date: null },
    { id: 'completed', label: t('statusCompleted'), date: null },
  ];

  // Build timeline from statuses
  const orderedStatuses = [...statuses].sort((a, b) => (a.order || 0) - (b.order || 0)).filter(s => (s.order || 0) > 0);
  const currentIdx = orderedStatuses.findIndex(s => s.id === currentStatusId);

  const fileIcons = { image: Image, pdf: FileText, doc: File };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const formatTime = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await send('comments:create', { ideaId: id, content: commentText.trim() });
      setCommentText('');
      // Refetch comments to show the new one
      const updated = await send('comments:list', { ideaId: id });
      setComments(updated);
    } catch (err) {
      toast.error(err.message || t('commentFailed'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      await send('comments:create', { ideaId: id, content: replyText.trim(), parentId });
      setReplyingTo(null);
      setReplyText('');
      const updated = await send('comments:list', { ideaId: id });
      setComments(updated);
    } catch (err) {
      toast.error(err.message || t('replyFailed'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLike = async (commentId, alreadyLiked) => {
    try {
      const action = alreadyLiked ? 'comments:unlike' : 'comments:like';
      await send(action, { commentId });
      const updated = await send('comments:list', { ideaId: id });
      setComments(updated);
    } catch (err) {
      toast.error(err.message || t('likeFailed'));
    }
  };

  const attachments = idea.attachments || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 20,
          fontWeight: 500,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        {t('backToIdeas')}
      </button>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <VoteControl
              upvotes={idea.upvotes}
              hasVoted={hasVoted}
              onVote={(type) => vote(idea.id, type)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {status && <Badge color={status.color} bg={status.bg} dot>{status.label}</Badge>}
                    {category && category.id !== 'all' && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                        {category.label}
                      </span>
                    )}
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>
                    {idea.title}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={idea.author?.name || ''} initials={idea.author?.initials || ''} size="md" />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-display)' }}>{idea.author?.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {idea.author?.department} · {formatDate(idea.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isAdmin && (
                <Button variant="secondary" size="sm" icon={ClipboardList} onClick={() => setShowSurveyModal(true)}>
                  {t('createSurvey')}
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={Share2} onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success(t('linkCopied'));
              }}>{t('share')}</Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={async () => {
                    const ok = await confirmDelete({
                      title: t('common:delete'),
                      message: t('deleteConfirm'),
                      confirmLabel: t('common:delete'),
                      cancelLabel: t('common:cancel'),
                    });
                    if (ok) {
                      useAppStore.getState().deleteIdea(idea.id).then(() => navigate('/dashboard'));
                    }
                  }}
                  style={{ color: 'var(--danger-500)' }}
                >
                  {t('common:delete')}
                </Button>
              )}
              </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: 24,
          }}>
            <MarkdownContent content={idea.content} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              marginBottom: 24,
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <File size={14} />
                {t('attachments', { count: attachments.length })}
              </h4>

              {/* Image attachments as grid */}
              {attachments.filter(a => a.mimeType?.startsWith('image/') || a.type === 'image').length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 8,
                  marginBottom: 12,
                }}>
                  {attachments.filter(a => a.mimeType?.startsWith('image/') || a.type === 'image').map((att, idx) => (
                    <div
                      key={att.id}
                      onClick={() => setLightboxIdx(idx)}
                      style={{
                        aspectRatio: '4/3',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={API_URL + att.url}
                        alt={att.filename || att.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Document attachments as list */}
              {attachments.filter(a => !(a.mimeType?.startsWith('image/') || a.type === 'image')).map(att => {
                const type = att.mimeType?.includes('pdf') ? 'pdf' : 'doc';
                const Icon = fileIcons[type] || File;
                return (
                  <div key={att.id} className="file-item" style={{ marginBottom: 6 }}>
                    <div className={`file-item__icon ${type === 'pdf' ? 'file-item__icon--pdf' : 'file-item__icon--doc'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="file-item__info">
                      <p className="file-item__name">{att.filename || att.name}</p>
                      <p className="file-item__size">{att.size ? `${Math.round(att.size / 1024)} KB` : ''}</p>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ gap: 4 }}
                      onClick={async () => {
                        try {
                          const res = await fetch(API_URL + att.url);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = att.filename || att.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          toast.error(t('downloadFailed'));
                        }
                      }}
                    >
                      <Download size={14} />
                      {t('download')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} />
              {t('comments', { count: idea.commentCount || 0 })}
            </h4>

            {/* New comment input */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <Avatar name={currentUser?.name || ''} initials={currentUser?.initials || ''} size="md" />
              <div style={{ flex: 1 }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('commentPlaceholder')}
                  style={{
                    width: '100%',
                    minHeight: 72,
                    padding: '10px 14px',
                    border: '1.5px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-body)',
                    resize: 'vertical',
                    outline: 'none',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                  >
                    {submittingComment ? t('submitting') : t('send')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Comment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  formatTime={formatTime}
                  onReply={handleReply}
                  replyingTo={replyingTo}
                  onCancelReply={handleCancelReply}
                  onSubmitReply={handleSubmitReply}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  submittingReply={submittingReply}
                  onLike={handleLike}
                  currentUserId={currentUser?.id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Status Timeline */}
        <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 88 }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16 }}>
              {t('statusTimeline')}
            </h4>
            <div className="timeline">
              {orderedStatuses.map((step, i) => {
                const isCurrent = step.id === currentStatusId;
                const isPast = currentIdx > i;
                return (
                  <div key={step.id} className="timeline__item">
                    <div className={`timeline__dot ${isCurrent ? 'timeline__dot--active' : isPast ? 'timeline__dot--completed' : ''}`} />
                    <p className="timeline__label" style={{ color: isCurrent ? 'var(--primary-600)' : isPast ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {step.label}
                    </p>
                    {(isCurrent || isPast) && (
                      <p className="timeline__date">{formatDate(idea.createdAt)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginTop: 16,
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12 }}>{t('stats')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: t('totalVotes'), value: idea.upvotes || 0, color: 'var(--primary-600)' },
                { label: t('commentsLabel'), value: idea.commentCount || 0, color: 'var(--info-600)' },
                { label: t('attachmentsLabel'), value: attachments.length, color: 'var(--accent-600)' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{stat.label}</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-display)' }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SurveyModal
        isOpen={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        idea={idea}
      />

      <ConfirmDialog {...confirmDialogProps} />

      {/* Image Lightbox */}
      {lightboxIdx !== null && (() => {
        const images = attachments.filter(a => a.mimeType?.startsWith('image/') || a.type === 'image');
        const current = images[lightboxIdx];
        if (!current) return null;
        return (
          <div
            onClick={() => setLightboxIdx(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={20} />
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); }}
                style={{
                  position: 'absolute',
                  left: 16,
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Image */}
            <img
              onClick={(e) => e.stopPropagation()}
              src={API_URL + current.url}
              alt={current.filename || current.name}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            />

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % images.length); }}
                style={{
                  position: 'absolute',
                  right: 16,
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Filename + counter */}
            <div style={{
              position: 'absolute',
              bottom: 20,
              color: '#fff',
              fontSize: '0.875rem',
              textAlign: 'center',
              opacity: 0.8,
            }}>
              {current.filename || current.name}
              {images.length > 1 && ` (${lightboxIdx + 1}/${images.length})`}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}

function CommentItem({ comment, formatTime, onReply, replyingTo, onCancelReply, onSubmitReply, replyText, setReplyText, submittingReply, onLike, currentUserId }) {
  const { t } = useTranslation('ideas');
  const author = comment.author || comment.user || {};
  const isReplying = replyingTo === comment.id;
  const likes = comment.likes || [];
  const hasLiked = currentUserId && likes.some(l => l.userId === currentUserId);
  const likeCount = comment.likeCount || likes.length;

  return (
    <div className="comment">
      <Avatar name={author.name || ''} initials={author.initials || ''} size="md" />
      <div className="comment__body">
        <div className="comment__header">
          <span className="comment__author">{author.name}</span>
          <span className="comment__time">{formatTime(comment.createdAt)}</span>
        </div>
        <p className="comment__content">{comment.content}</p>
        <div className="comment__actions">
          {!comment.parentId && (
            <button className="comment__action-btn" onClick={() => onReply(comment.id)}>
              {t('reply')}
            </button>
          )}
          <button
            className="comment__action-btn"
            onClick={() => onLike(comment.id, hasLiked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: hasLiked ? 'var(--error-500)' : undefined,
            }}
          >
            <Heart size={12} fill={hasLiked ? 'var(--error-500)' : 'none'} />
            {likeCount > 0 ? likeCount : t('like')}
          </button>
        </div>

        {isReplying && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('replyPlaceholder')}
              autoFocus
              style={{
                width: '100%',
                minHeight: 56,
                padding: '8px 12px',
                border: '1.5px solid var(--primary-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
                outline: 'none',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={onCancelReply}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => onSubmitReply(comment.id)}
                disabled={!replyText.trim() || submittingReply}
              >
                {submittingReply ? t('submitting') : t('reply')}
              </button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="comment__replies">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                formatTime={formatTime}
                onReply={onReply}
                replyingTo={replyingTo}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                replyText={replyText}
                setReplyText={setReplyText}
                submittingReply={submittingReply}
                onLike={onLike}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
