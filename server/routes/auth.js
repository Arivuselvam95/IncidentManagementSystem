import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from '../config/passport.js';
import User from '../models/User.js';
import RegistrationRequest from '../models/RegistrationRequest.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
  }
);

// Register (for reporters only - direct registration)
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, department, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if there's a pending registration request
    const existingRequest = await RegistrationRequest.findOne({ email });
    if (existingRequest) {
      return res.status(400).json({ message: 'Registration request already exists for this email' });
    }

    // Only allow direct registration for reporters
    if (role !== 'reporter') {
      return res.status(400).json({ message: 'IT team registrations require approval. Please use the registration request process.' });
    }

    // Create new user (reporter)
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      department,
      role: 'reporter'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Submit registration request (for IT team members)
router.post('/registration-request', async (req, res) => {
  try {
    const { firstName, lastName, email, password, department, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if there's already a pending request
    const existingRequest = await RegistrationRequest.findOne({ 
      email, 
      status: 'pending' 
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'Registration request already pending for this email' });
    }

    // Only allow IT roles for registration requests
    if (!['it-support', 'team-lead', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for registration request' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create registration request
    const registrationRequest = new RegistrationRequest({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      department,
      role
    });

    await registrationRequest.save();

    res.status(201).json({
      message: 'Registration request submitted successfully',
      requestId: registrationRequest._id
    });
  } catch (error) {
    console.error('Registration request error:', error);
    res.status(500).json({ message: 'Error submitting registration request', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// Validate token
router.get('/validate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json({
      message: 'Token is valid',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Error validating token' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, department, phone, jobTitle, bio } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update user fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.department = department || user.department;
    user.phone = phone || user.phone;
    user.jobTitle = jobTitle || user.jobTitle;
    user.bio = bio || user.bio;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has Google ID (Google users can't change password this way)
    if (user.googleId) {
      return res.status(400).json({ message: 'Google users cannot change password. Please use Google account settings.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Update notification settings
router.put('/notification-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.notificationSettings = {
      ...user.notificationSettings,
      ...req.body
    };

    await user.save();

    res.json({
      message: 'Notification settings updated successfully',
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('Notification settings update error:', error);
    res.status(500).json({ message: 'Error updating notification settings' });
  }
});

export default router;