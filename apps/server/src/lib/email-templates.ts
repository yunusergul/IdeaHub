import { getT } from '../i18n/index.js';

interface EmailTemplate {
  subject: string;
  html: string;
}

function wrapHtml(body: string, locale: string): string {
  const t = getT(locale);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
  <p style="font-size: 12px; color: #9ca3af;">${t('emails:footer')}</p>
</body>
</html>`;
}

export function commentEmailTemplate(commenterName: string, ideaTitle: string, commentContent: string, locale = 'tr'): EmailTemplate {
  const t = getT(locale);
  return {
    subject: t('emails:commentSubject', { name: commenterName }),
    html: wrapHtml(`
      <h2 style="color: #6366f1;">${t('emails:commentTitle')}</h2>
      <p>${t('emails:commentBody', { name: commenterName, title: ideaTitle })}</p>
      <blockquote style="border-left: 3px solid #6366f1; padding: 8px 16px; margin: 16px 0; background: #f9fafb; border-radius: 4px;">
        ${commentContent}
      </blockquote>
    `, locale),
  };
}

export function voteEmailTemplate(voterName: string, ideaTitle: string, locale = 'tr'): EmailTemplate {
  const t = getT(locale);
  return {
    subject: t('emails:voteSubject', { name: voterName }),
    html: wrapHtml(`
      <h2 style="color: #6366f1;">${t('emails:voteTitle')}</h2>
      <p>${t('emails:voteBody', { name: voterName, title: ideaTitle })}</p>
    `, locale),
  };
}

export function statusEmailTemplate(ideaTitle: string, newStatusLabel: string, locale = 'tr'): EmailTemplate {
  const t = getT(locale);
  return {
    subject: t('emails:statusSubject', { status: newStatusLabel }),
    html: wrapHtml(`
      <h2 style="color: #6366f1;">${t('emails:statusTitle')}</h2>
      <p>${t('emails:statusBody', { title: ideaTitle, status: newStatusLabel })}</p>
    `, locale),
  };
}

export function surveyEmailTemplate(surveyTitle: string, creatorName: string, locale = 'tr'): EmailTemplate {
  const t = getT(locale);
  return {
    subject: t('emails:surveySubject', { title: surveyTitle }),
    html: wrapHtml(`
      <h2 style="color: #6366f1;">${t('emails:surveyTitle')}</h2>
      <p>${t('emails:surveyBody', { creator: creatorName, title: surveyTitle })}</p>
      <p>${t('emails:surveyAction')}</p>
    `, locale),
  };
}
