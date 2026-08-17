const API_URL = import.meta.env.VITE_API_URL || 'https://vibepulse-backend-boxi.onrender.com/api';
export const mediaUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const origin = API_URL.replace(/\/api\/?$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};
