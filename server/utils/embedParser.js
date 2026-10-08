
const DIRECT_IMAGE_EXTENSIONS = /\.(?:jpe?g|png|gif|webp|avif)(?:[?#].*)?$/i;
const DIRECT_VIDEO_EXTENSIONS = /\.(?:mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i;

function cleanUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Media URL is required.');
  if (raw.length > 2000) throw new Error('Media URL is too long.');
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) media URLs are supported.');
  return parsed;
}

function parseYouTube(url) {
  let id = null;
  if (url.hostname === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0];
  if (/youtube\.com$/i.test(url.hostname) || /youtube-nocookie\.com$/i.test(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2];
    else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
    else if (url.pathname.startsWith('/live/')) id = url.pathname.split('/')[2];
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return {
    provider: 'youtube',
    type: 'video',
    original_url: url.toString(),
    embed_url: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    title: 'YouTube video'
  };
}

function parseInstagram(url) {
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;
  return {
    provider: 'instagram',
    type: 'video',
    original_url: url.toString(),
    embed_url: `https://www.instagram.com/${url.pathname.split('/')[1]}/${match[1]}/embed`,
    title: 'Instagram post'
  };
}

function parseFacebook(url) {
  if (!/(^|\.)facebook\.com$/i.test(url.hostname) && !/(^|\.)fb\.watch$/i.test(url.hostname)) return null;
  if (url.hostname === 'fb.watch') {
    return {
      provider: 'facebook',
      type: 'video',
      original_url: url.toString(),
      embed_url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`,
      title: 'Facebook video'
    };
  }
  return {
    provider: 'facebook',
    type: 'video',
    original_url: url.toString(),
    embed_url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url.toString())}&show_text=false`,
    title: 'Facebook post'
  };
}

function parseDirect(url) {
  const value = url.toString();
  if (DIRECT_IMAGE_EXTENSIONS.test(value)) {
    return { provider: 'direct', type: 'image', original_url: value, embed_url: value, title: 'Image' };
  }
  if (DIRECT_VIDEO_EXTENSIONS.test(value)) {
    return { provider: 'direct', type: 'video', original_url: value, embed_url: value, title: 'Video' };
  }
  return null;
}

function parseMediaUrl(value) {
  const url = cleanUrl(value);
  return parseYouTube(url) || parseInstagram(url) || parseFacebook(url) || parseDirect(url);
}

module.exports = { parseMediaUrl };
