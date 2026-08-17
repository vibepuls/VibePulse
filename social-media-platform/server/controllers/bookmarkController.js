const Bookmark = require('../models/Bookmark');
const Post = require('../models/Post');

exports.getBookmarks = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const bookmarks = await Bookmark.getByUser(req.user.id, parseInt(limit), parseInt(offset));
    res.json(bookmarks);
  } catch (err) {
    next(err);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId, req.user.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const existing = await Bookmark.find(req.user.id, postId);

    if (existing) {
      await Bookmark.delete(req.user.id, postId);
      res.json({ saved: false });
    } else {
      await Bookmark.create(req.user.id, postId);
      res.json({ saved: true });
    }
  } catch (err) {
    next(err);
  }
};
