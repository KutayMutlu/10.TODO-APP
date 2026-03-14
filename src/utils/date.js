export const toJSDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    if (dateValue.seconds) {
      const d = new Date(dateValue.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export const formatTodoDate = (dateValue, lang = 'en') => {
  const d = toJSDate(dateValue);
  if (!d) return '';

  let locale = 'en-US';
  if (lang === 'tr') locale = 'tr-TR';
  else if (lang === 'fr') locale = 'fr-FR';
  else if (lang === 'sq') locale = 'sq-AL';

  const formatted = d.toLocaleString(locale, {
    year: 'numeric',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en',
  });

  if (lang === 'fr' && formatted.length > 0) {
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  return formatted;
};

export const formatFirebaseDate = (dateValue) => {
  const d = toJSDate(dateValue);
  if (!d) return '---';
  try {
    return d.toLocaleString();
  } catch {
    return '---';
  }
};

/** Tarih + saat - deadline gösterimi için */
export const formatDeadlineDate = (dateValue, lang = 'en') => {
  const d = toJSDate(dateValue);
  if (!d) return '';

  let locale = 'en-US';
  if (lang === 'tr') locale = 'tr-TR';
  else if (lang === 'fr') locale = 'fr-FR';
  else if (lang === 'sq') locale = 'sq-AL';

  return d.toLocaleString(locale, {
    year: 'numeric',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en',
  });
};

/** Deadline'ı <input type="datetime-local"> value için YYYY-MM-DDTHH:mm çevirir (yerel saat) */
export const deadlineToInputValue = (dateValue) => {
  const d = toJSDate(dateValue);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

