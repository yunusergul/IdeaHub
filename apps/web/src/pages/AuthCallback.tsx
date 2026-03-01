import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AuthCallback() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) {
      setError(t('oauthCodeNotFound'));
      return;
    }

    // Verify OAuth state to prevent CSRF
    const savedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    if (!savedState || savedState !== state) {
      setError(t('invalidOauthState'));
      return;
    }

    const provider = state.split(':')[0];
    const redirectUri = `${window.location.origin}/auth/callback`;
    const endpoint = provider === 'azure-ad' ? '/api/auth/azure' : '/api/auth/github';

    fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error?.message || data.message || t('loginFailed'));
          return;
        }
        // Save tokens to authStore
        const store = useAuthStore.getState();
        store.loginWithTokens(data);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => setError(t('serverConnectionFailed')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: 'var(--error-600)', fontWeight: 600, marginBottom: 12 }}>{error}</p>
          <button onClick={() => navigate('/', { replace: true })} style={styles.link}>
            {t('returnToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>{t('loginInProgress')}</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary)',
  },
  card: {
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border-default)',
    padding: '32px',
    textAlign: 'center',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-600)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
