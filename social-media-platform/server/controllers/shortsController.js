const FALLBACK_SHORT_IDS = [
  // Public Shorts used only when the YouTube Data API is unavailable.
  'OS6znEJWWSQ',
  'SH2CMN_-dsI',
  'SVZ6wp1q8rI',
  'PfsYnAbxFTs',
  'QcHnK2ieMEQ',
  'RBydcIKzDhU',
  'uigJ41xv6TY',
  '1Zosx1gNHzM'
];

const CACHE_TTL_MS = 60 * 1000;
let cached = { expiresAt: 0, items: null, source: null };

function normalizeIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id));
}

function fallbackItems() {
  const configured = normalizeIds(process.env.VIBEPULSE_SHORT_FALLBACK_IDS);
  const ids = configured.length ? configured : FALLBACK_SHORT_IDS;

  return ids.map((videoId, index) => ({
    id: `fallback-${videoId}`,
    videoId,
    postId: null,
    content: 'Trending short on VibePulse',
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isLiked: false,
    creator: 'VibePulse Trends',
    avatar: null,
    source: 'fallback',
    position: index
  }));
}

function toApiItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const videoId = item?.id?.videoId;
      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

      return {
        id: `youtube-${videoId}`,
        videoId,
        postId: null,
        content: 'Trending short on VibePulse',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        creator: 'VibePulse Trends',
        avatar: null,
        source: 'youtube-api',
        position: index
      };
    })
    .filter(Boolean);
}

async function fetchFromYouTube(limit) {
  const key = String(process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: 'shorts',
    videoDuration: 'short',
    order: 'viewCount',
    maxResults: String(Math.min(Math.max(limit, 5), 50)),
    key
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return toApiItems(data.items);
}

exports.getShorts = async (req, res, next) => {
  try {
    const requested = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 5), 30);
    const now = Date.now();

    if (cached.items && cached.expiresAt > now) {
      return res.json({
        items: cached.items.slice(0, requested),
        source: cached.source,
        fallback: cached.source === 'fallback'
      });
    }

    let items = [];
    let source = 'fallback';

    try {
      items = await fetchFromYouTube(requested);
      if (items.length) source = 'youtube-api';
    } catch (error) {
      console.warn('[shorts] YouTube API unavailable; using fallback:', error.message);
    }

    if (!items.length) items = fallbackItems();

    cached = {
      items,
      source,
      expiresAt: now + CACHE_TTL_MS
    };

    return res.json({
      items: items.slice(0, requested),
      source,
      fallback: source === 'fallback'
    });
  } catch (error) {
    // The Shorts endpoint must never leave the client waiting for a network/API failure.
    console.error('[shorts] unexpected error; serving fallback:', error);
    return res.status(200).json({
      items: fallbackItems().slice(0, 12),
      source: 'fallback',
      fallback: true
    });
  }
};
