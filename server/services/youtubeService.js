const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

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
  '#shorts #travel',
  '#shorts #bangla',
  '#shorts #বাংলা',
  '#shorts #viraltiktok',
  '#shorts #tiktokvideo'
];

const TRENDING_QUERIES = ['#shorts #viral', '#shorts #trending', '#shorts #bangla', '#shorts #বাংলা'];
const EXPLORATION_QUERIES = ['#shorts #science', '#shorts #history', '#shorts #cars', '#shorts #fitness', '#shorts #art', '#shorts #animals', '#shorts #movie', '#shorts #dance', '#shorts #education'];

const PAGE_CACHE_TTL_MS = 20 * 1000;
const pageCache = new Map();

function clampLimit(value) {
  return Math.min(Math.max(Number.parseInt(value, 10) || 50, 10), 50);
}

function cleanTags(tags = []) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag).toLowerCase().trim())
    .filter((tag) => /^#[^\s#]{1,80}$/.test(tag)))].slice(0, 30);
}

function extractHashtags(text = '') {
  const matches = String(text || '').match(/#[\p{L}\p{N}_-]+/gu) || [];
  return cleanTags(matches);
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalizeQueryIndex(value, length = VIRAL_SHORT_QUERIES.length) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n % length : 0;
}

function toApiItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const videoId = item?.id?.videoId;
      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
      const title = item?.snippet?.title || 'Trending Short on VibePulse';
      const description = item?.snippet?.description || '';
      return {
        id: `youtube-${videoId}`,
        videoId,
        postId: null,
        content: title,
        tags: extractHashtags(`${title} ${description}`),
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

function cacheKey({ query, pageToken, limit }) {
  return `${query}:${pageToken || 'first'}:${limit}`;
}


function parseIsoDuration(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 30;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}

async function enrichDurations(items, key) {
  if (!items.length || !key) return items;
  const ids = items.map((item) => item.videoId).filter(Boolean).join(',');
  try {
    const response = await fetch(`${YOUTUBE_VIDEOS_URL}?${new URLSearchParams({
      part: 'contentDetails',
      id: ids,
      key
    }).toString()}`);
    if (!response.ok) return items;
    const data = await response.json();
    const durations = new Map((data.items || []).map((item) => [
      item.id,
      parseIsoDuration(item.contentDetails?.duration)
    ]));
    return items.map((item) => ({
      ...item,
      durationSec: durations.get(item.videoId) || 30
    }));
  } catch {
    return items;
  }
}

async function searchYouTube({ limit = 50, pageToken = '', query }) {
  const key = String(process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) return null;

  const normalizedLimit = clampLimit(limit);
  const q = String(query || '#shorts #viral').trim();
  const cacheKeyValue = cacheKey({ query: q, pageToken, limit: normalizedLimit });
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
  const baseItems = toApiItems(data.items);
  const enrichedItems = await enrichDurations(baseItems, key);
  const queryTags = cleanTags(q.match(/#[^\s#]+/g) || []);
  const taggedItems = enrichedItems.map((item) => ({
    ...item,
    tags: cleanTags([...(item.tags || []), ...queryTags])
  }));
  const result = {
    items: taggedItems,
    nextPageToken: data.nextPageToken || null,
    query: q,
    totalResults: Number(data.pageInfo?.totalResults || 0)
  };

  pageCache.set(cacheKeyValue, { expiresAt: Date.now() + PAGE_CACHE_TTL_MS, data: result });
  return result;
}

function topInterestTags(interests = {}) {
  return Object.entries(interests || {})
    .map(([tag, score]) => [String(tag).toLowerCase(), Number(score)])
    .filter(([tag, score]) => /^#[^\s#]{1,80}$/.test(tag) && Number.isFinite(score) && score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);
}

function makePersonalQueries(interests = {}) {
  const tags = topInterestTags(interests);
  const defaults = ['#bangla', '#বাংলা', '#funny', '#tech'];
  const selected = tags.length ? tags : defaults;
  return shuffle(selected.slice(0, 6)).map((tag) => `#shorts ${tag}`);
}

function encodeCursor(state) {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

function decodeCursor(token) {
  try {
    const parsed = JSON.parse(Buffer.from(String(token), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') throw new Error('bad cursor');
    return parsed;
  } catch {
    return null;
  }
}

function uniqueByVideoId(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.videoId || seen.has(item.videoId)) return false;
    seen.add(item.videoId);
    return true;
  });
}

async function fetchLane({ queries, tokens, lane, count, used }) {
  const items = [];
  let queryIndex = Number(tokens?.[`${lane}QueryIndex`] || 0);
  let pageToken = tokens?.[`${lane}PageToken`] || '';

  for (let attempts = 0; attempts < Math.min(queries.length, 4) && items.length < count; attempts += 1) {
    const query = queries[queryIndex % queries.length];
    const result = await searchYouTube({ limit: Math.max(10, count), pageToken, query });
    if (!result) return { items: [], pageToken, queryIndex };

    for (const item of result.items) {
      if (!used.has(item.videoId)) {
        used.add(item.videoId);
        items.push(item);
      }
      if (items.length >= count) break;
    }

    if (result.nextPageToken) {
      pageToken = result.nextPageToken;
      break;
    }

    pageToken = '';
    queryIndex = (queryIndex + 1) % queries.length;
  }

  return { items, pageToken, queryIndex };
}

async function getPersonalizedPage({ limit = 50, cursor, interests = {} }) {
  const personalizedCount = Math.round(limit * 0.70);
  const trendingCount = Math.round(limit * 0.20);
  const explorationCount = limit - personalizedCount - trendingCount;

  const state = decodeCursor(cursor) || {
    personalPageToken: '',
    personalQueryIndex: 0,
    trendingPageToken: '',
    trendingQueryIndex: 0,
    explorePageToken: '',
    exploreQueryIndex: 0
  };

  const personalQueries = makePersonalQueries(interests);
  const used = new Set();

  const [personal, trending, explore] = await Promise.all([
    fetchLane({
      queries: personalQueries,
      tokens: {
        personalPageToken: state.personalPageToken,
        personalQueryIndex: state.personalQueryIndex
      },
      lane: 'personal',
      count: personalizedCount,
      used
    }),
    fetchLane({
      queries: TRENDING_QUERIES,
      tokens: {
        trendingPageToken: state.trendingPageToken,
        trendingQueryIndex: state.trendingQueryIndex
      },
      lane: 'trending',
      count: trendingCount,
      used
    }),
    fetchLane({
      queries: EXPLORATION_QUERIES,
      tokens: {
        explorePageToken: state.explorePageToken,
        exploreQueryIndex: state.exploreQueryIndex
      },
      lane: 'explore',
      count: explorationCount,
      used
    })
  ]);

  const items = shuffle([
    ...personal.items,
    ...trending.items,
    ...explore.items
  ]);

  const nextState = {
    personalPageToken: personal.pageToken || '',
    personalQueryIndex: personal.queryIndex || 0,
    trendingPageToken: trending.pageToken || '',
    trendingQueryIndex: trending.queryIndex || 0,
    explorePageToken: explore.pageToken || '',
    exploreQueryIndex: explore.queryIndex || 0
  };

  return {
    items,
    nextPageToken: encodeCursor(nextState),
    hasMore: true,
    source: 'youtube-api',
    blend: { personalized: 0.70, trending: 0.20, exploration: 0.10 },
    interests: topInterestTags(interests)
  };
}

module.exports = {
  VIRAL_SHORT_QUERIES,
  TRENDING_QUERIES,
  EXPLORATION_QUERIES,
  clampLimit,
  searchYouTube,
  getPersonalizedPage,
  topInterestTags
};
