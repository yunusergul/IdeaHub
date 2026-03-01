import type { FastifyInstance } from 'fastify';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Public endpoint — returns SSO provider info for the login page
  // Strips sensitive fields (secrets, tokens) before returning
  fastify.get('/api/settings/integrations', async () => {
    const row = await fastify.prisma.appSettings.findUnique({
      where: { key: 'integrations' },
    });

    if (!row) return { providers: [] };

    let integrations: Record<string, Record<string, string>>;
    try {
      integrations = JSON.parse(row.value);
    } catch {
      return { providers: [] };
    }

    const SENSITIVE_KEYS = ['clientSecret', 'token', 'apiKey', 'webhook'];

    const providers = Object.entries(integrations).map(([id, config]) => {
      const safe: Record<string, string | boolean> = { id };
      for (const [k, v] of Object.entries(config)) {
        if (SENSITIVE_KEYS.includes(k)) {
          safe[k] = true; // indicate field exists but don't expose value
        } else {
          safe[k] = v;
        }
      }
      return safe;
    });

    return { providers };
  });
}
