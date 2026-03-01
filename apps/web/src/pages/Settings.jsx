import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Tags, Users, Zap, Link2, Plus, Trash2, Edit3, Save,
  Moon, Sun, Monitor, Bell, Smartphone, Shield, ExternalLink,
  ChevronRight, Check, X, Calendar, Play, Pause,
  Palette, GripVertical, Mail
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Button, Avatar, Badge, Toggle } from '../components/UI';
import { toast } from '../stores/toastStore';
import { INTEGRATION_DEFS } from '../lib/integrations';
import { useTranslation } from 'react-i18next';

const tabDefs = [
  { id: 'profile', icon: User },
  { id: 'appearance', icon: Palette },
  { id: 'sprints', icon: Calendar, admin: true },
  { id: 'categories', icon: Tags, admin: true },
  { id: 'users', icon: Users, admin: true },
  { id: 'voting', icon: Zap, admin: true },
  { id: 'integrations', icon: Link2, admin: true },
];

export default function Settings() {
  const { t } = useTranslation('settings');
  const currentUser = useAuthStore(s => s.user);
  const votingRulesList = useAppStore(s => s.votingRulesList);
  const setVotingRulesList = useAppStore(s => s.setVotingRulesList);
  const sprintsList = useAppStore(s => s.sprintsList);
  const addSprint = useAppStore(s => s.addSprint);
  const updateSprint = useAppStore(s => s.updateSprint);
  const deleteSprint = useAppStore(s => s.deleteSprint);
  const setActiveSprint = useAppStore(s => s.setActiveSprint);
  const ideas = useAppStore(s => s.ideas);
  const categories = useAppStore(s => s.categories);
  const statuses = useAppStore(s => s.statusList);
  const send = useAppStore(s => s.send);
  const [activeTab, setActiveTab] = useState('profile');
  const [usersList, setUsersList] = useState([]);
  const isAdmin = currentUser?.role === 'admin';

  // Fetch users list for admin tab
  useEffect(() => {
    if (isAdmin && send) {
      send('users:list', {}).then(setUsersList).catch(() => {});
    }
  }, [isAdmin, send]);

  const tabs = tabDefs.map(td => ({ ...td, label: t(`tabs.${td.id}`) }));
  const visibleTabs = tabs.filter(tb => !tb.admin || isAdmin);

  return (
    <div className="settings-page" style={{ padding: 'clamp(16px, 3vw, 24px) clamp(12px, 3vw, 32px)', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>{t('title')}</h1>

      <div className="settings-layout" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Tab navigation */}
        <nav className="settings-nav" style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '6px',
          display: 'flex',
        }}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive ? 'var(--primary-50)' : 'transparent',
                  color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.admin && (
                  <Shield size={10} style={{ color: 'var(--warning-500)', marginLeft: 'auto' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <ProfileTab currentUser={currentUser} />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'sprints' && <SprintsTab sprints={sprintsList} ideas={ideas} addSprint={addSprint} updateSprint={updateSprint} deleteSprint={deleteSprint} setActiveSprint={setActiveSprint} />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'voting' && <VotingTab rules={votingRulesList} setRules={setVotingRulesList} />}
              {activeTab === 'integrations' && <IntegrationsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ============ PROFILE TAB ============ */
function ProfileTab({ currentUser }) {
  const { t, i18n } = useTranslation('settings');
  const send = useAppStore(s => s.send);
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    send('preferences:get', {}).then(setPrefs).catch(() => {});
  }, [send]);

  const togglePref = async (key) => {
    if (!prefs) return;
    const newValue = !prefs[key];
    const oldPrefs = { ...prefs };
    setPrefs(p => ({ ...p, [key]: newValue }));
    try {
      const updated = await send('preferences:update', { [key]: newValue });
      setPrefs(updated);
    } catch {
      setPrefs(oldPrefs);
      toast.error(t('profile.prefSaveFailed'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Profile info */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{t('profile.info')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar name={currentUser.name} initials={currentUser.initials} size="xl" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.125rem', fontFamily: 'var(--font-display)' }}>{currentUser.name}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{currentUser.department}</p>
          </div>
          <Badge color="var(--primary-600)" bg="var(--primary-50)" style={{ marginLeft: 'auto' }}>
            Azure AD
          </Badge>
        </div>
        <div className="settings-grid-2col" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          padding: '16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
        }}>
          {[
            { label: t('profile.name'), value: currentUser.name },
            { label: t('profile.email'), value: currentUser.email },
            { label: t('profile.department'), value: currentUser.department },
            { label: t('profile.role'), value: currentUser.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleUser') },
          ].map(field => (
            <div key={field.label}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{field.label}</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{field.value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 10 }}>
          {t('profile.azureNote')}
        </p>
      </div>

      {/* Language selector */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{t('profile.language')}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t('profile.languageDesc')}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { code: 'tr', label: 'Türkçe' },
            { code: 'en', label: 'English' },
          ].map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                localStorage.setItem('ideahub-locale', lang.code);
                send('users:update', { locale: lang.code }).catch(() => {});
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${i18n.language === lang.code ? 'var(--primary-500)' : 'var(--border-default)'}`,
                background: i18n.language === lang.code ? 'var(--primary-50)' : 'var(--bg-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: i18n.language === lang.code ? 'var(--primary-700)' : 'var(--text-secondary)',
                fontWeight: i18n.language === lang.code ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 150ms ease',
              }}
            >
              {lang.label}
              {i18n.language === lang.code && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Notification preferences */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{t('profile.notifPrefs')}</h3>
        {!prefs ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{t('common:loading')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-default)' }}>
              <Smartphone size={16} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('profile.appNotifs')}</span>
            </div>
            <Toggle label={t('profile.commentNotif')} checked={prefs.notifyAppComment} onChange={() => togglePref('notifyAppComment')} />
            <Toggle label={t('profile.voteNotif')} checked={prefs.notifyAppVote} onChange={() => togglePref('notifyAppVote')} />
            <Toggle label={t('profile.statusNotif')} checked={prefs.notifyAppStatus} onChange={() => togglePref('notifyAppStatus')} />
            <Toggle label={t('profile.surveyNotif')} checked={prefs.notifyAppSurvey} onChange={() => togglePref('notifyAppSurvey')} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, paddingTop: 10, borderBottom: '1px solid var(--border-default)' }}>
              <Mail size={16} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('profile.emailNotifs')}</span>
            </div>
            <Toggle label={t('profile.commentEmailNotif')} checked={prefs.notifyEmailComment} onChange={() => togglePref('notifyEmailComment')} />
            <Toggle label={t('profile.voteEmailNotif')} checked={prefs.notifyEmailVote} onChange={() => togglePref('notifyEmailVote')} />
            <Toggle label={t('profile.statusEmailNotif')} checked={prefs.notifyEmailStatus} onChange={() => togglePref('notifyEmailStatus')} />
            <Toggle label={t('profile.surveyEmailNotif')} checked={prefs.notifyEmailSurvey} onChange={() => togglePref('notifyEmailSurvey')} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ APPEARANCE TAB ============ */
function AppearanceTab() {
  const { t } = useTranslation('settings');
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const appSettings = useAppStore(s => s.appSettings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const currentUser = useAuthStore(s => s.user);
  const isAdmin = currentUser?.role === 'admin';

  const currentPalette = appSettings?.palette || 'indigo';
  const [selectedPalette, setSelectedPalette] = useState(currentPalette);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedPalette(appSettings?.palette || 'indigo');
  }, [appSettings?.palette]);

  const palettes = [
    { id: 'indigo', label: t('appearance.indigo'), color: '#6366f1' },
    { id: 'blue', label: t('appearance.blue'), color: '#3b82f6' },
    { id: 'violet', label: t('appearance.violet'), color: '#8b5cf6' },
    { id: 'rose', label: t('appearance.rose'), color: '#f43f5e' },
    { id: 'emerald', label: t('appearance.emerald'), color: '#10b981' },
    { id: 'amber', label: t('appearance.amber'), color: '#f59e0b' },
    { id: 'teal', label: t('appearance.teal'), color: '#14b8a6' },
    { id: 'cyan', label: t('appearance.cyan'), color: '#06b6d4' },
  ];

  const handleSavePalette = async () => {
    setSaving(true);
    try {
      await updateSettings('palette', selectedPalette);
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = selectedPalette !== currentPalette;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Theme */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{t('appearance.theme')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { id: 'light', label: t('appearance.light'), icon: Sun },
            { id: 'dark', label: t('appearance.dark'), icon: Moon },
            { id: 'system', label: t('appearance.system'), icon: Monitor },
          ].map(themeOpt => (
            <button
              key={themeOpt.id}
              onClick={() => { if (theme !== themeOpt.id) setTheme(themeOpt.id); }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${theme === themeOpt.id ? 'var(--primary-500)' : 'var(--border-default)'}`,
                background: theme === themeOpt.id ? 'var(--primary-50)' : 'var(--bg-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: theme === themeOpt.id ? 'var(--primary-700)' : 'var(--text-secondary)',
                fontWeight: theme === themeOpt.id ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 150ms ease',
              }}
            >
              <themeOpt.icon size={18} />
              {themeOpt.label}
              {theme === themeOpt.id && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{t('appearance.palette')}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {isAdmin ? t('appearance.paletteAdminDesc') : t('appearance.paletteUserDesc')}
            </p>
          </div>
          {isAdmin && hasChanged && (
            <Button size="sm" onClick={handleSavePalette} disabled={saving}>
              <Save size={14} />
              {saving ? t('common:saving') : t('common:save')}
            </Button>
          )}
        </div>
        <div className="settings-grid-4col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {palettes.map(p => {
            const isSelected = selectedPalette === p.id;
            const isCurrent = currentPalette === p.id;
            return (
              <button
                key={p.id}
                onClick={() => isAdmin && setSelectedPalette(p.id)}
                disabled={!isAdmin}
                style={{
                  padding: '16px 12px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${isSelected ? p.color : 'var(--border-default)'}`,
                  background: isSelected ? `${p.color}0d` : 'var(--bg-primary)',
                  cursor: isAdmin ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 150ms ease',
                  opacity: isAdmin ? 1 : 0.7,
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-full)',
                  background: p.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? `0 0 0 3px ${p.color}33` : 'none',
                  transition: 'box-shadow 150ms ease',
                }}>
                  {isSelected && <Check size={18} style={{ color: '#fff' }} />}
                </div>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? p.color : 'var(--text-secondary)',
                }}>
                  {p.label}
                </span>
                {isCurrent && !isSelected && (
                  <span style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-tertiary)',
                    position: 'absolute',
                    bottom: 4,
                  }}>{t('appearance.active')}</span>
                )}
              </button>
            );
          })}
        </div>
        {!isAdmin && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={12} style={{ color: 'var(--warning-500)' }} />
            {t('appearance.paletteAdminOnly')}
          </p>
        )}
      </div>
    </div>
  );
}

