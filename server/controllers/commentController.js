const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PrivacySettings = require('../models/PrivacySettings');
const Follow = require('../models/Follow');
const Block = require('../models/Block');

exports.getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    const comments = await Comment.findByPostId(postId, currentUserId, parseInt(limit), parseInt(offset));
    res.json(comments);
  } catch (err) {
    next(err);
  }
};

exports.createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parent_id } = req.body;

    if (typeof content !== 'string' || content.length > 2000) return res.status(400).json({ error: 'Comment must be a string up to 2000 characters.' });
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (await Block.exists(req.user.id, post.user_id) || await Block.exists(post.user_id, req.user.id)) return res.status(403).json({ error: 'You cannot comment on this post.' });
    const privacy = await PrivacySettings.getByUserId(post.user_id);
    const following = await Follow.find(req.user.id, post.user_id);
    if (privacy.who_can_comment === 'nobody' || (privacy.who_can_comment === 'followers' && following?.status !== 'accepted')) return res.status(403).json({ error: 'Comments are restricted on this post.' });

    const comment = await Comment.create({
      post_id: postId,
      user_id: req.user.id,
      parent_id,
      content
    });

    // Notify post owner
    if (post.user_id !== req.user.id) {
      await Notification.create({
        recipient_id: post.user_id,
        sender_id: req.user.id,
        type: 'comment',
        reference_id: postId,
        reference_type: 'post',
        message: `${req.user.username} commented on your post`
      });
    }

    // Notify parent comment owner if reply
    if (parent_id) {
      const parentComment = await require('../config/database').query('SELECT user_id FROM comments WHERE id = $1', [parent_id]);
      if (parentComment.rows.length > 0 && parentComment.rows[0].user_id !== req.user.id) {
        await Notification.create({
          recipient_id: parentComment.rows[0].user_id,
          sender_id: req.user.id,
          type: 'reply',
          reference_id: postId,
          reference_type: 'post',
          message: `${req.user.username} replied to your comment`
        });
      }
    }

    // Handle mentions
    const mentions = content.match(/@\w+/g) || [];
    for (const mention of mentions) {
      const username = mention.slice(1);
      const mentionedUser = await User.findByUsername(username);
      if (mentionedUser && mentionedUser.id !== req.user.id) {
        await Notification.create({
          recipient_id: mentionedUser.id,
          sender_id: req.user.id,
          type: 'mention',
          reference_id: postId,
          reference_type: 'post',
          message: `${req.user.username} mentioned you in a comment`
        });
      }
    }

    const fullComment = await Comment.findById(comment.id, req.user.id);
    res.status(201).json(fullComment);
  } catch (err) {
    next(err);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.update(id, req.user.id, content);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized.' });
    }
    res.json(comment);
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Comment.delete(id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Comment not found or unauthorized.' });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.getReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    const replies = await Comment.findReplies(commentId, currentUserId, parseInt(limit), parseInt(offset));
    res.json(replies);
  } catch (err) {
    next(err);
  }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const liked = await Comment.toggleLike(commentId, req.user.id);
    res.json({ liked });
  } catch (err) {
    next(err);
  }
};
