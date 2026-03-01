import i18n from '../i18n';

interface StatusLike {
  id: string;
  label: string;
  description?: string;
}

export function getStatusLabel(status: StatusLike | null | undefined): string {
  if (!status) return '';
  const key = `common:statuses.${status.id}`;
  return i18n.exists(key) ? i18n.t(key) : status.label;
}

export function getStatusDescription(status: StatusLike | null | undefined): string {
  if (!status) return '';
  const key = `common:statusDescriptions.${status.id}`;
  return i18n.exists(key) ? i18n.t(key) : (status.description ?? '');
}