/* ============ SPRINTS TAB ============ */
function SprintsTab({ sprints, ideas, addSprint, updateSprint, deleteSprint, setActiveSprint }) {
  const { t } = useTranslation('settings');
  const appSettings = useAppStore(s => s.appSettings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const [newLabel, setNewLabel] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ label: '', startDate: '', endDate: '' });

  const activeSprints = sprints.filter(s => s.id !== 'all');

  const handleAdd = () => {
    if (!newLabel.trim() || !newStart || !newEnd) return;
    addSprint({ label: newLabel, startDate: newStart, endDate: newEnd, isCurrent: false });
    setNewLabel('');
    setNewStart('');
    setNewEnd('');
  };

  const startEdit = (sprint) => {
    setEditingId(sprint.id);
    setEditForm({ label: sprint.label, startDate: sprint.startDate, endDate: sprint.endDate });
  };

  const saveEdit = () => {
    if (!editForm.label.trim() || !editForm.startDate || !editForm.endDate) return;
    updateSprint(editingId, editForm);
    setEditingId(null);
  };

  const getIdeaCount = (sprintId) => ideas.filter(i => {
    const sid = i.sprint && typeof i.sprint === 'object' ? i.sprint.id : (i.sprintId || i.sprint);
    return sid === sprintId;
  }).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Add new sprint */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{t('sprints.createTitle')}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('sprints.createDesc')}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
            <label className="form-label">{t('sprints.name')}</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t('sprints.namePlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
            <label className="form-label">{t('sprints.startDate')}</label>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
            <label className="form-label">{t('sprints.endDate')}</label>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>
          <Button variant="primary" icon={Plus} onClick={handleAdd}>{t('common:add')}</Button>
        </div>
      </div>

      {/* Sprint list */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{t('sprints.listTitle')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeSprints.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: 32 }}>
              {t('sprints.empty')}
            </p>
          )}
          {activeSprints.map(sprint => {
            const isEditing = editingId === sprint.id;
            const ideaCount = getIdeaCount(sprint.id);
            return (
              <motion.div
                key={sprint.id}
                layout
                style={{
                  padding: '14px 16px',
                  background: sprint.isCurrent ? 'var(--primary-50)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${sprint.isCurrent ? 'var(--primary-300)' : 'var(--border-default)'}`,
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                      style={{ flex: 1, minWidth: 120 }}
                    />
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                      style={{ width: 150 }}
                    />
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                      style={{ width: 150 }}
                    />
                    <button onClick={saveEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-500)', padding: 4, display: 'flex' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, display: 'flex' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Zap size={14} style={{ color: sprint.isCurrent ? 'var(--primary-600)' : 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{sprint.label}</span>
                        {sprint.isCurrent && (
                          <span style={{
                            fontSize: '0.5625rem', fontWeight: 700, color: 'white',
                            background: 'var(--success-500)', padding: '2px 7px',
                            borderRadius: 'var(--radius-full)', letterSpacing: '0.04em',
                          }}>
                            {t('sprints.current')}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.6875rem', color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)', padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}>
                          {t('sprints.ideasCount', { count: ideaCount })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {!sprint.isCurrent && (
                        <button
                          onClick={() => setActiveSprint(sprint.id)}
                          title={t('sprints.setActive')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--success-500)', padding: 6, display: 'flex',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                      )}
                      {sprint.isCurrent && (
                        <button
                          onClick={() => setActiveSprint(null)}
                          title={t('sprints.deactivate')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--warning-500)', padding: 6, display: 'flex',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <Pause size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(sprint)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6, display: 'flex' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteSprint(sprint.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-400)', padding: 6, display: 'flex' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Kanban read-only toggle */}
      <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{t('sprints.kanbanUserReadonly')}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('sprints.kanbanUserReadonlyDesc')}
          </p>
        </div>
        <Toggle
          checked={appSettings?.kanban_user_readonly === 'true'}
          onChange={(e) => updateSettings('kanban_user_readonly', e.target.checked ? 'true' : 'false')}
        />
      </div>
    </div>
  );
}

/* ============ CATEGORIES & STATUSES TAB ============ */
function CategoriesTab() {
  const { t } = useTranslation('settings');
  const contextStatuses = useAppStore(s => s.statusList);
  const contextAddStatus = useAppStore(s => s.addStatus);
  const contextRemoveStatus = useAppStore(s => s.removeStatus);
  const contextReorderStatuses = useAppStore(s => s.reorderStatuses);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const categories = useAppStore(s => s.categories);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    setCats(categories.filter(c => c.id !== 'all'));
  }, [categories]);
  const [newCatName, setNewCatName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366f1');
  const [newStatusDesc, setNewStatusDesc] = useState('');
  const [newStatusAfter, setNewStatusAfter] = useState('');

  const addCategory = () => {
    if (!newCatName.trim()) return;
    setCats(prev => [...prev, { id: `cat-${Date.now()}`, label: newCatName, icon: 'LayoutGrid', color: '#6366f1' }]);
    setNewCatName('');
  };

  const removeCategory = (id) => setCats(prev => prev.filter(c => c.id !== id));

  const handleAddStatus = () => {
    if (!newStatusName.trim() || !newStatusAfter) return;
    const afterOrder = parseInt(newStatusAfter, 10);
    contextAddStatus({
      label: newStatusName,
      color: newStatusColor,
      bg: newStatusColor + '15',
      description: newStatusDesc || '',
      isSystem: false,
    }, afterOrder);
    setNewStatusName('');
    setNewStatusDesc('');
    setNewStatusAfter('');
  };

  // Separate flow statuses (ordered) from special statuses
  const flowStatuses = contextStatuses.filter(s => s.order > 0).sort((a, b) => (a.order || 0) - (b.order || 0));
  const specialStatuses = contextStatuses.filter(s => s.order === 0);
  // Insertable positions: after each flow status
  const insertPositions = flowStatuses.filter(s => s.order < Math.max(...flowStatuses.map(f => f.order)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Categories */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{t('categories.title')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {cats.map(cat => (
            <div key={cat.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cat.label}</span>
              </div>
              <button
                onClick={() => removeCategory(cat.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, display: 'flex' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder={t('categories.newCatPlaceholder')}
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <Button variant="primary" size="md" icon={Plus} onClick={addCategory}>{t('common:add')}</Button>
        </div>
      </div>

      {/* Workflow Flow Visualization */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{t('categories.flowTitle')}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('categories.flowDesc')}
        </p>

        {/* Flow diagram */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 20,
          overflowX: 'auto',
        }}>
          {flowStatuses.map((st, idx) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                background: st.bg, border: `1.5px solid ${st.color}30`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: st.color, whiteSpace: 'nowrap' }}>
                  {st.label}
                </span>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)',
                  background: 'var(--bg-tertiary)', padding: '1px 5px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {st.order}
                </span>
              </div>
              {idx < flowStatuses.length - 1 && (
                <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.4, flexShrink: 0, margin: '0 2px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Status list with descriptions — flow statuses are draggable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            // Compute preview list when dragging
            const displayList = (dragIdx !== null && overIdx !== null && dragIdx !== overIdx)
              ? (() => {
                  const arr = [...flowStatuses];
                  const [moved] = arr.splice(dragIdx, 1);
                  arr.splice(overIdx, 0, moved);
                  return arr;
                })()
              : flowStatuses;

            return displayList.map((st, idx) => {
              const isDragged = dragIdx !== null && st.id === flowStatuses[dragIdx]?.id;
              const isDropTarget = dragIdx !== null && overIdx === idx && dragIdx !== overIdx && !isDragged;
              return (
                <div
                  key={st.id}
                  draggable
                  onDragStart={(e) => {
                    setDragIdx(flowStatuses.findIndex(s => s.id === st.id));
                    setOverIdx(null);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnter={() => setOverIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDragEnd={() => {
                    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                      const reordered = [...flowStatuses];
                      const [moved] = reordered.splice(dragIdx, 1);
                      reordered.splice(overIdx, 0, moved);
                      contextReorderStatuses(reordered.map(s => s.id));
                    }
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    background: isDragged
                      ? 'var(--primary-50)'
                      : isDropTarget
                        ? 'var(--primary-50)'
                        : st.bg,
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${st.color}`,
                    cursor: 'grab',
                    opacity: isDragged ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: isDropTarget ? '0 0 0 2px var(--primary-400)' : 'none',
                    transform: isDropTarget ? 'scale(1.01)' : 'none',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, alignSelf: 'center', color: 'var(--text-tertiary)', opacity: 0.5,
                  }}>
                    <GripVertical size={16} />
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                    background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {st.label}
                      </span>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-tertiary)',
                        background: 'var(--bg-tertiary)', padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        {t('categories.stageN', { n: idx + 1 })}
                      </span>
                      {st.isSystem ? (
                        <span style={{
                          fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-default)', padding: '1px 5px',
                          borderRadius: 'var(--radius-full)',
                        }}>
                          {t('categories.system')}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.5625rem', fontWeight: 600, color: 'var(--primary-600)',
                          border: '1px solid var(--primary-200)', padding: '1px 5px',
                          borderRadius: 'var(--radius-full)', background: 'var(--primary-50)',
                        }}>
                          {t('categories.custom')}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                      {st.description || t('categories.noDesc')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Badge color={st.color} bg={st.bg} dot>{st.label}</Badge>
                    {!st.isSystem && (
                      <button
                        onClick={() => contextRemoveStatus(st.id)}
                        title={t('common:delete')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-400)', padding: 4, display: 'flex' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          {/* Special statuses — not draggable */}
          {specialStatuses.map(st => (
            <div key={st.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              borderLeft: `3px solid ${st.color}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {st.label}
                  </span>
                  <span style={{
                    fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-default)', padding: '1px 5px',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    {t('categories.system')}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                  {st.description || t('categories.noDesc')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Badge color={st.color} bg={st.bg} dot>{st.label}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add custom status */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{t('categories.addStage')}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('categories.addStageDesc')}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              style={{ width: 40, height: 38, padding: 2, cursor: 'pointer', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div className="form-group" style={{ minWidth: 160, marginBottom: 0 }}>
            <label className="form-label">{t('categories.afterWhich')}</label>
            <select
              className="form-select"
              value={newStatusAfter}
              onChange={(e) => setNewStatusAfter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">{t('categories.selectPosition')}</option>
              {flowStatuses.map(s => (
                <option key={s.id} value={s.order}>
                  {t('categories.afterLabel', { order: s.order, label: s.label })}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 130, marginBottom: 0 }}>
            <label className="form-label">{t('categories.statusName')}</label>
            <input
              type="text"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              placeholder={t('categories.statusNamePlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
            />
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 180, marginBottom: 0 }}>
            <label className="form-label">{t('categories.description')}</label>
            <input
              type="text"
              value={newStatusDesc}
              onChange={(e) => setNewStatusDesc(e.target.value)}
              placeholder={t('categories.descPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
            />
          </div>
          <Button variant="primary" size="md" icon={Plus} onClick={handleAddStatus}>{t('common:add')}</Button>
        </div>
      </div>
    </div>
  );
}

/* ============ USERS & ROLES TAB ============ */
function UsersTab() {
  const { t } = useTranslation('settings');
  const send = useAppStore(s => s.send);
  const [users, setUsers] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('azure');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');

  useEffect(() => {
    if (send) {
      send('users:list', {}).then(setUsers).catch(() => {});
    }
  }, [send]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
          <button
            className={`tab ${activeSubTab === 'azure' ? 'tab--active' : ''}`}
            onClick={() => setActiveSubTab('azure')}
          >
            {t('users.azureUsers')}
          </button>
          <button
            className={`tab ${activeSubTab === 'local' ? 'tab--active' : ''}`}
            onClick={() => setActiveSubTab('local')}
          >
            {t('users.localAccounts')}
          </button>
        </div>

        {activeSubTab === 'azure' && (
          <div style={{ padding: '4px 0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('users.user')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.department')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={user.name} initials={user.initials} size="sm" />
                        <span style={{ fontWeight: 500 }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>{user.department}</td>
                    <td>
                      <Badge
                        color={user.role === 'admin' ? 'var(--error-600)' : user.role === 'product_manager' ? 'var(--warning-600)' : 'var(--text-secondary)'}
                        bg={user.role === 'admin' ? 'var(--error-50)' : user.role === 'product_manager' ? 'var(--warning-50)' : 'var(--bg-tertiary)'}
                      >
                        {user.role === 'admin' ? t('users.roleAdmin') : user.role === 'product_manager' ? t('users.rolePM') : t('users.roleUser')}
                      </Badge>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        defaultValue={user.role}
                        style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: '0.8125rem' }}
                      >
                        <option value="user">{t('users.roleUser')}</option>
                        <option value="product_manager">{t('users.rolePM')}</option>
                        <option value="admin">{t('users.roleAdmin')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} style={{ color: 'var(--info-500)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {t('users.azureSyncNote')}
              </span>
            </div>
          </div>
        )}

        {activeSubTab === 'local' && (
          <div style={{ padding: '24px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              {t('users.localDesc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
              <div className="form-group">
                <label className="form-label">{t('users.email')}</label>
                <input
                  type="email"
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  placeholder={t('users.emailPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('users.password')}</label>
                <input
                  type="password"
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder={t('users.passwordPlaceholder')}
                />
              </div>
              <Button variant="primary" icon={Plus} style={{ alignSelf: 'flex-start' }}>
                {t('users.createLocalAdmin')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ VOTING ENGINE TAB ============ */
function VotingTab({ rules, setRules }) {
  const { t } = useTranslation('settings');
  const categories = useAppStore(s => s.categories);
  const [newRule, setNewRule] = useState({ category: '', department: '', multiplier: '1.5' });

  const catsForSelect = categories.filter(c => c.id !== 'all');

  const addRule = () => {
    if (!newRule.category || !newRule.department || !newRule.multiplier) return;
    setRules(prev => [...prev, {
      id: `vr-${Date.now()}`,
      category: newRule.category,
      department: newRule.department,
      multiplier: parseFloat(newRule.multiplier),
      isActive: true,
    }]);
    setNewRule({ category: '', department: '', multiplier: '1.5' });
  };

  const toggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const deleteRule = (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const getCatLabel = (cat) => {
    if (cat && typeof cat === 'object') return cat.label;
    return categories.find(c => c.id === cat)?.label || cat;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Rule builder */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{t('voting.addRuleTitle')}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          {t('voting.addRuleDesc')}
        </p>

        {/* Visual rule builder */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          padding: '16px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-600)', fontFamily: 'var(--font-display)' }}>
            {t('voting.if')}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('voting.categoryEq')}</span>
          <select
            className="form-select"
            value={newRule.category}
            onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value }))}
            style={{ width: 'auto', minWidth: 140, padding: '6px 30px 6px 10px', fontSize: '0.8125rem' }}
          >
            <option value="">{t('common:select')}</option>
            {catsForSelect.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-500)', fontFamily: 'var(--font-display)' }}>
            {t('voting.and')}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('voting.departmentEq')}</span>
          <select
            className="form-select"
            value={newRule.department}
            onChange={(e) => setNewRule(prev => ({ ...prev, department: e.target.value }))}
            style={{ width: 'auto', minWidth: 160, padding: '6px 30px 6px 10px', fontSize: '0.8125rem' }}
          >
            <option value="">{t('common:select')}</option>
            {['Mühendislik', 'Ürün Yönetimi', 'İnsan Kaynakları', 'Güvenlik', 'DevOps', 'Tasarım'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success-600)', fontFamily: 'var(--font-display)' }}>
            {t('voting.then')}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('voting.weightEq')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={newRule.multiplier}
              onChange={(e) => setNewRule(prev => ({ ...prev, multiplier: e.target.value }))}
              style={{ width: 72, padding: '6px 10px', fontSize: '0.875rem', textAlign: 'center', fontWeight: 700 }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>x</span>
          </div>
        </div>

        <Button variant="accent" icon={Plus} onClick={addRule}>{t('voting.addRule')}</Button>
      </div>

      {/* Rules table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{t('voting.activeRules')}</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('voting.category')}</th>
              <th>{t('voting.department')}</th>
              <th>{t('voting.multiplier')}</th>
              <th>{t('voting.status')}</th>
              <th>{t('common:actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} style={{ opacity: rule.isActive ? 1 : 0.5 }}>
                <td>
                  <Badge color="var(--primary-600)" bg="var(--primary-50)">
                    {getCatLabel(rule.category)}
                  </Badge>
                </td>
                <td style={{ fontWeight: 500 }}>{rule.department}</td>
                <td>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: 'var(--accent-500)',
                  }}>
                    {rule.multiplier}x
                  </span>
                </td>
                <td>
                  <Toggle checked={rule.isActive} onChange={() => toggleRule(rule.id)} />
                </td>
                <td>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-500)', padding: 4, display: 'flex' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                  {t('voting.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ INTEGRATIONS TAB ============ */
function IntegrationCard({ def, saved, onSave, onRemove }) {
  const { t } = useTranslation('settings');
  const formRef = useRef({});
  const connected = !!saved;

  const handleSave = () => {
    const values = {};
    let hasValue = false;
    for (const field of def.fields) {
      const val = formRef.current[field.key]?.value?.trim() || '';
      if (val && val !== '••••••••••••') {
        values[field.key] = val;
        hasValue = true;
      } else if (saved?.[field.key]) {
        values[field.key] = saved[field.key];
        hasValue = true;
      }
    }
    if (!hasValue) {
      toast.error(t('integrations.fillRequired'));
      return;
    }
    onSave(def.id, values);
    toast.success(t('integrations.saved', { name: def.name }));
  };

  const handleRemove = () => {
    onRemove(def.id);
    toast.warning(t('integrations.removed', { name: def.name }));
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{ flexShrink: 0, color: 'var(--text-primary)' }}>
          {def.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{def.name}</h4>
            {connected && (
              <Badge color="var(--success-600)" bg="var(--success-50)" dot>{t('integrations.connected')}</Badge>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{def.description}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {def.fields.map(field => (
          <div key={field.key} className="form-group">
            <label className="form-label">{field.label}</label>
            <input
              ref={el => { formRef.current[field.key] = el; }}
              type={field.type}
              placeholder={field.placeholder}
              defaultValue={connected ? (field.type === 'password' ? '••••••••••••' : (saved[field.key] || '')) : ''}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={connected ? 'secondary' : 'primary'} size="md" icon={connected ? Check : Link2} onClick={handleSave}>
            {connected ? t('common:update') : t('common:connect')}
          </Button>
          {connected && (
            <Button variant="ghost" size="md" style={{ color: 'var(--error-500)' }} onClick={handleRemove}>
              {t('common:disconnect')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = useAppStore(s => s.integrations);
  const setIntegration = useAppStore(s => s.setIntegration);
  const removeIntegration = useAppStore(s => s.removeIntegration);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {INTEGRATION_DEFS.map(def => (
        <IntegrationCard
          key={def.id}
          def={def}
          saved={integrations[def.id]}
          onSave={setIntegration}
          onRemove={removeIntegration}
        />
      ))}
    </div>
  );
}
