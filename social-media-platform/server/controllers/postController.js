
const Post = require('../models/Post');
const User = require('../models/User');
const Hashtag = require('../models/Hashtag');
const Notification = require('../models/Notification');
const { parseMediaUrl } = require('../utils/embedParser');

exports.createPost = async (req, res, next) => {
  try {
    const { content = '', privacy = 'public', type = 'text', media_url, original_post_id, repost_comment } = req.body;

    if (typeof content !== 'string' || content.length > 5000) {
      return res.status(400).json({ error: 'Post content must be a string up to 5000 characters.' });
    }
    if (!content.trim() && !media_url) {
      return res.status(400).json({ error: 'Write something or add an image/video URL.' });
    }
    if (!['public', 'followers', 'private'].includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting.' });
    }
    if (!['text', 'image', 'video', 'link', 'repost'].includes(type)) {
      return res.status(400).json({ error: 'Invalid post type.' });
    }

    let parsedMedia = null;
    if (media_url) {
      try {
        parsedMedia = parseMediaUrl(media_url);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!parsedMedia) {
        return res.status(400).json({
          error: 'Unsupported media URL. Use YouTube, Facebook, Instagram, or a direct image/video URL.'
        });
      }
    }

    const postType = parsedMedia ? parsedMedia.type : type;
    const post = await Post.create({
      user_id: req.user.id,
      content: content.trim(),
      privacy,
      type: postType,
      original_post_id,
      repost_comment
    });

    if (parsedMedia) {
      await Post.addMedia(post.id, parsedMedia.original_url, parsedMedia.type, null, parsedMedia.provider, parsedMedia.embed_url);
    }

    const hashtags = content.match(/#\w+/g) || [];
    for (const tag of hashtags) {
      const hashtag = await Hashtag.findOrCreate(tag.slice(1));
      await Hashtag.linkToPost(post.id, hashtag.id);
    }

    const mentions = content.match(/@\w+/g) || [];
    for (const mention of mentions) {
      const mentionedUser = await User.findByUsername(mention.slice(1));
      if (mentionedUser) {
        await Notification.create({
          recipient_id: mentionedUser.id,
          sender_id: req.user.id,
          type: 'mention',
          reference_id: post.id,
          reference_type: 'post',
          message: `${req.user.username} mentioned you in a post`
        });
      }
    }

    res.status(201).json(await Post.findById(post.id, req.user.id));
  } catch (err) {
    next(err);
  }
};

exports.getFeed = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, mode = 'following' } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 30);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);
    const posts = mode === 'for-you'
      ? await Post.getForYou(req.user.id, safeLimit, safeOffset)
      : await Post.getFeed(req.user.id, safeLimit, safeOffset);
    res.json(posts);
  } catch (err) { next(err); }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const currentUserId = req.user ? req.user.id : null;
    res.json(await Post.getByUserId(user.id, currentUserId, parseInt(limit), parseInt(offset)));
  } catch (err) { next(err); }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id, req.user ? req.user.id : null);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(post);
  } catch (err) { next(err); }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { content, privacy } = req.body;
    if (content !== undefined && (typeof content !== 'string' || content.length > 5000)) {
      return res.status(400).json({ error: 'Post content must be a string up to 5000 characters.' });
    }
    if (privacy !== undefined && !['public', 'followers', 'private'].includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting.' });
    }
    const post = await Post.update(req.params.id, req.user.id, { content, privacy });
    if (!post) return res.status(404).json({ error: 'Post not found or unauthorized.' });
    res.json(post);
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const deleted = await Post.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found or unauthorized.' });
    res.json({ message: 'Post deleted.' });
  } catch (err) { next(err); }
};

exports.getTrending = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    res.json(await Post.getTrending(parseInt(limit), parseInt(offset)));
  } catch (err) { next(err); }
};

exports.sharePost = async (req, res, next) => {
  try {
    const { content = '' } = req.body;
    const originalPost = await Post.findById(req.params.id, req.user.id);
    if (!originalPost) return res.status(404).json({ error: 'Post not found.' });

    const post = await Post.create({
      user_id: req.user.id, content, type: 'repost',
      original_post_id: req.params.id, repost_comment: content
    });

    await require('../config/database').query(
      'UPDATE posts SET shares_count = shares_count + 1 WHERE id = $1', [req.params.id]
    );
    await Notification.create({
      recipient_id: originalPost.user_id, sender_id: req.user.id, type: 'share',
      reference_id: post.id, reference_type: 'post',
      message: `${req.user.username} shared your post`
    });
    res.status(201).json(await Post.findById(post.id, req.user.id));
  } catch (err) { next(err); }
};
