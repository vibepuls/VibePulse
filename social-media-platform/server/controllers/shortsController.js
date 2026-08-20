const crypto = require('crypto');
const User = require('../models/User');
const {
  clampLimit,
  getPersonalizedPage,
  topInterestTags
} = require('../services/youtubeService');

const FALLBACK_SHORT_IDS = [
  'OS6znEJWWSQ','SH2CMN_-dsI','SVZ6wp1q8rI','PfsYnAbxFTs','QcHnK2ieMEQ','RBydcIKzDhU',
  'uigJ41xv6TY','1Zosx1gNHzM','dQw4w9WgXcQ','9bZkp7q19f0','kJQP7kiw5Fk','JGwWNGJdvx8',
  'OPf0YbXqDm0','RgKAFK5djSk','CevxZvSJLk8','YQHsXMglC9A','fRh_vgS2dFE','hT_nvWreIhg',
  '60ItHLz5WEA','3JZ_D3ELwOQ','L_jWHffIx5E','2Vv-BfVoq4g','uelHwf8o7_U','C0DPdy98e4c',
  'lp-EO5I60KA','ktvTqknDobU','pRpeEdMmmQ0','kXYiU_JCYtU','09R8_2nJtjg','e-ORhEE9VVg',
  'YykjpeuMNEk','2vjPBrBU-TM','fLexgOxsZu0','KQ6zr6kCPj8','SlPhMPnQ58k','RBumgq5yVrA',
  'tAGnKpE4NCI','hLQl3WQQoQ0','V-_O7nl0Ii0','3AtDnEC4zak','ru0K8uYEZWw','tgbNymZ7vqY',
  'fJ9rUzIMcZQ','M7lc1UVf-VE','ScMzIvxBSi4','ysz5S6PUM-U','oHg5SJYRHA0','Zi_XLOBDo_Y',
  'kffacxfA7G4','hTWKbfoikeg','2g5xk5I4qZQ','hY7m5jjJ9mM'
];

function normalizeIds(value) {
  return String(value || '').split(',').map((id) => id.trim())
    .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id));
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fallbackPool() {
  const configured = normalizeIds(process.env.VIBEPULSE_SHORT_FALLBACK_IDS);
  return configured.length ? configured : FALLBACK_SHORT_IDS;
}

function encodeFallbackState(ids) {
  return `fallback:${Buffer.from(JSON.stringify(ids), 'utf8').toString('base64url')}`;
}

function decodeFallbackState(token) {
  if (!String(token || '').startsWith('fallback:')) return null;
  try {
    const ids = JSON.parse(Buffer.from(String(token).slice(9), 'base64url').toString('utf8'));
    return Array.isArray(ids) ? ids.filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id)) : null;
  } catch {
    return null;
  }
}

function fallbackItems(ids) {
  return ids.map((videoId, index) => ({
    id: `fallback-${videoId}-${crypto.randomUUID()}`,
    videoId,
    postId: null,
    content: 'Trending short on VibePulse',
    tags: ['#shorts', '#viral', '#trending'],
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

function getFallbackPage(limit, pageToken) {
  const pool = fallbackPool();
  let remaining = decodeFallbackState(pageToken);
  if (!remaining) remaining = shuffle(pool);

  const pageIds = remaining.slice(0, limit);
  let nextIds = remaining.slice(limit);
  if (!nextIds.length) nextIds = shuffle(pool);

  return {
    items: fallbackItems(pageIds),
    nextPageToken: encodeFallbackState(nextIds),
    hasMore: true,
    source: 'fallback',
    fallback: true,
    blend: { personalized: 0.70, trending: 0.20, exploration: 0.10 }
  };
}

exports.getShorts = async (req, res) => {
  const requested = clampLimit(req.query.limit);
  const pageToken = String(req.query.pageToken || '').trim();

  if (pageToken.startsWith('fallback:')) {
    return res.json(getFallbackPage(requested, pageToken));
  }

  try {
    const interests = req.user ? await User.getInterests(req.user.id) : {};
    const result = await getPersonalizedPage({
      limit: requested,
      cursor: pageToken,
      interests
    });

    if (result?.items?.length) {
      return res.json({
        ...result,
        fallback: false,
        personalizedTags: topInterestTags(interests)
      });
    }
  } catch (error) {
    console.warn('[shorts] Personalized YouTube API unavailable; using fallback:', error.message);
  }

  return res.json(getFallbackPage(requested, ''));
};

exports.trackInteraction = async (req, res, next) => {
  try {
    const {
      videoId,
      tags = [],
      eventType,
      watchDurationMs = 0,
      watchPercent = null
    } = req.body || {};

    if (!/^[A-Za-z0-9_-]{11}$/.test(String(videoId || ''))) {
      return res.status(400).json({ error: 'Valid YouTube videoId is required.' });
    }

    const interests = await User.recordShortInteraction({
      userId: req.user.id,
      videoId,
      tags,
      eventType,
      watchDurationMs,
      watchPercent
    });

    res.json({
      ok: true,
      eventType,
      personalizedTags: topInterestTags(interests)
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyInterests = async (req, res, next) => {
  try {
    const interests = await User.getInterests(req.user.id);
    res.json({ userInterests: interests, topTags: topInterestTags(interests) });
  } catch (err) {
    next(err);
  }
};
