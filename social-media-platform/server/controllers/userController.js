const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const PrivacySettings = require('../models/PrivacySettings');
const path = require('path');
const fs = require('fs');

exports.getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (req.user && req.user.id !== user.id) {
      const isBlocked = await Block.exists(req.user.id, user.id) || await Block.exists(user.id, req.user.id);
      if (isBlocked) {
        return res.status(404).json({ error: 'User not found.' });
      }
    }

    if (req.user) {
      const followStatus = await Follow.find(req.user.id, user.id);
      user.is_following = followStatus?.status === 'accepted';
      user.follow_status = followStatus?.status || null;
      user.is_followed_by = !!(await Follow.find(user.id, req.user.id));
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = {};
    const { full_name, bio, website, location, is_private } = req.body;

    if (full_name) allowedUpdates.full_name = full_name;
    if (bio !== undefined) allowedUpdates.bio = bio;
    if (website !== undefined) allowedUpdates.website = website;
    if (location !== undefined) allowedUpdates.location = location;
    if (is_private !== undefined) allowedUpdates.is_private = is_private;

    const user = await User.update(req.user.id, allowedUpdates);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/profiles/${req.file.filename}`;
    const user = await User.update(req.user.id, { profile_picture: fileUrl });
    res.json({ profile_picture: fileUrl });
  } catch (err) {
    next(err);
  }
};

exports.uploadCoverPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/covers/${req.file.filename}`;
    const user = await User.update(req.user.id, { cover_photo: fileUrl });
    res.json({ cover_photo: fileUrl });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findByEmail(req.user.email);

    const isValid = await User.comparePassword(user, password);
    if (!isValid) {
      return res.status(400).json({ error: 'Password is incorrect.' });
    }

    await User.delete(req.user.id);
    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.follow = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existing = await Follow.find(req.user.id, userId);
    if (existing) {
      return res.status(400).json({ error: 'Already following this user.' });
    }

    const follow = await Follow.create(req.user.id, userId);

    // Create notification
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient_id: userId,
      sender_id: req.user.id,
      type: follow.status === 'pending' ? 'follow_request' : 'follow',
      message: follow.status === 'pending' ? `${req.user.username} requested to follow you` : `${req.user.username} started following you`
    });

    res.json({ status: follow.status, message: follow.status === 'pending' ? 'Follow request sent.' : 'Now following user.' });
  } catch (err) {
    next(err);
  }
};

exports.unfollow = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await Follow.delete(req.user.id, userId);
    res.json({ message: 'Unfollowed successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.acceptFollow = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await Follow.updateStatus(userId, req.user.id, 'accepted');
    res.json({ message: 'Follow request accepted.' });
  } catch (err) {
    next(err);
  }
};

exports.rejectFollow = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await Follow.delete(userId, req.user.id);
    res.json({ message: 'Follow request rejected.' });
  } catch (err) {
    next(err);
  }
};

exports.getFollowers = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const followers = await User.getFollowers(user.id);
    res.json(followers);
  } catch (err) {
    next(err);
  }
};

exports.getFollowing = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const following = await User.getFollowing(user.id);
    res.json(following);
  } catch (err) {
    next(err);
  }
};

exports.getFollowRequests = async (req, res, next) => {
  try {
    const requests = await Follow.getFollowRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

exports.getPrivacySettings = async (req, res, next) => {
  try {
    const settings = await PrivacySettings.getByUserId(req.user.id);
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

exports.updatePrivacySettings = async (req, res, next) => {
  try {
    const settings = await PrivacySettings.update(req.user.id, req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const users = await User.search(q);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getBlockedUsers = async (req, res, next) => {
  try {
    const blocked = await Block.getBlockedUsers(req.user.id);
    res.json(blocked);
  } catch (err) {
    next(err);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself.' });
    }
    await Block.create(req.user.id, userId);
    res.json({ message: 'User blocked.' });
  } catch (err) {
    next(err);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await Block.delete(req.user.id, userId);
    res.json({ message: 'User unblocked.' });
  } catch (err) {
    next(err);
  }
};
