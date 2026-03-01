const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiError extends Error {
  code: string;
  status: number;
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || data.message || 'Bir hata olustu') as ApiError;
    err.code = data.error?.code || 'UNKNOWN';
    err.status = res.status;
    throw err;
  }
  return data as T;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    initials: string;
    avatar?: string | null;
    locale?: string;
  };
}

export function loginRequest(email: string, password: string): Promise<AuthTokens> {
  return request<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

interface SsoProvidersResponse {
  providers: Array<{ id: string; clientId?: string; tenantId?: string; allowedDomains?: string }>;
}

export function fetchSsoProviders(): Promise<SsoProvidersResponse> {
  return request<SsoProvidersResponse>('/api/settings/integrations');
}

export function refreshTokenRequest(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export async function uploadFile(file: File, accessToken: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Dosya yukleme hatasi') as ApiError;
    err.code = data.error?.code || 'UPLOAD_FAILED';
    throw err;
  }
  return data as UploadResponse;
}
