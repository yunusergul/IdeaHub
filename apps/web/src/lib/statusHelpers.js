import i18n from '../i18n';

/**
 * Get translated status label. Falls back to status.label from DB if no translation found.
 */
export function getStatusLabel(status) {
  if (!status) return '';
  const key = `common:statuses.${status.id}`;
  return i18n.exists(key) ? i18n.t(key) : status.label;
}

/**
 * Get translated status description. Falls back to status.description from DB.
 */
export function getStatusDescription(status) {
  if (!status) return '';
  const key = `common:statusDescriptions.${status.id}`;
  return i18n.exists(key) ? i18n.t(key) : status.description;
}
