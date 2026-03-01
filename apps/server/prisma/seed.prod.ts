import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database...');

  const passwordHash = await hashPassword('Qazxsw123**');

  // --- Admin User ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ideahub.com' },
    update: {},
    create: {
      email: 'admin@ideahub.com',
      name: 'Admin',
      role: 'admin',
      department: 'Yönetim',
      initials: 'AD',
      passwordHash,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // --- Default Categories ---
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: 'tech-debt' }, update: {}, create: { id: 'tech-debt', label: 'Teknik Borç', icon: 'Bug', color: '#ef4444' } }),
    prisma.category.upsert({ where: { id: 'new-feature' }, update: {}, create: { id: 'new-feature', label: 'Yeni Özellik', icon: 'Sparkles', color: '#8b5cf6' } }),
    prisma.category.upsert({ where: { id: 'hr-culture' }, update: {}, create: { id: 'hr-culture', label: 'İK / Kültür', icon: 'Heart', color: '#ec4899' } }),
    prisma.category.upsert({ where: { id: 'process' }, update: {}, create: { id: 'process', label: 'Süreç İyileştirme', icon: 'RefreshCw', color: '#f59e0b' } }),
    prisma.category.upsert({ where: { id: 'security' }, update: {}, create: { id: 'security', label: 'Güvenlik', icon: 'Shield', color: '#10b981' } }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // --- Default Statuses ---
  const statuses = await Promise.all([
    prisma.status.upsert({ where: { id: 'pending' }, update: {}, create: { id: 'pending', label: 'Bekliyor', color: '#9ca3af', bg: '#f3f4f6', order: 1, description: 'Yeni gönderilen fikirler burada bekler.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'reviewing' }, update: {}, create: { id: 'reviewing', label: 'İnceleniyor', color: '#f59e0b', bg: '#fffbeb', order: 2, description: 'Yöneticiler tarafından değerlendiriliyor.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'approved' }, update: {}, create: { id: 'approved', label: 'Onaylandı', color: '#22c55e', bg: '#f0fdf4', order: 3, description: 'Onaylandı, sprint ataması bekleniyor.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'in-progress' }, update: {}, create: { id: 'in-progress', label: 'Geliştiriliyor', color: '#3b82f6', bg: '#eff6ff', order: 4, description: 'Sprint\'e atandı, aktif geliştirme aşamasında.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'completed' }, update: {}, create: { id: 'completed', label: 'Tamamlandı', color: '#6366f1', bg: '#eef2ff', order: 5, description: 'Geliştirme tamamlandı ve yayınlandı.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'rejected' }, update: {}, create: { id: 'rejected', label: 'Reddedildi', color: '#ef4444', bg: '#fef2f2', order: 0, description: 'Değerlendirme sonucu reddedildi.', isSystem: true } }),
  ]);

  console.log(`Created ${statuses.length} statuses`);

  // --- Admin Preferences ---
  await prisma.userPreferences.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log('Created admin preferences');

  // --- Apply LISTEN/NOTIFY triggers ---
  try {
    const triggersSql = readFileSync(join(import.meta.dirname, 'notify-triggers.sql'), 'utf-8');
    const parts: string[] = [];
    let current = '';
    let inDollarBlock = false;
    const lines = triggersSql.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') && !inDollarBlock) continue;
      const dollarMatches = line.match(/\$\$/g);
      if (dollarMatches) {
        for (const _ of dollarMatches) inDollarBlock = !inDollarBlock;
      }
      current += line + '\n';
      if (!inDollarBlock && trimmed.endsWith(';')) {
        const stmt = current.trim().replace(/;$/, '');
        if (stmt.length > 0) parts.push(stmt);
        current = '';
      }
    }
    for (const stmt of parts) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log('Applied LISTEN/NOTIFY triggers');
  } catch (err) {
    console.warn('Could not apply triggers (may need to run manually):', err);
  }

  console.log('\nProduction seed completed!');
  console.log('Admin login: admin@ideahub.com / Qazxsw123**');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
