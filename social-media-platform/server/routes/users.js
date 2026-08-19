const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const { followLimiter } = require('../middleware/rateLimiter');

router.get('/search', userController.searchUsers);
router.get('/profile/:username', authenticate, userController.getProfile);
router.get('/profile/:username/followers', userController.getFollowers);
router.get('/profile/:username/following', userController.getFollowing);
router.patch('/profile', authenticate, userController.updateProfile);
router.post('/profile-picture', authenticate, setUploadType('profiles'), upload.single('image'), userController.uploadProfilePicture);
router.post('/cover-photo', authenticate, setUploadType('covers'), upload.single('image'), userController.uploadCoverPhoto);
router.post('/follow/:userId', authenticate, followLimiter, userController.follow);
router.post('/unfollow/:userId', authenticate, userController.unfollow);
router.post('/accept-follow/:userId', authenticate, userController.acceptFollow);
router.post('/reject-follow/:userId', authenticate, userController.rejectFollow);
router.get('/follow-requests', authenticate, userController.getFollowRequests);
router.get('/privacy', authenticate, userController.getPrivacySettings);
router.patch('/privacy', authenticate, userController.updatePrivacySettings);
router.get('/blocked', authenticate, userController.getBlockedUsers);
router.post('/block/:userId', authenticate, userController.blockUser);
router.post('/unblock/:userId', authenticate, userController.unblockUser);
router.post('/mute/:userId', authenticate, userController.muteUser);
router.post('/unmute/:userId', authenticate, userController.unmuteUser);
router.delete('/account', authenticate, userController.deleteAccount);

module.exports = router;
