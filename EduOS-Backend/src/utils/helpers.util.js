export function formatDate(date) {
  return new Date(date).toISOString();
}

export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function truncate(str, length = 100) {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}

export function parseBoolean(value) {
  return value === 'true' || value === true || value === 1 || value === '1';
}

export function buildPagination(page = 1, limit = 10, total) {
  const currentPage = Math.max(1, parseInt(page, 10));
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const totalPages = Math.ceil(total / perPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage,
    perPage,
    totalItems: total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null,
  };
}
