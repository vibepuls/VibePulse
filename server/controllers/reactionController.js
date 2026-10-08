const Reaction = require('../models/Reaction');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

exports.toggleReaction = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { type = 'like' } = req.body;

    const result = await Reaction.toggle(req.user.id, postId, type);

    if (result.action === 'added') {
      const post = await Post.findById(postId);
      if (post && post.user_id !== req.user.id) {
        await Notification.create({
          recipient_id: post.user_id,
          sender_id: req.user.id,
          type: 'like',
          reference_id: postId,
          reference_type: 'post',
          message: `${req.user.username} liked your post`
        });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getReactions = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const reactions = await Reaction.getByPostId(postId);
    res.json(reactions);
  } catch (err) {
    next(err);
  }
};
