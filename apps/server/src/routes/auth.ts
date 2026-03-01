import type { FastifyInstance } from 'fastify';
import { LoginSchema, RefreshTokenSchema } from '@ideahub/shared';
import { comparePassword } from '../lib/password.js';
import { signAccessToken } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';
import { randomUUID } from 'crypto';

function getIntegrationConfig(raw: string | undefined, provider: string) {
  if (!raw) throw new AppError('FORBIDDEN', `${provider} integration not configured`, 403);
  let integrations: Record<string, Record<string, string>>;
  try { integrations = JSON.parse(raw); } catch { throw new AppError('FORBIDDEN', 'Integration data is corrupted', 403); }
  const config = integrations[provider];
  if (!config) throw new AppError('FORBIDDEN', `${provider} integration not configured`, 403);
  return config;
}

function checkAllowedDomains(email: string, allowedDomains?: string) {
  if (!allowedDomains) return;
  const allowed = allowedDomains.split(',').map(d => d.trim().toLowerCase());
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !allowed.includes(domain)) {
    throw new AppError('FORBIDDEN', `Email domain (${domain}) is not allowed`, 403);
  }
}

async function issueTokens(fastify: FastifyInstance, user: { id: string; email: string; name: string; role: string; department: string; initials: string; locale?: string }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshTokenValue = randomUUID();
  await fastify.prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      initials: user.initials,
      locale: user.locale,
    },
  };
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const valid = await comparePassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenValue = randomUUID();
    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        initials: user.initials,
        locale: user.locale,
      },
    };
  });

  fastify.post('/api/auth/refresh', async (request, reply) => {
    const body = RefreshTokenSchema.parse(request.body);

    const result = await fastify.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { token: body.refreshToken },
        include: { user: true },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new AppError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
      }

      // Revoke old token
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      // Issue new tokens
      const accessToken = signAccessToken({
        sub: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
      });

      const newRefreshToken = randomUUID();
      await tx.refreshToken.create({
        data: {
          userId: stored.user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: stored.user.id,
          email: stored.user.email,
          name: stored.user.name,
          role: stored.user.role,
          department: stored.user.department,
          initials: stored.user.initials,
          locale: stored.user.locale,
        },
      };
    });

    return result;
  });

  // GitHub OAuth callback
  fastify.post('/api/auth/github', async (request) => {
    const { code, redirectUri } = request.body as { code: string; redirectUri: string };
    if (!code) throw new AppError('VALIDATION', 'OAuth code is required', 400);

    const settingsRow = await fastify.prisma.appSettings.findUnique({ where: { key: 'integrations' } });
    const github = getIntegrationConfig(settingsRow?.value, 'github');
    if (!github.clientId || !github.clientSecret) {
      throw new AppError('FORBIDDEN', 'GitHub OAuth configuration is incomplete', 403);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: github.clientId, client_secret: github.clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) throw new AppError('AUTH_FAILED', tokenData.error || 'Failed to obtain GitHub token', 401);

    // Get user info
    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' } }),
      fetch('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' } }),
    ]);
    const ghUser = await userRes.json() as { id: number; login: string; name?: string; avatar_url?: string };
    const ghEmails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[];

    const primaryEmail = ghEmails.find(e => e.primary && e.verified)?.email || ghEmails.find(e => e.verified)?.email;
    if (!primaryEmail) throw new AppError('AUTH_FAILED', 'No verified email found on GitHub account', 401);

    checkAllowedDomains(primaryEmail, github.allowedDomains);

    // Find or create user
    const githubIdStr = String(ghUser.id);
    let user = await fastify.prisma.user.findFirst({ where: { OR: [{ githubId: githubIdStr }, { email: primaryEmail }] } });
    const displayName = ghUser.name || ghUser.login;
    const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    if (user) {
      if (!user.githubId) {
        user = await fastify.prisma.user.update({ where: { id: user.id }, data: { githubId: githubIdStr, avatar: ghUser.avatar_url || user.avatar } });
      }
    } else {
      user = await fastify.prisma.user.create({
        data: { email: primaryEmail, name: displayName, githubId: githubIdStr, role: 'user', department: 'General', initials, avatar: ghUser.avatar_url },
      });
    }

    return issueTokens(fastify, user);
  });

  // Azure AD OAuth callback
  fastify.post('/api/auth/azure', async (request) => {
    const { code, redirectUri } = request.body as { code: string; redirectUri: string };
    if (!code) throw new AppError('VALIDATION', 'OAuth code is required', 400);

    const settingsRow = await fastify.prisma.appSettings.findUnique({ where: { key: 'integrations' } });
    const azure = getIntegrationConfig(settingsRow?.value, 'azure-ad');
    if (!azure.tenantId || !azure.clientId || !azure.clientSecret) {
      throw new AppError('FORBIDDEN', 'Azure AD configuration is incomplete', 403);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${azure.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: azure.clientId,
        client_secret: azure.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email',
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) throw new AppError('AUTH_FAILED', tokenData.error_description || 'Failed to obtain Azure token', 401);

    // Get user info from Microsoft Graph
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const azUser = await meRes.json() as { id: string; displayName: string; mail?: string; userPrincipalName: string };

    const email: string = azUser.mail || azUser.userPrincipalName;
    if (!email) throw new AppError('AUTH_FAILED', 'No email found on Azure AD account', 401);

    checkAllowedDomains(email, azure.allowedDomains);

    // Find or create user
    let user = await fastify.prisma.user.findFirst({ where: { OR: [{ azureId: azUser.id }, { email }] } });
    const displayName = azUser.displayName || email.split('@')[0] || email;
    const initials = displayName.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2);

    if (user) {
      if (!user.azureId) {
        user = await fastify.prisma.user.update({ where: { id: user.id }, data: { azureId: azUser.id } });
      }
    } else {
      user = await fastify.prisma.user.create({
        data: { email, name: displayName, azureId: azUser.id, role: 'user', department: 'General', initials },
      });
    }

    return issueTokens(fastify, user);
  });
}
