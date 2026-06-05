export function isImagePath(path) {
  const p = path || '';
  if (p.startsWith('/avatars/user/')) return true;
  if (p.startsWith('/attachments/db/')) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(p);
}

export function isImageAttachment(attachment) {
  if (!attachment) return false;
  if (attachment.mime?.startsWith('image/')) return true;
  return isImagePath(attachment.url) || isImagePath(attachment.name);
}

export function imageMimeFromPath(path) {
  const ext = (path || '').split('.').pop()?.toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
  };
  return map[ext] || 'image/jpeg';
}
