export const FALLBACK_SHORTS = [
  'OS6znEJWWSQ',
  'SH2CMN_-dsI',
  'SVZ6wp1q8rI',
  'PfsYnAbxFTs',
  'QcHnK2ieMEQ',
  'RBydcIKzDhU',
  'uigJ41xv6TY',
  '1Zosx1gNHzM'
];

export function extractYouTubeVideoId(value) {
  try {
    const raw = String(value || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

    const url = value instanceof URL ? value : new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    let id = null;
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0];
    } else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(?:shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function isYouTubeShort(value) {
  try {
    const url = value instanceof URL ? value : new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)
      && /^\/shorts\/[A-Za-z0-9_-]{11}(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

export function getYouTubeShortEmbedUrl(value, origin = window.location.origin, muted = true) {
  const id = extractYouTubeVideoId(value);
  if (!id) return null;

  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: id,
    controls: '0',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    modestbranding: '1',
    showinfo: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    origin
  });

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function normalizeShort(item, index = 0) {
  const videoId = extractYouTubeVideoId(item?.videoId || item?.url || item?.embed_url || item?.media_url || item);
  if (!videoId) return null;

  return {
    id: item?.id || `short-${videoId}`,
    videoId,
    postId: item?.postId || null,
    content: 'Trending short on VibePulse',
    likesCount: Number(item?.likesCount || 0),
    commentsCount: Number(item?.commentsCount || 0),
    sharesCount: Number(item?.sharesCount || 0),
    isLiked: Boolean(item?.isLiked),
    creator: 'VibePulse Trends',
    avatar: '/default-avatar.svg',
    source: item?.source || 'fallback',
    position: index
  };
}

export function getFallbackShorts() {
  return FALLBACK_SHORTS.map((videoId, index) => normalizeShort({ videoId }, index));
}
