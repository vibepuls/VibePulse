const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password, full_name } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters, alphanumeric and underscores only.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const user = await User.create({ email, username, password, full_name });
    const tokens = generateTokens(user.id);

    await Session.create({
      user_id: user.id,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, role: user.role },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await User.comparePassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account deactivated.' });
    }
    if (user.is_suspended) {
      return res.status(401).json({ error: 'Account suspended.' });
    }

    const tokens = generateTokens(user.id);

    await Session.create({
      user_id: user.id,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await require('../config/database').query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        full_name: user.full_name, 
        role: user.role,
        profile_picture: user.profile_picture 
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await Session.delete(token);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await Session.deleteByUser(req.user.id);
    res.json({ message: 'Logged out from all devices.' });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const session = await Session.getByRefreshToken(refreshToken);

    if (!session || String(session.user_id) !== String(decoded.userId)) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active || user.is_suspended) {
      await require('../config/database').query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
      return res.status(401).json({ error: 'Account is not available.' });
    }

    const tokens = generateTokens(decoded.userId);
    await require('../config/database').query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    await Session.create({
      user_id: decoded.userId,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByEmail(req.user.email);

    const isValid = await User.comparePassword(user, currentPassword);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    await User.updatePassword(req.user.id, newPassword);
    await Session.deleteByUser(req.user.id);

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.json({ message: 'If an account exists, a reset email has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await require('../config/database').query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Send email (configure SMTP in production)
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });

      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Password Reset',
        html: `<p>Click <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">here</a> to reset your password.</p>`
      });
    }

    const response = { message: 'If an account exists, a reset email has been sent.' };
    if (process.env.NODE_ENV !== 'production') {
      response.resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    }
    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'A valid token and password of at least 8 characters are required.' });
    }

    const result = await require('../config/database').query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    await User.updatePassword(result.rows[0].id, newPassword);
    await require('../config/database').query(
      'UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE id = $1',
      [result.rows[0].id]
    );
    await Session.deleteByUser(result.rows[0].id);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.getByUser(req.user.id);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
};
