import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // --- Users ---
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'elif.kaya@sirket.com' },
      update: {},
      create: { email: 'elif.kaya@sirket.com', name: 'Elif Kaya', role: 'admin', department: 'Ürün Yönetimi', initials: 'EK', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'ahmet.yilmaz@sirket.com' },
      update: {},
      create: { email: 'ahmet.yilmaz@sirket.com', name: 'Ahmet Yılmaz', role: 'user', department: 'Yazılım Geliştirme', initials: 'AY', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'zeynep.demir@sirket.com' },
      update: {},
      create: { email: 'zeynep.demir@sirket.com', name: 'Zeynep Demir', role: 'user', department: 'Tasarım (UX/UI)', initials: 'ZD', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'can.ozturk@sirket.com' },
      update: {},
      create: { email: 'can.ozturk@sirket.com', name: 'Can Öztürk', role: 'product_manager', department: 'DevOps', initials: 'CÖ', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'selin.arslan@sirket.com' },
      update: {},
      create: { email: 'selin.arslan@sirket.com', name: 'Selin Arslan', role: 'user', department: 'Veri Bilimi', initials: 'SA', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'burak.celik@sirket.com' },
      update: {},
      create: { email: 'burak.celik@sirket.com', name: 'Burak Çelik', role: 'user', department: 'Yazılım Geliştirme', initials: 'BÇ', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'deniz.korkmaz@sirket.com' },
      update: {},
      create: { email: 'deniz.korkmaz@sirket.com', name: 'Deniz Korkmaz', role: 'user', department: 'İnsan Kaynakları', initials: 'DK', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'merve.aydin@sirket.com' },
      update: {},
      create: { email: 'merve.aydin@sirket.com', name: 'Merve Aydın', role: 'user', department: 'Pazarlama', initials: 'MA', passwordHash },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // --- Categories ---
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: 'tech-debt' }, update: {}, create: { id: 'tech-debt', label: 'Teknik Borç', icon: 'Bug', color: '#ef4444' } }),
    prisma.category.upsert({ where: { id: 'new-feature' }, update: {}, create: { id: 'new-feature', label: 'Yeni Özellik', icon: 'Sparkles', color: '#8b5cf6' } }),
    prisma.category.upsert({ where: { id: 'hr-culture' }, update: {}, create: { id: 'hr-culture', label: 'İK / Kültür', icon: 'Heart', color: '#ec4899' } }),
    prisma.category.upsert({ where: { id: 'process' }, update: {}, create: { id: 'process', label: 'Süreç İyileştirme', icon: 'RefreshCw', color: '#f59e0b' } }),
    prisma.category.upsert({ where: { id: 'security' }, update: {}, create: { id: 'security', label: 'Güvenlik', icon: 'Shield', color: '#10b981' } }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // --- Statuses ---
  const statuses = await Promise.all([
    prisma.status.upsert({ where: { id: 'pending' }, update: {}, create: { id: 'pending', label: 'Bekliyor', color: '#9ca3af', bg: '#f3f4f6', order: 1, description: 'Yeni gönderilen fikirler burada bekler.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'reviewing' }, update: {}, create: { id: 'reviewing', label: 'İnceleniyor', color: '#f59e0b', bg: '#fffbeb', order: 2, description: 'Yöneticiler tarafından değerlendiriliyor.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'approved' }, update: {}, create: { id: 'approved', label: 'Onaylandı', color: '#22c55e', bg: '#f0fdf4', order: 3, description: 'Onaylandı, sprint ataması bekleniyor.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'in-progress' }, update: {}, create: { id: 'in-progress', label: 'Geliştiriliyor', color: '#3b82f6', bg: '#eff6ff', order: 4, description: 'Sprint\'e atandı, aktif geliştirme aşamasında.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'completed' }, update: {}, create: { id: 'completed', label: 'Tamamlandı', color: '#6366f1', bg: '#eef2ff', order: 5, description: 'Geliştirme tamamlandı ve yayınlandı.', isSystem: true } }),
    prisma.status.upsert({ where: { id: 'rejected' }, update: {}, create: { id: 'rejected', label: 'Reddedildi', color: '#ef4444', bg: '#fef2f2', order: 0, description: 'Değerlendirme sonucu reddedildi.', isSystem: true } }),
  ]);

  console.log(`Created ${statuses.length} statuses`);

  // --- Sprints ---
  const sprints = await Promise.all([
    prisma.sprint.upsert({ where: { id: 'sp-4' }, update: {}, create: { id: 'sp-4', label: 'Sprint 4', startDate: new Date('2026-01-20'), endDate: new Date('2026-02-02'), isCurrent: false } }),
    prisma.sprint.upsert({ where: { id: 'sp-5' }, update: {}, create: { id: 'sp-5', label: 'Sprint 5', startDate: new Date('2026-02-03'), endDate: new Date('2026-02-16'), isCurrent: false } }),
    prisma.sprint.upsert({ where: { id: 'sp-6' }, update: {}, create: { id: 'sp-6', label: 'Sprint 6', startDate: new Date('2026-02-17'), endDate: new Date('2026-03-02'), isCurrent: true } }),
  ]);

  console.log(`Created ${sprints.length} sprints`);

  // --- Ideas ---
  const ideasData = [
    { id: 'i1', title: 'Mikroservis Mimarisine Geçiş Planı', summary: 'Mevcut monolitik yapımızı aşamalı olarak mikroservis mimarisine taşıyarak ölçeklenebilirlik sorunlarını çözmeli ve deployment sürecini hızlandırmalıyız.', content: '## Problem\nMevcut monolitik uygulamamız büyüdükçe deployment süreleri uzuyor, tek bir modüldeki hata tüm sistemi etkiliyor.\n\n## Çözüm Önerisi\n1. Domain-driven design ile bounded context\'leri belirleyelim\n2. İlk aşamada en bağımsız modülü (bildirim servisi) ayıralım\n3. API Gateway pattern uygulayalım\n4. Event-driven iletişim için Kafka kullanalım', categoryId: 'tech-debt', statusId: 'in-progress', authorId: users[1]!.id, sprintId: 'sp-5', upvotes: 47, downvotes: 3, commentCount: 4, createdAt: new Date('2026-02-15T10:30:00Z') },
    { id: 'i2', title: 'Çalışan Wellbeing Programı', summary: 'Uzaktan çalışma döneminde çalışan motivasyonunu artırmak için kapsamlı bir wellbeing programı oluşturulmalı.', content: 'Yoga seansları, mental sağlık danışmanlığı, esnek çalışma saatleri ve sosyal aktiviteler içeren bir program öneriyorum.', categoryId: 'hr-culture', statusId: 'approved', authorId: users[6]!.id, sprintId: 'sp-5', upvotes: 62, downvotes: 1, commentCount: 0, createdAt: new Date('2026-02-12T14:20:00Z') },
    { id: 'i3', title: 'CI/CD Pipeline Otomasyonu', summary: 'Jenkins yerine GitHub Actions kullanarak build ve deploy sürecini modernize edelim.', content: 'GitHub Actions ile modern bir CI/CD pipeline kurulmalı. Otomatik test, lint, güvenlik taraması ve staging ortamına deploy adımları eklenecek.', categoryId: 'tech-debt', statusId: 'reviewing', authorId: users[3]!.id, sprintId: 'sp-6', upvotes: 34, downvotes: 5, commentCount: 0, createdAt: new Date('2026-02-20T09:15:00Z') },
    { id: 'i4', title: 'Müşteri Geri Bildirim Portalı', summary: 'Müşterilerimizin doğrudan ürün ekibine geri bildirim gönderebildiği bir portal.', content: 'Müşteri deneyimini iyileştirmek ve ürün yol haritasını müşteri ihtiyaçlarına göre şekillendirmek için bir geri bildirim portalı oluşturulmalı.', categoryId: 'new-feature', statusId: 'pending', authorId: users[7]!.id, sprintId: 'sp-6', upvotes: 28, downvotes: 2, commentCount: 0, createdAt: new Date('2026-02-25T16:45:00Z') },
    { id: 'i5', title: 'Zero Trust Güvenlik Modeli', summary: 'Şirket içi ağ güvenliğini Zero Trust prensiplerine göre yeniden yapılandırma önerisi.', content: 'Modern güvenlik tehditlerine karşı Zero Trust modeline geçmemiz şart. Identity-aware proxy, MFA ve mikro-segmentasyon uygulanmalı.', categoryId: 'security', statusId: 'reviewing', authorId: users[3]!.id, sprintId: 'sp-6', upvotes: 41, downvotes: 7, commentCount: 0, createdAt: new Date('2026-02-18T11:00:00Z') },
    { id: 'i6', title: 'Onboarding Sürecinin Dijitalleştirilmesi', summary: 'Yeni çalışan oryantasyon sürecini tamamen dijital bir platforma taşıyarak ilk hafta deneyimini iyileştirme.', content: 'İnteraktif onboarding modülleri, otomatik hesap oluşturma, mentor eşleştirme ve ilerleme takibi içeren bir dijital onboarding sistemi.', categoryId: 'process', statusId: 'completed', authorId: users[6]!.id, sprintId: 'sp-4', upvotes: 55, downvotes: 0, commentCount: 0, createdAt: new Date('2026-01-28T08:30:00Z') },
    { id: 'i7', title: 'GraphQL API Katmanı Eklenmesi', summary: 'Frontend ekiplerinin veri çekme deneyimini iyileştirmek için mevcut REST API üzerine bir GraphQL katmanı ekleyelim.', content: 'Over-fetching ve under-fetching sorunlarını çözmek için GraphQL ekleyelim.', categoryId: 'new-feature', statusId: 'pending', authorId: users[5]!.id, sprintId: 'sp-6', upvotes: 19, downvotes: 8, commentCount: 0, createdAt: new Date('2026-02-27T13:20:00Z') },
    { id: 'i8', title: 'Haftalık Demo ve Bilgi Paylaşım Oturumları', summary: 'Her ekibin haftalık olarak yaptığı çalışmaları tüm şirkete sunduğu oturumlar.', content: 'Cross-functional iletişimi güçlendirmek ve bilgi silolarını kırmak için haftalık demo günleri düzenleyelim.', categoryId: 'hr-culture', statusId: 'approved', authorId: users[0]!.id, sprintId: 'sp-6', upvotes: 38, downvotes: 4, commentCount: 0, createdAt: new Date('2026-02-22T10:00:00Z') },
  ];

  for (const idea of ideasData) {
    await prisma.idea.upsert({
      where: { id: idea.id },
      update: {},
      create: idea,
    });
  }

  console.log(`Created ${ideasData.length} ideas`);

  // --- Votes ---
  const votesData = [
    { ideaId: 'i1', userId: users[0]!.id }, { ideaId: 'i1', userId: users[2]!.id },
    { ideaId: 'i1', userId: users[3]!.id }, { ideaId: 'i1', userId: users[4]!.id },
    { ideaId: 'i2', userId: users[0]!.id }, { ideaId: 'i2', userId: users[1]!.id },
    { ideaId: 'i2', userId: users[2]!.id }, { ideaId: 'i2', userId: users[4]!.id },
    { ideaId: 'i2', userId: users[5]!.id }, { ideaId: 'i2', userId: users[6]!.id },
    { ideaId: 'i3', userId: users[1]!.id }, { ideaId: 'i3', userId: users[3]!.id },
    { ideaId: 'i4', userId: users[0]!.id }, { ideaId: 'i4', userId: users[6]!.id },
    { ideaId: 'i5', userId: users[0]!.id }, { ideaId: 'i5', userId: users[1]!.id },
    { ideaId: 'i5', userId: users[4]!.id }, { ideaId: 'i5', userId: users[5]!.id },
  ];

  for (const vote of votesData) {
    await prisma.vote.upsert({
      where: { ideaId_userId: { ideaId: vote.ideaId, userId: vote.userId } },
      update: {},
      create: { ...vote, type: 'up' },
    });
  }

  console.log(`Created ${votesData.length} votes`);

  // --- Comments ---
  const c1 = await prisma.comment.upsert({
    where: { id: 'c1' },
    update: {},
    create: { id: 'c1', ideaId: 'i1', userId: users[3]!.id, content: 'Bu geçiş için önce domain mapping workshop yapmalıyız. Geçen hafta benzer bir çalışma yaptık, notlarımı paylaşabilirim.', createdAt: new Date('2026-02-16T09:00:00Z') },
  });

  await prisma.comment.upsert({
    where: { id: 'c1r1' },
    update: {},
    create: { id: 'c1r1', ideaId: 'i1', userId: users[1]!.id, content: 'Harika olur! Workshop için Mart ayı başını hedefleyelim mi?', parentId: c1.id, createdAt: new Date('2026-02-16T10:30:00Z') },
  });

  await prisma.comment.upsert({
    where: { id: 'c1r2' },
    update: {},
    create: { id: 'c1r2', ideaId: 'i1', userId: users[0]!.id, content: 'Ben de katılmak isterim. Ürün perspektifinden domain boundary\'leri hakkında fikirlerim var.', parentId: c1.id, createdAt: new Date('2026-02-16T11:15:00Z') },
  });

  await prisma.comment.upsert({
    where: { id: 'c2' },
    update: {},
    create: { id: 'c2', ideaId: 'i1', userId: users[4]!.id, content: 'Kafka yerine RabbitMQ düşünmeli miyiz? Veri hacmimiz şu an için Kafka gerektirmiyor olabilir.', createdAt: new Date('2026-02-17T14:20:00Z') },
  });

  console.log('Created comments');

  // --- Surveys ---
  const survey = await prisma.survey.upsert({
    where: { id: 's1' },
    update: {},
    create: {
      id: 's1',
      title: 'Mikroservis Geçiş Önceliklendirmesi',
      question: 'Hangi modülün ilk olarak ayrılmasını tercih edersiniz?',
      type: 'poll',
      ideaId: 'i1',
      createdById: users[0]!.id,
      isActive: true,
      targetDepartments: ['Yazılım Geliştirme', 'DevOps'],
    },
  });

  const surveyOptions = await Promise.all([
    prisma.surveyOption.upsert({ where: { id: 'o1' }, update: {}, create: { id: 'o1', surveyId: 's1', label: 'Bildirim Servisi' } }),
    prisma.surveyOption.upsert({ where: { id: 'o2' }, update: {}, create: { id: 'o2', surveyId: 's1', label: 'Kullanıcı Yönetimi' } }),
    prisma.surveyOption.upsert({ where: { id: 'o3' }, update: {}, create: { id: 'o3', surveyId: 's1', label: 'Raporlama Modülü' } }),
    prisma.surveyOption.upsert({ where: { id: 'o4' }, update: {}, create: { id: 'o4', surveyId: 's1', label: 'Ödeme Sistemi' } }),
  ]);

  console.log('Created surveys');

  // --- Bulk Ideas for infinite scroll testing ---
  const bulkIdeaTitles = [
    'Kubernetes Cluster Yönetim Aracı', 'Otomatik Kod Review Sistemi', 'Internal Developer Portal',
    'Çalışan Memnuniyet Anketi Platformu', 'A/B Testing Altyapısı', 'Merkezi Log Yönetim Sistemi',
    'API Versiyonlama Stratejisi', 'Mobil Uygulama Performans İzleme', 'Dark Mode Desteği',
    'Çoklu Dil Desteği (i18n)', 'Gerçek Zamanlı Dashboard', 'Otomatik Yedekleme Sistemi',
    'SSO Entegrasyonu', 'Feature Flag Yönetimi', 'Chatbot Entegrasyonu',
    'Veri Anonimleştirme Aracı', 'Otomatik Kapasite Planlama', 'Teknik Dokümantasyon Wiki',
    'Hata Takip Sistemi İyileştirmesi', 'Performance Budget Tanımlama',
    'CDN Optimizasyonu', 'Database Migration Otomasyonu', 'Canary Deployment Stratejisi',
    'Çalışan Tanıma ve Ödüllendirme Sistemi', 'Mentorluk Programı Dijitalleştirilmesi',
    'Şirket İçi Podcast Platformu', 'Bilgi Bankası ve FAQ Sistemi', 'Otomatik Güvenlik Taraması',
    'Erişilebilirlik (a11y) Denetimi', 'GraphQL Federation Mimarisi',
    'Mikrofrontend Geçiş Planı', 'Sürekli Entegrasyon Metrikleri', 'API Rate Limiting Altyapısı',
    'Observability Stack Kurulumu', 'Disaster Recovery Planı', 'Compliance Dashboard',
    'İç İletişim Platformu', 'Proje Bütçe Takip Aracı', 'Otomatik Regression Test Suite',
    'Müşteri Segmentasyon Aracı', 'Real-time Notification Sistemi', 'Veri Kalitesi İzleme Aracı',
    'Service Mesh Implementasyonu', 'Database Sharding Stratejisi', 'Edge Computing Araştırması',
    'Açık Kaynak Katkı Politikası', 'Hackathon Organizasyonu', 'Şirket İçi Eğitim Platformu',
    'Uzaktan Çalışma Araç Seti', 'Karbon Ayak İzi Takip Sistemi',
  ];

  const bulkIdeaSummaries = [
    'K8s cluster\'larını merkezi bir arayüzden yönetme ve izleme.',
    'PR\'lar için AI destekli otomatik kod inceleme sistemi.',
    'Geliştiricilerin tüm araç ve servislere tek noktadan erişimi.',
    'Düzenli çalışan memnuniyet anketleri için özel platform.',
    'Ürün kararlarını veriye dayandırmak için A/B test altyapısı.',
    'Tüm servislerin loglarını merkezi bir sistemde toplama.',
    'API değişikliklerini geriye uyumlu şekilde yönetme stratejisi.',
    'Mobil uygulamanın performans metriklerini gerçek zamanlı izleme.',
    'Tüm uygulamalarda karanlık tema desteği eklenmesi.',
    'Uygulamanın birden fazla dilde kullanılabilmesi.',
    'İş metrikleri için gerçek zamanlı görselleştirme paneli.',
    'Veritabanı ve dosya sisteminin otomatik yedeklenmesi.',
    'Tek oturum açma ile tüm şirket araçlarına erişim.',
    'Özelliklerin aşamalı olarak açılıp kapatılması altyapısı.',
    'Müşteri destek süreçlerini otomatikleştiren chatbot.',
    'Kişisel verilerin güvenli şekilde anonimleştirilmesi.',
    'Sistem kaynaklarının otomatik ölçeklenmesi için planlama.',
    'Teknik bilgi birikiminin paylaşıldığı wiki platformu.',
    'Mevcut bug tracking sisteminin UX iyileştirmesi.',
    'Frontend performansı için bütçe limitleri tanımlama.',
    'Statik içeriklerin CDN üzerinden dağıtım optimizasyonu.',
    'Veritabanı migration süreçlerinin tam otomasyonu.',
    'Yeni sürümlerin kademeli olarak dağıtılması stratejisi.',
    'Çalışanların başarılarının görünür kılınması sistemi.',
    'Mentorluk ilişkilerinin dijital platformda yönetilmesi.',
    'Şirket kültürünü güçlendiren podcast yayınları.',
    'Sık sorulan soruların merkezi bir yerde toplanması.',
    'Kod ve altyapının otomatik güvenlik açığı taraması.',
    'Web uygulamalarının erişilebilirlik standartlarına uyumu.',
    'GraphQL servislerinin federasyon ile birleştirilmesi.',
    'Frontend uygulamasının mikrofrontend mimarisine geçişi.',
    'CI pipeline performans ve güvenilirlik metrikleri.',
    'API çağrılarının limitlenmesi için merkezi altyapı.',
    'Logging, tracing ve metriklerin birleştirilmesi.',
    'Felaket durumunda iş sürekliliği planı.',
    'Regülasyon uyumluluğunun izlendiği dashboard.',
    'Ekipler arası iletişimi güçlendiren platform.',
    'Proje harcamalarının gerçek zamanlı takibi.',
    'Kritik akışlar için otomatik regresyon testleri.',
    'Müşterilerin davranışlarına göre segmentasyonu.',
    'Kullanıcılara anlık bildirim gönderim sistemi.',
    'Veri pipeline\'larındaki kalite sorunlarının izlenmesi.',
    'Mikroservisler arası iletişim için service mesh.',
    'Veritabanının yatay ölçeklenmesi için sharding.',
    'Edge computing kullanım alanları araştırması.',
    'Açık kaynak projelere katkı için şirket politikası.',
    'Şirket içi yenilikçilik hackathon\'u organizasyonu.',
    'Çalışanların teknik becerilerini geliştirme platformu.',
    'Uzaktan çalışanlar için verimlilik araç seti.',
    'Şirketin çevresel etkisinin ölçülmesi ve azaltılması.',
  ];

  const categoryIds = ['tech-debt', 'new-feature', 'hr-culture', 'process', 'security'];
  const statusIds = ['pending', 'reviewing', 'approved', 'in-progress', 'completed', 'rejected'];
  const sprintIds = ['sp-4', 'sp-5', 'sp-6', null];

  for (let idx = 0; idx < bulkIdeaTitles.length; idx++) {
    const id = `bulk-i-${idx + 1}`;
    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.idea.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title: bulkIdeaTitles[idx]!,
        summary: bulkIdeaSummaries[idx]!,
        content: `## Detay\n\n${bulkIdeaSummaries[idx]}\n\n## Beklenen Fayda\n\nVerimliliği artırma, maliyetleri düşürme ve ekip memnuniyetini yükseltme.`,
        categoryId: categoryIds[idx % categoryIds.length]!,
        statusId: statusIds[idx % statusIds.length]!,
        authorId: users[idx % users.length]!.id,
        sprintId: sprintIds[idx % sprintIds.length] ?? undefined,
        upvotes: Math.floor(Math.random() * 80),
        downvotes: Math.floor(Math.random() * 10),
        commentCount: Math.floor(Math.random() * 15),
        createdAt,
      },
    });
  }

  console.log(`Created ${bulkIdeaTitles.length} bulk ideas`);

  // --- Bulk Surveys for infinite scroll testing ---
  const bulkSurveyData = [
    { title: 'Frontend Framework Tercihi', question: 'Yeni projelerde hangi framework kullanılmalı?', opts: ['React', 'Vue', 'Svelte', 'Angular'] },
    { title: 'Ofis Çalışma Modeli', question: 'Hangi çalışma modelini tercih ediyorsunuz?', opts: ['Tam Uzaktan', 'Hibrit (3+2)', 'Hibrit (2+3)', 'Tam Ofis'] },
    { title: 'Sprint Süresi', question: 'İdeal sprint süresi nedir?', opts: ['1 Hafta', '2 Hafta', '3 Hafta', '4 Hafta'] },
    { title: 'CI/CD Aracı Seçimi', question: 'Hangi CI/CD aracını tercih edersiniz?', opts: ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI'] },
    { title: 'Mesajlaşma Aracı', question: 'Ekip içi iletişim için hangi aracı kullanmalıyız?', opts: ['Slack', 'Microsoft Teams', 'Discord', 'Mattermost'] },
    { title: 'Code Review Süreci', question: 'Code review için kaç onaylayan gerekli?', opts: ['1 Kişi', '2 Kişi', '3 Kişi', 'Takım Büyüklüğüne Göre'] },
    { title: 'Monitoring Aracı', question: 'Sistem izleme için hangi araç?', opts: ['Datadog', 'Grafana Stack', 'New Relic', 'Prometheus + Alertmanager'] },
    { title: 'Veritabanı Tercihi', question: 'Yeni mikroservisler için hangi veritabanı?', opts: ['PostgreSQL', 'MongoDB', 'MySQL', 'CockroachDB'] },
    { title: 'Test Stratejisi', question: 'Hangi test seviyesine daha fazla yatırım yapmalıyız?', opts: ['Unit Test', 'Integration Test', 'E2E Test', 'Hepsine Eşit'] },
    { title: 'Deployment Sıklığı', question: 'İdeal deployment sıklığı nedir?', opts: ['Günde Birden Fazla', 'Günlük', 'Haftalık', 'Sprint Sonunda'] },
    { title: 'Toplantı Günleri', question: 'Toplantısız gün hangi gün olsun?', opts: ['Pazartesi', 'Çarşamba', 'Cuma', 'Toplantısız Gün Olmasın'] },
    { title: 'Eğitim Bütçesi Kullanımı', question: 'Eğitim bütçenizi nasıl kullanmak istersiniz?', opts: ['Online Kurslar', 'Konferanslar', 'Kitaplar', 'Sertifikalar'] },
    { title: 'Hackathon Teması', question: 'Bir sonraki hackathon teması ne olsun?', opts: ['AI/ML Projeleri', 'Developer Tools', 'Sosyal Fayda', 'Oyun Geliştirme'] },
    { title: 'Kod Stili', question: 'Hangi linting/formatting aracını standart yapalım?', opts: ['ESLint + Prettier', 'Biome', 'Rome', 'Mevcut Kalabilir'] },
    { title: 'API Tasarım Stili', question: 'Yeni API\'ler için hangi stil?', opts: ['REST', 'GraphQL', 'gRPC', 'tRPC'] },
    { title: 'Konteyner Orkestrasyonu', question: 'Konteyner yönetimi için tercih?', opts: ['Kubernetes', 'Docker Swarm', 'ECS', 'Nomad'] },
    { title: 'Yemek Tercihi', question: 'Ofis yemekhane menüsüne ne ekleyelim?', opts: ['Vegan Seçenekler', 'Dünya Mutfakları', 'Sağlıklı Atıştırmalık', 'Kahve Çeşitleri'] },
    { title: 'Sosyal Aktivite', question: 'Ekip aktivitesi olarak ne yapalım?', opts: ['Bowling', 'Escape Room', 'Doğa Yürüyüşü', 'Film Gecesi'] },
    { title: 'Uzaktan Çalışma Desteği', question: 'Uzaktan çalışma için hangi destek artırılmalı?', opts: ['Ekipman Bütçesi', 'İnternet Desteği', 'Co-working Space', 'Ergonomik Mobilya'] },
    { title: 'Teknik Borç Önceliklendirme', question: 'Hangi teknik borç öncelikli ele alınsın?', opts: ['Legacy Kod Modernizasyonu', 'Test Coverage', 'Dokümantasyon', 'Dependency Güncellemeleri'] },
    { title: 'Incident Response Süreci', question: 'Olay müdahale sürecinde neleri iyileştirelim?', opts: ['On-call Rotasyonu', 'Runbook\'lar', 'Post-mortem Kültürü', 'Escalation Yolları'] },
    { title: 'Performans Değerlendirme', question: 'Performans değerlendirme sıklığı nasıl olmalı?', opts: ['Aylık 1-on-1', 'Üç Aylık', 'Altı Aylık', 'Yıllık'] },
    { title: 'Open Source Katılım', question: 'Hangi açık kaynak projeye katkı sağlamalıyız?', opts: ['Kubernetes', 'React', 'PostgreSQL', 'Kendi Projemizi Açalım'] },
    { title: 'Yeni Ofis Tasarımı', question: 'Yeni ofiste hangi alan daha geniş olsun?', opts: ['Sessiz Çalışma Alanı', 'Toplantı Odaları', 'Sosyal Alan', 'Oyun/Dinlenme Alanı'] },
    { title: 'Güvenlik Eğitimi', question: 'Güvenlik farkındalığı için hangi yöntem?', opts: ['Aylık Workshop', 'Phishing Simülasyonu', 'CTF Yarışmaları', 'Online Modüller'] },
  ];

  for (let idx = 0; idx < bulkSurveyData.length; idx++) {
    const sId = `bulk-s-${idx + 1}`;
    const daysAgo = Math.floor(Math.random() * 40) + 1;
    const isActive = Math.random() > 0.3;

    await prisma.survey.upsert({
      where: { id: sId },
      update: {},
      create: {
        id: sId,
        title: bulkSurveyData[idx]!.title,
        question: bulkSurveyData[idx]!.question,
        type: 'poll',
        createdById: users[idx % users.length]!.id,
        isActive,
        targetDepartments: [],
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      },
    });

    // Create options for each survey
    for (let oi = 0; oi < bulkSurveyData[idx]!.opts.length; oi++) {
      const optId = `${sId}-o${oi + 1}`;
      await prisma.surveyOption.upsert({
        where: { id: optId },
        update: {},
        create: {
          id: optId,
          surveyId: sId,
          label: bulkSurveyData[idx]!.opts[oi]!,
        },
      });

      // Add random votes from users
      const voterCount = Math.floor(Math.random() * 4);
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      for (let vi = 0; vi < voterCount && vi < shuffledUsers.length; vi++) {
        const voteId = `${optId}-v${vi}`;
        // Check user hasn't already voted on another option of this survey
        const existingVote = await prisma.surveyVote.findFirst({
          where: { userId: shuffledUsers[vi]!.id, option: { surveyId: sId } },
        });
        if (!existingVote) {
          await prisma.surveyVote.upsert({
            where: { id: voteId },
            update: {},
            create: { id: voteId, optionId: optId, userId: shuffledUsers[vi]!.id },
          });
        }
      }
    }
  }

  console.log(`Created ${bulkSurveyData.length} bulk surveys`);

  // --- Voting Rules ---
  await Promise.all([
    prisma.votingRule.upsert({ where: { id: 'vr1' }, update: {}, create: { id: 'vr1', categoryId: 'tech-debt', department: 'Yazılım Geliştirme', multiplier: 2.0, isActive: true } }),
    prisma.votingRule.upsert({ where: { id: 'vr2' }, update: {}, create: { id: 'vr2', categoryId: 'security', department: 'DevOps', multiplier: 1.5, isActive: true } }),
    prisma.votingRule.upsert({ where: { id: 'vr3' }, update: {}, create: { id: 'vr3', categoryId: 'hr-culture', department: 'İnsan Kaynakları', multiplier: 1.8, isActive: false } }),
  ]);

  console.log('Created voting rules');

  // --- Notifications ---
  await Promise.all([
    prisma.notification.upsert({ where: { id: 'n1' }, update: {}, create: { id: 'n1', userId: users[0]!.id, type: 'comment', message: 'Can Öztürk fikrinize yorum yaptı', relatedId: 'i1', read: false, createdAt: new Date('2026-02-28T08:00:00Z') } }),
    prisma.notification.upsert({ where: { id: 'n2' }, update: {}, create: { id: 'n2', userId: users[0]!.id, type: 'upvote', message: 'Fikriniz 50 oy barajını geçti!', relatedId: 'i2', read: false, createdAt: new Date('2026-02-27T16:30:00Z') } }),
    prisma.notification.upsert({ where: { id: 'n3' }, update: {}, create: { id: 'n3', userId: users[0]!.id, type: 'status', message: 'Fikrinizin durumu "Geliştiriliyor" olarak güncellendi', relatedId: 'i1', read: true, createdAt: new Date('2026-02-26T12:00:00Z') } }),
    prisma.notification.upsert({ where: { id: 'n4' }, update: {}, create: { id: 'n4', userId: users[0]!.id, type: 'survey', message: 'Yeni anket: Mikroservis Geçiş Önceliklendirmesi', relatedId: 'i1', read: true, createdAt: new Date('2026-02-25T09:00:00Z') } }),
  ]);

  console.log('Created notifications');

  // --- User Preferences ---
  for (const user of users) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  console.log(`Created ${users.length} user preferences`);

  // --- Apply LISTEN/NOTIFY triggers ---
  try {
    const triggersSql = readFileSync(join(import.meta.dirname, 'notify-triggers.sql'), 'utf-8');
    // Split SQL into individual statements, respecting $$ delimited function bodies
    // Strategy: replace semicolons inside $$ blocks, split, then restore
    const parts: string[] = [];
    let current = '';
    let inDollarBlock = false;
    const lines = triggersSql.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') && !inDollarBlock) continue;
      // Count $$ occurrences to track dollar-quoted blocks
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

  console.log('Seed completed successfully!');
  console.log(`\nDefault login: any user email with password "${DEFAULT_PASSWORD}"`);
  console.log('Example: elif.kaya@sirket.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
