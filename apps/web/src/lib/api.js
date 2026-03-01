const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || data.message || 'Bir hata oluştu');
    err.code = data.error?.code || 'UNKNOWN';
    err.status = res.status;
    throw err;
  }
  return data;
}

export function loginRequest(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchSsoProviders() {
  return request('/api/settings/integrations');
}

export function refreshTokenRequest(refreshToken) {
  return request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function uploadFile(file, accessToken) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Dosya yükleme hatası');
    err.code = data.error?.code || 'UPLOAD_FAILED';
    throw err;
  }
  return data;
}
