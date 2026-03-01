import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/UI';
import { useAuthStore } from '../stores/authStore';
import { INTEGRATION_DEFS } from '../lib/integrations';
import { fetchSsoProviders } from '../lib/api';

export default function Login() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const isAuthenticated = useAuthStore(s => !!s.accessToken && !!s.user);
  const authLoading = useAuthStore(s => s.isLoading);

  const [ssoProviders, setSsoProviders] = useState([]);
  const [ssoLoaded, setSsoLoaded] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSsoProviders()
      .then(data => {
        const providers = (data.providers || [])
          .filter(p => INTEGRATION_DEFS.find(d => d.id === p.id && d.sso))
          .map(p => ({
            ...INTEGRATION_DEFS.find(d => d.id === p.id),
            config: p,
          }));
        setSsoProviders(providers);
        if (providers.length === 0) setShowEmailForm(true);
      })
      .catch(() => setShowEmailForm(true))
      .finally(() => setSsoLoaded(true));
  }, []);

  const hasSso = ssoProviders.length > 0;

  if (authLoading || !ssoLoaded) {
    return (
      <div style={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.875rem' }}>{t('verifyingSession')}</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSsoLogin = (provider) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const nonce = crypto.randomUUID();
    const state = `${provider.id}:${nonce}`;
    sessionStorage.setItem('oauth_state', state);

    if (provider.id === 'github') {
      const clientId = provider.config?.clientId;
      if (!clientId) {
        setError(t('githubNotConfigured'));
        return;
      }
      const scope = 'read:user user:email';
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    } else if (provider.id === 'azure-ad') {
      const tenantId = provider.config?.tenantId;
      const clientId = provider.config?.clientId;
      if (!tenantId || !clientId) {
        setError(t('azureNotConfigured'));
        return;
      }
      const scope = 'openid profile email';
      window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background decoration */}
      <div style={styles.bgPattern} />
      <div style={styles.bgGlow} />

      <motion.div
        style={styles.container}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoMark}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
              <path d="M10 22V10h4v12h-4zM18 22V14h4v8h-4z" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
            <span style={styles.logoText}>IdeaHub</span>
          </div>
          <p style={styles.logoSubtext}>{t('loginSubtitle')}</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <AnimatePresence mode="wait">
            {hasSso && !showEmailForm ? (
              <motion.div
                key="sso"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div style={styles.cardHeader}>
                  <h1 style={styles.title}>{t('welcome')}</h1>
                  <p style={styles.subtitle}>{t('noSsoSubtitle')}</p>
                </div>

                <div style={styles.cardBody}>
                  {error && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--error-50)',
                      border: '1px solid var(--error-200)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--error-700)',
                      fontWeight: 500,
                    }}>
                      {error}
                    </div>
                  )}
                  {ssoProviders.map(provider => (
                    <div key={provider.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button type="button" style={styles.ssoButton} onClick={() => handleSsoLogin(provider)}>
                        <span style={{ display: 'flex', alignItems: 'center', width: 20, height: 20 }}>{provider.icon}</span>
                        <span>{t('loginWith', { provider: provider.name })}</span>
                      </button>
                      {provider.config?.allowedDomains && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                          {t('allowedDomains')} {provider.config.allowedDomains}
                        </p>
                      )}
                    </div>
                  ))}

                  <div style={styles.divider}>
                    <span style={styles.dividerLine} />
                    <span style={styles.dividerText}>{t('or')}</span>
                    <span style={styles.dividerLine} />
                  </div>

                  <button
                    style={styles.adminLink}
                    onClick={() => setShowEmailForm(true)}
                  >
                    {t('emailLogin')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div style={styles.cardHeader}>
                  {hasSso && (
                    <button
                      style={styles.backButton}
                      onClick={() => { setShowEmailForm(false); setError(null); }}
                    >
                      <ArrowLeft size={16} />
                      <span>{t('back')}</span>
                    </button>
                  )}
                  <h1 style={styles.title}>{hasSso ? t('emailLogin') : t('welcome')}</h1>
                  <p style={styles.subtitle}>{hasSso ? t('emailLoginSubtitle') : t('loginSubtitle')}</p>
                </div>

                <form style={styles.cardBody} onSubmit={handleAdminLogin}>
                  {error && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--error-50)',
                      border: '1px solid var(--error-200)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--error-700)',
                      fontWeight: 500,
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('email')}</label>
                    <div style={styles.inputWrapper}>
                      <Mail size={16} style={styles.inputIcon} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        style={styles.input}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('password')}</label>
                    <div style={styles.inputWrapper}>
                      <Lock size={16} style={styles.inputIcon} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('passwordPlaceholder')}
                        style={styles.input}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button variant="accent" size="lg" full type="submit" style={{ marginTop: 8 }} disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        {t('loginInProgress')}
                      </span>
                    ) : (
                      t('signIn')
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={styles.footer}>
          {t('copyright')}
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary)',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
  },
  bgPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle at 1px 1px, var(--border-default) 1px, transparent 0)`,
    backgroundSize: '32px 32px',
    opacity: 0.5,
  },
  bgGlow: {
    position: 'absolute',
    top: '-30%',
    right: '-10%',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoMark: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  logoSubtext: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 400,
  },
  card: {
    width: '100%',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '28px 28px 0',
  },
  cardBody: {
    padding: '24px 28px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.375rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: 4,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  ssoButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-default)',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    transition: 'all 150ms ease',
    boxShadow: 'var(--shadow-xs)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border-default)',
  },
  dividerText: {
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  adminLink: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontWeight: 500,
    padding: '4px',
    transition: 'color 150ms ease',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginBottom: 12,
    padding: 0,
    fontWeight: 500,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 14px 10px 38px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-default)',
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-body)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    color: 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  footer: {
    marginTop: 24,
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
};
