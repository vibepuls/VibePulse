const Post = require('../models/Post');
const User = require('../models/User');
const Hashtag = require('../models/Hashtag');
const Notification = require('../models/Notification');
const path = require('path');

exports.createPost = async (req, res, next) => {
  try {
    const { content, privacy = 'public', type = 'text', original_post_id, repost_comment } = req.body;

    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'Post must have content or media.' });
    }

    if (!['public', 'followers', 'private'].includes(privacy)) return res.status(400).json({ error: 'Invalid privacy setting.' });
    const post = await Post.create({
      user_id: req.user.id,
      content: content || '',
      privacy,
      type,
      original_post_id,
      repost_comment
    });

    // Handle media uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const fileUrl = `/uploads/posts/${file.filename}`;
        await Post.addMedia(post.id, fileUrl, mediaType);
      }
      await require('../config/database').query(
        "UPDATE posts SET type = $1 WHERE id = $2",
        [req.files[0].mimetype.startsWith('video/') ? 'video' : 'image', post.id]
      );
    }

    // Extract and create hashtags
    const hashtags = content?.match(/#\w+/g) || [];
    for (const tag of hashtags) {
      const hashtag = await Hashtag.findOrCreate(tag.slice(1));
      await Hashtag.linkToPost(post.id, hashtag.id);
    }

    // Handle mentions
    const mentions = content?.match(/@\w+/g) || [];
    for (const mention of mentions) {
      const username = mention.slice(1);
      const mentionedUser = await User.findByUsername(username);
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

    const fullPost = await Post.findById(post.id, req.user.id);
    res.status(201).json(fullPost);
  } catch (err) {
    next(err);
  }
};

exports.getFeed = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const posts = await Post.getFeed(req.user.id, parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentUserId = req.user ? req.user.id : null;
    const posts = await Post.getByUserId(user.id, currentUserId, parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;
    const post = await Post.findById(id, currentUserId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, privacy } = req.body;

    const post = await Post.update(id, req.user.id, { content, privacy });
    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized.' });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Post.delete(id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found or unauthorized.' });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.getTrending = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const posts = await Post.getTrending(parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

exports.sharePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content = '' } = req.body;

    const originalPost = await Post.findById(id, req.user.id);
    if (!originalPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const post = await Post.create({
      user_id: req.user.id,
      content,
      type: 'repost',
      original_post_id: id,
      repost_comment: content
    });

    await require('../config/database').query('UPDATE posts SET shares_count = shares_count + 1 WHERE id = $1', [id]);

    await Notification.create({
      recipient_id: originalPost.user_id,
      sender_id: req.user.id,
      type: 'share',
      reference_id: post.id,
      reference_type: 'post',
      message: `${req.user.username} shared your post`
    });

    const fullPost = await Post.findById(post.id, req.user.id);
    res.status(201).json(fullPost);
  } catch (err) {
    next(err);
  }
};
