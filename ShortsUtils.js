export const FALLBACK_SHORTS = [
  'OS6znEJWWSQ',
  'SH2CMN_-dsI',
  'SVZ6wp1q8rI',
  'PfsYnAbxFTs',
  'QcHnK2ieMEQ',
  'RBydcIKzDhU',
  'uigJ41xv6TY',
  '1Zosx1gNHzM',
  'dQw4w9WgXcQ',
  '9bZkp7q19f0',
  'kJQP7kiw5Fk',
  'JGwWNGJdvx8',
  'OPf0YbXqDm0',
  'RgKAFK5djSk',
  'CevxZvSJLk8',
  'YQHsXMglC9A',
  'fRh_vgS2dFE',
  'hT_nvWreIhg',
  '60ItHLz5WEA',
  '3JZ_D3ELwOQ',
  'L_jWHffIx5E',
  '2Vv-BfVoq4g',
  'uelHwf8o7_U',
  'C0DPdy98e4c',
  'lp-EO5I60KA',
  'ktvTqknDobU',
  'pRpeEdMmmQ0',
  'kXYiU_JCYtU',
  '09R8_2nJtjg',
  'e-ORhEE9VVg',
  'YykjpeuMNEk',
  '2vjPBrBU-TM',
  'fLexgOxsZu0',
  'KQ6zr6kCPj8',
  'SlPhMPnQ58k',
  'RBumgq5yVrA',
  'tAGnKpE4NCI',
  'hLQl3WQQoQ0',
  'V-_O7nl0Ii0',
  '3AtDnEC4zak',
  'ru0K8uYEZWw',
  'tgbNymZ7vqY',
  'fJ9rUzIMcZQ',
  'M7lc1UVf-VE',
  'ScMzIvxBSi4',
  'ysz5S6PUM-U',
  'oHg5SJYRHA0',
  'Zi_XLOBDo_Y',
  'kffacxfA7G4',
  'hTWKbfoikeg',
  '2g5xk5I4qZQ',
  'hY7m5jjJ9mM'
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
    content: item?.content || item?.title || 'Trending short on VibePulse',
    tags: Array.isArray(item?.tags) ? item.tags : ['#shorts'],
    durationSec: Number(item?.durationSec || item?.duration || 30),
    likesCount: Number(item?.likesCount || 0),
    commentsCount: Number(item?.commentsCount || 0),
    sharesCount: Number(item?.sharesCount || 0),
    isLiked: Boolean(item?.isLiked),
    creator: item?.creator || 'VibePulse Trends',
    avatar: item?.avatar || '/default-avatar.svg',
    source: item?.source || 'fallback',
    position: index
  };
}

export function getFallbackShorts() {
  const shuffled = [...FALLBACK_SHORTS];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((videoId, index) => normalizeShort({ videoId }, index)).filter(Boolean);
}


export function getShortsFromPosts(posts = []) {
  const result = [];
  for (const post of Array.isArray(posts) ? posts : []) {
    const mediaItems = Array.isArray(post?.media) ? post.media : [];
    for (const media of mediaItems) {
      const source = media?.url || media?.embed_url || media?.media_url || '';
      if (!isYouTubeShort(source)) continue;
      const item = normalizeShort({
        id: `${post.id || 'post'}-${extractYouTubeVideoId(source)}`,
        videoId: extractYouTubeVideoId(source),
        postId: post.id || null,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        sharesCount: post.shares_count,
        isLiked: post.is_liked
      }, result.length);
      if (item) result.push(item);
    }
  }
  return result;
}
