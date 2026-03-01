const mode = process.env.SEED_MODE || 'dev';

if (mode === 'prod') {
  await import('./seed.prod.js');
} else {
  await import('./seed.dev.js');
}
