import type { IntegrationDef } from '../types';

export const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    id: 'azure-ad',
    name: 'Azure AD (Entra ID)',
    sso: true,
    description: 'Kurumsal kimlik doğrulama ve SSO için Azure Active Directory bağlantısı.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="10" height="10" rx="1" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" rx="1" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" rx="1" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" rx="1" fill="#FFB900"/>
      </svg>
    ),
    fields: [
      { key: 'tenantId', label: 'Tenant (Dizin) ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientId', label: 'Uygulama (Client) ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Gizli anahtar değeri' },
      { key: 'allowedDomains', label: 'İzin Verilen E-posta Domainleri', type: 'text', placeholder: 'sirket.com, altfirma.sirket.com' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    sso: true,
    description: 'Fikirleri GitHub Issue olarak bağlayın.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'GitHub OAuth App Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'GitHub OAuth App Client Secret' },
      { key: 'allowedDomains', label: 'İzin Verilen E-posta Domainleri', type: 'text', placeholder: 'sirket.com, altfirma.sirket.com' },
    ],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Onaylanan fikirleri Jira ticket olarak oluşturun.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#0052CC"/>
        <path d="M12 4l-1.5 1.5L14 9H6v2h8l-3.5 3.5L12 16l6-6-6-6z" fill="white"/>
      </svg>
    ),
    fields: [
      { key: 'url', label: 'Jira URL', type: 'text', placeholder: 'https://sirket.atlassian.net' },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'API anahtarınız' },
      { key: 'allowedDomains', label: 'İzin Verilen E-posta Domainleri', type: 'text', placeholder: 'sirket.com, altfirma.sirket.com' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack / Teams',
    description: 'Yeni fikirler ve anketler için kanal bildirimleri gönderin.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#4A154B"/>
        <path d="M8 14.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm1 0V18h-2v-3.5a1.5 1.5 0 013 0zM14.5 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 1H18v2h-3.5a1.5 1.5 0 010-3z" fill="white" opacity="0.8"/>
      </svg>
    ),
    fields: [
      { key: 'webhook', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'allowedDomains', label: 'İzin Verilen E-posta Domainleri', type: 'text', placeholder: 'sirket.com, altfirma.sirket.com' },
    ],
  },
];
