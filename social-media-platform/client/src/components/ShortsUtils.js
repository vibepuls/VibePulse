export function extractYouTubeVideoId(value) {
  try {
    const url = value instanceof URL ? value : new URL(String(value || '').trim());
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
      && /^\/shorts\/[A-Za-z0-9_-]{11}/.test(url.pathname);
  } catch {
    return false;
  }
}

export function getYouTubeShortEmbedUrl(value, origin = window.location.origin) {
  const id = /^[A-Za-z0-9_-]{11}$/.test(String(value || ''))
    ? String(value)
    : extractYouTubeVideoId(value);
  if (!id) return null;

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    modestbranding: '1',
    iv_load_policy: '3',
    origin
  });

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function normalizeShort(post) {
  const media = Array.isArray(post?.media) ? post.media.find((item) => item?.url || item?.embed_url) : post?.media;
  const source = media?.url || media?.embed_url || post?.media_url || '';
  const id = extractYouTubeVideoId(source);

  if (!id || !isYouTubeShort(source)) return null;

  return {
    id: post.id,
    videoId: id,
    postId: post.id,
    content: post.content || '',
    likesCount: Number(post.likes_count || 0),
    commentsCount: Number(post.comments_count || 0),
    sharesCount: Number(post.shares_count || 0),
    isLiked: Boolean(post.is_liked),
    creator: 'VibePulse Shorts',
    avatar: null,
    embedUrl: getYouTubeShortEmbedUrl(source)
  };
}

export function getShortsFromPosts(posts = []) {
  return posts.flatMap((post) => {
    const short = normalizeShort(post);
    return short ? [short] : [];
  });
}
