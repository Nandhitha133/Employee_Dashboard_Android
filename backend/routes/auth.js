const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const otpGenerator = require('otp-generator');
const { sendZohoMail } = require('../zohoMail.service');
const { sendResendMail } = require('../resend.service');

const router = express.Router();

 

// Login
router.post('/login', async (req, res) => {
  const { email, employeeId, password } = req.body;
  try {
    let lookupEmail = email;
    if (!lookupEmail && employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('email name');
      if (!emp || !emp.email) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      lookupEmail = emp.email;
    }

    if (!lookupEmail || !password) {
      return res.status(400).json({ message: 'Email or Employee ID and password are required' });
    }

    const user = await User.findOne({ email: lookupEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  const { email, employeeId } = req.body;
  try {
    let user = null;
    let targetEmail = email;

    // Resolve by employeeId -> Employee -> email -> User
    if (!targetEmail && employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('email name employeeId');
      if (!emp || !emp.email) {
        return res.status(404).json({ message: 'User not found' });
      }
      targetEmail = emp.email;
    }

    // Find user by resolved email, fall back to employeeId
    if (targetEmail) {
      user = await User.findOne({ email: targetEmail });
      if (!user && employeeId) {
        user = await User.findOne({ employeeId });
      }
    } else if (employeeId) {
      user = await User.findOne({ employeeId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false
    });
    
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();
    try {
      if (process.env.RESEND_API_KEY) {
        await sendResendMail({
          to: targetEmail || user.email,
          subject: 'Password Reset OTP',
          content: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
        });
      } else {
        await sendZohoMail({
          to: targetEmail || user.email,
          subject: 'Password Reset OTP',
          content: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
        });
      }
    } catch (e) {
      console.error("Resend/Primary mail failed, trying Zoho fallback:", e.message);
      await sendZohoMail({
        to: targetEmail || user.email,
        subject: 'Password Reset OTP',
        content: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
      });
    }
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password with OTP
router.post('/reset-password', async (req, res) => {
  const { email, employeeId, otp, newPassword } = req.body;
  try {
    let user = null;
    let targetEmail = email;

    // Resolve email via employeeId if provided
    if (!targetEmail && employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('email');
      targetEmail = emp?.email || null;
    }

    // Find user by email and OTP window, fallback to employeeId
    if (targetEmail) {
      user = await User.findOne({
        email: targetEmail,
        resetOtp: otp,
        resetOtpExpiry: { $gt: Date.now() }
      });
    }
    if (!user && employeeId) {
      user = await User.findOne({
        employeeId,
        resetOtp: otp,
        resetOtpExpiry: { $gt: Date.now() }
      });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify Token
router.get('/verify', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
      lastLogin: req.user.lastLogin
    }
  });
});

// Get all users (for employees Access management)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({}, { password: 0, resetOtp: 0, resetOtpExpiry: 0 })
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create new user (for employees Access management)
router.post('/users', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, password, role, permissions, employeeId } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      password,
      role,
      employeeId,
      permissions: Array.isArray(permissions) ? permissions : []
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetOtp;
    delete userResponse.resetOtpExpiry;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update user (for employees Access management)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, role, permissions, employeeId } = req.body;
    
    // Find user first to properly handle password and permissions
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (employeeId) user.employeeId = employeeId;
    
    // Properly handle permissions array
    if (permissions) {
      // Ensure permissions is treated as an array
      user.permissions = Array.isArray(permissions) ? permissions : [];
    }
    
    // If password is provided, it will be hashed by the pre-save hook
    if (req.body.password) {
      user.password = req.body.password;
    }
    
    // Save the user to trigger the password hashing middleware
    await user.save();

    // Return user without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetOtp;
    delete userResponse.resetOtpExpiry;

    return res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error && error.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error && error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') || 'Validation error' });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (for employees Access management)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
