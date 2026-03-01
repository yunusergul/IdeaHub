import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image, File, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Modal, Button, Badge } from './UI';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { uploadFile } from '../lib/api';

export default function NewIdeaModal({ isOpen, onClose }) {
  const { t } = useTranslation('ideas');
  const categories = useAppStore(s => s.categories);
  const addIdea = useAppStore(s => s.addIdea);
  const ideas = useAppStore(s => s.ideas);
  const accessToken = useAuthStore(s => s.accessToken);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const titleRef = useRef(null);

  // AI suggestion simulation - check against loaded ideas
  useEffect(() => {
    if (title.length < 4) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      const matches = ideas.filter(idea =>
        idea.title.toLowerCase().includes(title.toLowerCase().slice(0, 8)) ||
        (idea.summary || '').toLowerCase().includes(title.toLowerCase().slice(0, 8))
      ).slice(0, 3);
      if (matches.length > 0) {
        setSuggestions(matches);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, ideas]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const addFiles = (newFiles) => {
    const mapped = newFiles.map(f => ({
      id: `f${Date.now()}-${Math.random()}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'pdf' : 'doc',
      file: f, // Keep the actual File object for upload
    }));
    setFiles(prev => [...prev, ...mapped]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !category || submitting) return;
    setSubmitting(true);
    try {
      // Upload files first if any
      let attachmentIds = [];
      if (files.length > 0 && accessToken) {
        const uploads = await Promise.all(
          files.map(f => uploadFile(f.file, accessToken).catch(() => null))
        );
        attachmentIds = uploads.filter(Boolean).map(u => u.id);
      }

      await addIdea({
        title,
        summary: content.slice(0, 150),
        content,
        category,
        attachmentIds,
      });

      setTitle('');
      setCategory('');
      setContent('');
      setFiles([]);
      onClose();
    } catch (err) {
      console.error('Failed to create idea:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fileIcons = { image: Image, pdf: FileText, doc: File };
  const fileColors = { image: 'file-item__icon--image', pdf: 'file-item__icon--pdf', doc: 'file-item__icon--doc' };

  const filteredCategories = categories.filter(c => c.id !== 'all');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newIdeaTitle')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={!title.trim() || !category || submitting}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {t('submitting')}
              </span>
            ) : (
              t('shareIdea')
            )}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title with AI suggestions */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">{t('titleLabel')}</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={t('titlePlaceholder')}
            disabled={submitting}
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                className="ai-suggestion"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <div className="ai-suggestion__header">
                  <Sparkles size={12} />
                  {t('similarIdeas')}
                </div>
                {suggestions.map(s => (
                  <div key={s.id} className="ai-suggestion__item">
                    <AlertCircle size={14} style={{ color: 'var(--warning-500)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.title}</p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {s.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">{t('categoryLabel')}</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          >
            <option value="">{t('categoryPlaceholder')}</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Rich text editor (simplified) */}
        <div className="form-group">
          <label className="form-label">{t('descriptionLabel')}</label>
          <div style={{
            border: '1.5px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '6px 8px',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
            }}>
              {['B', 'I', 'U'].map(btn => (
                <button
                  key={btn}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: btn === 'B' ? 700 : 400,
                    fontStyle: btn === 'I' ? 'italic' : 'normal',
                    textDecoration: btn === 'U' ? 'underline' : 'none',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {btn}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: 'var(--border-default)', margin: '0 4px' }} />
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                {t('addFile')}
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              disabled={submitting}
              style={{
                width: '100%',
                minHeight: 160,
                padding: '12px 14px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontSize: '0.9375rem',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.6,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Dropzone */}
        <div
          className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} className="dropzone__icon" style={{ color: dragActive ? 'var(--primary-500)' : 'var(--text-tertiary)' }} />
          <p className="dropzone__text">
            {t('dropzoneText')} <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>{t('clickHere')}</span>
          </p>
          <p className="dropzone__hint">{t('dropHint')}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => addFiles(Array.from(e.target.files))}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map(file => {
              const Icon = fileIcons[file.type] || File;
              return (
                <div key={file.id} className="file-item">
                  <div className={`file-item__icon ${fileColors[file.type] || ''}`}>
                    <Icon size={16} />
                  </div>
                  <div className="file-item__info">
                    <p className="file-item__name">{file.name}</p>
                    <p className="file-item__size">{file.size}</p>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
