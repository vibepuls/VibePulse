const configuredApiUrl = (import.meta.env.VITE_API_URL || 'https://vibepulse-backend-boxi.onrender.com/api').trim();

// Accept either https://host/api or https://host and always normalize to /api.
export const API_URL = configuredApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/+$/, '')
  : `${configuredApiUrl.replace(/\/+$/, '')}/api`;

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const mediaUrl = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  // Keep data/blob URLs untouched.
  if (/^(data:|blob:)/i.test(raw)) return raw;

  // Relative upload paths are served by the Render backend.
  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
    return `${API_ORIGIN}/${raw.replace(/^\/+/, '')}`;
  }

  // Old database records may contain an absolute localhost/old Render URL.
  // If it points to /uploads, rebuild it against the current backend.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith('/uploads/')) {
        return `${API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {}
    return raw;
  }

  return `${API_ORIGIN}/${raw.replace(/^\/+/, '')}`;
};

export const avatarUrl = (value, name = 'User') => {
  const resolved = mediaUrl(value);
  if (resolved) return resolved;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&size=128`;
};

export const handleAvatarError = (event, name = 'User') => {
  const img = event.currentTarget;
  if (img.dataset.avatarFallback === '1') return;
  img.dataset.avatarFallback = '1';
  img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&size=128`;
};
