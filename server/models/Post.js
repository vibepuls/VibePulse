
const { query } = require('../config/database');

const MEDIA_JSON = `json_agg(DISTINCT jsonb_build_object(
  'id', pm.id, 'url', pm.media_url, 'type', pm.media_type,
  'thumbnail', pm.thumbnail_url, 'provider', COALESCE(pm.provider, 'direct'),
  'embed_url', COALESCE(pm.embed_url, pm.media_url)
)) FILTER (WHERE pm.id IS NOT NULL) as media`;

class Post {
  static async create({ user_id, content, privacy = 'public', type = 'text', original_post_id = null, repost_comment = '' }) {
    const result = await query(
      `INSERT INTO posts (user_id, content, privacy, type, original_post_id, repost_comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, content, privacy, type, original_post_id, repost_comment]
    );
    return result.rows[0];
  }

  static async findById(id, currentUserId = null) {
    const result = await query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM reactions WHERE post_id=p.id AND user_id=$2)) as is_liked,
        (SELECT EXISTS(SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=$2)) as is_saved,
        (SELECT reaction_type FROM reactions WHERE post_id=p.id AND user_id=$2) as user_reaction,
        ${MEDIA_JSON},
        CASE WHEN p.original_post_id IS NOT NULL THEN jsonb_build_object(
          'id', op.id, 'content', op.content, 'created_at', op.created_at,
          'user_id', ou.id, 'username', ou.username, 'full_name', ou.full_name,
          'profile_picture', ou.profile_picture, 'is_verified', ou.is_verified
        ) END as original_post
       FROM posts p JOIN users u ON p.user_id=u.id
       LEFT JOIN post_media pm ON p.id=pm.post_id
       LEFT JOIN posts op ON p.original_post_id=op.id
       LEFT JOIN users ou ON op.user_id=ou.id
       WHERE p.id=$1 AND p.is_deleted=false AND u.deleted_at IS NULL
       AND (p.user_id=$2 OR p.privacy='public' OR
            (p.privacy='followers' AND EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=p.user_id AND status='accepted')))
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id=p.user_id AND blocked_id=$2)
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id=$2 AND blocked_id=p.user_id)
       GROUP BY p.id,u.id,op.id,ou.id`,
      [id, currentUserId]
    );
    return result.rows[0];
  }

  static async getFeed(userId, limit=10, offset=0) {
    return this._feedQuery(userId, limit, offset, false);
  }

  static async getForYou(userId, limit=10, offset=0) {
    return this._feedQuery(userId, limit, offset, true);
  }

  static async _feedQuery(userId, limit, offset, forYou) {
    const score = forYou ? `(p.likes_count + p.comments_count*2 + p.shares_count*3 + CASE WHEN p.created_at > NOW()-INTERVAL '24 hours' THEN 5 ELSE 0 END)` : '0';
    const extra = forYou ? `AND p.privacy='public' AND p.user_id <> $1` : '';
    const result = await query(
      `SELECT p.*, u.username,u.full_name,u.profile_picture,u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM reactions WHERE post_id=p.id AND user_id=$1)) as is_liked,
        (SELECT EXISTS(SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=$1)) as is_saved,
        (SELECT reaction_type FROM reactions WHERE post_id=p.id AND user_id=$1) as user_reaction,
        ${MEDIA_JSON}, ${score} as score
       FROM posts p JOIN users u ON p.user_id=u.id
       LEFT JOIN post_media pm ON p.id=pm.post_id
       WHERE p.is_deleted=false AND u.deleted_at IS NULL AND u.is_active=true
       ${extra}
       AND (p.user_id=$1 OR p.privacy='public' OR
            (p.privacy='followers' AND EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=p.user_id AND status='accepted')))
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id=p.user_id AND blocked_id=$1)
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=p.user_id)
       AND NOT EXISTS(SELECT 1 FROM mutes WHERE user_id=$1 AND muted_user_id=p.user_id)
       GROUP BY p.id,u.id
       ORDER BY ${forYou ? 'score DESC, ' : ''}p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getByUserId(userId, currentUserId, limit=10, offset=0) {
    const result = await query(
      `SELECT p.*,u.username,u.full_name,u.profile_picture,u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM reactions WHERE post_id=p.id AND user_id=$2)) as is_liked,
        (SELECT EXISTS(SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=$2)) as is_saved,
        ${MEDIA_JSON}
       FROM posts p JOIN users u ON p.user_id=u.id
       LEFT JOIN post_media pm ON p.id=pm.post_id
       WHERE p.user_id=$1 AND p.is_deleted=false AND u.deleted_at IS NULL
       AND (p.user_id=$2 OR p.privacy='public' OR
            (p.privacy='followers' AND EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=p.user_id AND status='accepted')))
       GROUP BY p.id,u.id ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
      [userId, currentUserId, limit, offset]
    );
    return result.rows;
  }

  static async getTrending(limit=10, offset=0) {
    const result = await query(
      `SELECT p.*,u.username,u.full_name,u.profile_picture,u.is_verified,
        (p.likes_count+p.comments_count*2+p.shares_count*3) as score,
        ${MEDIA_JSON}
       FROM posts p JOIN users u ON p.user_id=u.id
       LEFT JOIN post_media pm ON p.id=pm.post_id
       WHERE p.is_deleted=false AND p.privacy='public' AND u.deleted_at IS NULL
         AND p.created_at > NOW()-INTERVAL '7 days'
       GROUP BY p.id,u.id ORDER BY score DESC,p.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async search(searchQuery, limit=20, offset=0) {
    const result = await query(
      `SELECT p.*,u.username,u.full_name,u.profile_picture,u.is_verified,${MEDIA_JSON}
       FROM posts p JOIN users u ON p.user_id=u.id
       LEFT JOIN post_media pm ON p.id=pm.post_id
       LEFT JOIN post_hashtags ph ON p.id=ph.post_id
       LEFT JOIN hashtags h ON ph.hashtag_id=h.id
       WHERE p.is_deleted=false AND p.privacy='public' AND u.deleted_at IS NULL
         AND (p.content ILIKE $1 OR h.tag ILIKE $1)
       GROUP BY p.id,u.id ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [`%${searchQuery}%`,limit,offset]
    );
    return result.rows;
  }

  static async update(id,userId,updates) {
    const allowed=['content','privacy'];
    const fields=[],values=[]; let n=1;
    for (const [key,value] of Object.entries(updates)) if (allowed.includes(key)) {
      fields.push(`${key}=$${n++}`); values.push(value);
    }
    if (!fields.length) return null;
    values.push(id,userId);
    const result=await query(
      `UPDATE posts SET ${fields.join(',')},updated_at=CURRENT_TIMESTAMP
       WHERE id=$${n} AND user_id=$${n+1} AND is_deleted=false RETURNING *`,values
    );
    return result.rows[0];
  }

  static async delete(id,userId) {
    const result=await query(
      'UPDATE posts SET is_deleted=true,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 AND is_deleted=false RETURNING id',
      [id,userId]
    );
    return result.rows.length>0;
  }

  static async addMedia(postId,mediaUrl,mediaType,thumbnailUrl=null,provider='direct',embedUrl=null) {
    const result=await query(
      `INSERT INTO post_media (post_id,media_url,media_type,thumbnail_url,provider,embed_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [postId,mediaUrl,mediaType,thumbnailUrl,provider,embedUrl || mediaUrl]
    );
    return result.rows[0];
  }
}
module.exports=Post;
