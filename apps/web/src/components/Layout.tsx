import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Bug, Sparkles, Heart, RefreshCw, Shield,
  Settings, ClipboardList, Plus, Bell,
  Menu, X, LogOut, ChevronDown, LayoutList, Grid3X3, Columns3,
  Lightbulb, Rocket, Target, Star, Folder, Globe, Code, Package, Megaphone, Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar, IconButton, SearchInput } from './UI';
import ConnectionStatus from './ConnectionStatus';

const categoryIcons: Record<string, LucideIcon> = { LayoutGrid, Bug, Sparkles, Heart, RefreshCw, Shield, Lightbulb, Rocket, Target, Star, Folder, Globe, Code, Package, Megaphone, Zap };
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function Layout() {
  const { t } = useTranslation('common');
  const categories = useAppStore(s => s.categories);
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const setSelectedCategory = useAppStore(s => s.setSelectedCategory);
  const searchQuery = useAppStore(s => s.searchQuery);
  const setSearchQuery = useAppStore(s => s.setSearchQuery);
  const currentUser = useAuthStore(s => s.user);
  const notifications = useAppStore(s => s.notifications);
  const unreadCount = useAppStore(s => s.notifications).filter(n => !n.read).length;
  const viewMode = useAppStore(s => s.viewMode);
  const setViewMode = useAppStore(s => s.setViewMode);
  const markNotificationRead = useAppStore(s => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore(s => s.markAllNotificationsRead);
  const logout = useAuthStore(s => s.logout);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > MOBILE_BREAKPOINT);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const closeSidebar = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const isDashboard = location.pathname === '/dashboard';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={isMobile ? `sidebar-mobile${sidebarOpen ? ' sidebar-open' : ''}` : ''}
        style={{
          ...(isMobile ? {} : {
            width: sidebarOpen ? 'var(--sidebar-width)' : 0,
            minWidth: sidebarOpen ? 'var(--sidebar-width)' : 0,
            transition: 'width 300ms ease, min-width 300ms ease',
            position: 'relative',
          }),
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: isMobile ? 50 : 20,
          height: '100vh',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--border-default)',
          height: 'var(--header-height)',
        }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#sg)" />
            <path d="M10 22V10h4v12h-4zM18 22V14h4v8h-4z" fill="white" opacity="0.9" />
            <defs><linearGradient id="sg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#4f46e5" /></linearGradient></defs>
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>
            IdeaHub
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {/* Categories */}
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 8px',
              marginBottom: 6,
              fontFamily: 'var(--font-display)',
            }}>
              {t('categories')}
            </p>
            {categories.map(cat => {
              const Icon = categoryIcons[cat.icon] || LayoutGrid;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                  onClick={() => { setSelectedCategory(cat.id); navigate('/dashboard'); closeSidebar(); }}
                >
                  <Icon size={16} style={{ color: isActive ? 'var(--primary-600)' : cat.color, flexShrink: 0 }} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Anketler */}
          <NavLink
            to="/dashboard/surveys"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
          >
            <ClipboardList size={16} />
            {t('surveys')}
          </NavLink>

          {/* Kanban */}
          <NavLink
            to="/dashboard/kanban"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
          >
            <Columns3 size={16} />
            {t('roadmap')}
          </NavLink>

        </div>

        {/* Settings link */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-default)' }}>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
          >
            <Settings size={16} />
            {t('settings')}
          </NavLink>
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: 'var(--header-height)',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '0 12px' : '0 24px',
          gap: isMobile ? 8 : 16,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              display: 'flex',
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <div
            className={`header-search-wrapper${searchExpanded ? ' search-expanded' : ''}`}
            onFocus={() => setSearchExpanded(true)}
            onBlur={() => setSearchExpanded(false)}
          >
            <SearchInput
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim()) {
                  const path = location.pathname;
                  if (path.includes('/idea/')) {
                    navigate('/dashboard');
                  } else if (path.includes('/surveys/')) {
                    navigate('/dashboard/surveys');
                  }
                }
              }}
              placeholder={t('searchPlaceholder')}
            />
          </div>

          <div className="header-spacer" />

          {/* View toggle (only on dashboard) */}
          {isDashboard && (
            <div className="header-view-toggle" style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: 2,
            }}>
              <button
                onClick={() => setViewMode('feed')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'feed' ? 'var(--bg-primary)' : 'transparent',
                  color: viewMode === 'feed' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: viewMode === 'feed' ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? 'var(--bg-primary)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          )}

          {/* Notifications */}
          <div className="header-right-item" style={{ position: 'relative' }}>
            <IconButton
              icon={Bell}
              badge={unreadCount}
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              style={{ position: 'relative' }}
            />
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  className="notification-dropdown"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="notification-dropdown__header">
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem' }}>
                      {t('notifications')}
                    </span>
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--primary-600)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => markAllNotificationsRead()}
                    >
                      {t('markAllRead')}
                    </span>
                  </div>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
                      style={{ cursor: n.relatedId ? 'pointer' : 'default' }}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setNotifOpen(false);
                        if (n.relatedId) {
                          const isSurvey = n.type === 'survey';
                          navigate(isSurvey ? `/dashboard/surveys/${n.relatedId}` : `/dashboard/idea/${n.relatedId}`);
                        }
                      }}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: n.read ? 'transparent' : 'var(--primary-500)',
                        flexShrink: 0,
                        marginTop: 5,
                      }} />
                      <div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: n.read ? 400 : 500 }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Idea Button */}
          <button
            onClick={() => navigate('/dashboard', { state: { openNewIdea: true } })}
            className="btn btn--accent btn--md header-right-item"
            style={{ gap: 6 }}
          >
            <Plus size={16} />
            <span className="new-idea-text">{t('newIdea')}</span>
          </button>

          {/* Profile */}
          <div className="header-right-item" style={{ position: 'relative' }}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 4px 4px 4px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Avatar name={currentUser?.name} initials={currentUser?.initials} size="md" />
              <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 220,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-display)' }}>{currentUser?.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{currentUser?.department}</p>
                  </div>
                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={() => { navigate('/dashboard/settings'); setProfileOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                      }}
                    >
                      <Settings size={14} /> {t('settings')}
                    </button>
                    <button
                      onClick={() => { logout(); navigate('/'); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: 'var(--error-500)',
                        textAlign: 'left',
                      }}
                    >
                      <LogOut size={14} /> {t('logout')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <ConnectionStatus />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} onClick={() => { setNotifOpen(false); setProfileOpen(false); }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
