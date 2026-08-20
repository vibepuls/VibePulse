const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

const VIRAL_SHORT_QUERIES = [
  '#shorts #viral',
  '#shorts #trending',
  '#shorts #funny',
  '#shorts #tech',
  '#shorts #entertainment',
  '#shorts #reels',
  '#shorts #comedy',
  '#shorts #gaming',
  '#shorts #music',
  '#shorts #sports',
  '#shorts #facts',
  '#shorts #news',
  '#shorts #memes',
  '#shorts #food',
  '#shorts #travel'
];

const PAGE_CACHE_TTL_MS = 20 * 1000;
const pageCache = new Map();
const recentVideoIds = new Set();
const MAX_RECENT_IDS = 5000;

function clampLimit(value) {
  return Math.min(Math.max(Number.parseInt(value, 10) || 50, 10), 50);
}

function normalizeQueryIndex(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0
    ? n % VIRAL_SHORT_QUERIES.length
    : 0;
}

function rememberVideoIds(items) {
  for (const item of items) {
    if (!item.videoId) continue;
    recentVideoIds.add(item.videoId);
  }

  while (recentVideoIds.size > MAX_RECENT_IDS) {
    const first = recentVideoIds.values().next().value;
    if (!first) break;
    recentVideoIds.delete(first);
  }
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
        content: item?.snippet?.title || 'Trending Short on VibePulse',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        creator: item?.snippet?.channelTitle || 'VibePulse Trends',
        avatar: null,
        source: 'youtube-api',
        position: index,
        publishedAt: item?.snippet?.publishedAt || null
      };
    })
    .filter(Boolean);
}

function cacheKey({ queryIndex, pageToken, limit }) {
  return `${queryIndex}:${pageToken || 'first'}:${limit}`;
}

async function searchYouTube({ limit = 50, pageToken = '', queryIndex = 0 }) {
  const key = String(process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) return null;

  const normalizedLimit = clampLimit(limit);
  const normalizedQueryIndex = normalizeQueryIndex(queryIndex);
  const q = VIRAL_SHORT_QUERIES[normalizedQueryIndex];
  const cacheKeyValue = cacheKey({
    queryIndex: normalizedQueryIndex,
    pageToken,
    limit: normalizedLimit
  });

  const cached = pageCache.get(cacheKeyValue);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q,
    videoDuration: 'short',
    order: 'relevance',
    maxResults: String(normalizedLimit),
    key
  });

  if (pageToken) params.set('pageToken', pageToken);

  const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();

  // Keep the feed fresh across topic rotations without changing YouTube's
  // page-token contract (a token must be reused with the same query).
  const freshItems = toApiItems(data.items).filter((item) => {
    if (recentVideoIds.has(item.videoId)) return false;
    return true;
  });

  rememberVideoIds(freshItems);

  const result = {
    items: freshItems,
    nextPageToken: data.nextPageToken || null,
    query: q,
    queryIndex: normalizedQueryIndex,
    nextQueryIndex: data.nextPageToken
      ? normalizedQueryIndex
      : (normalizedQueryIndex + 1) % VIRAL_SHORT_QUERIES.length,
    totalResults: Number(data.pageInfo?.totalResults || 0)
  };

  pageCache.set(cacheKeyValue, {
    expiresAt: Date.now() + PAGE_CACHE_TTL_MS,
    data: result
  });

  return result;
}

module.exports = {
  VIRAL_SHORT_QUERIES,
  clampLimit,
  searchYouTube
};
