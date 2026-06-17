const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'Student'
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    // allow email to contain registerNumber
    const { email, password } = req.body;
    const identifier = email;

    // Check if user exists (by email or registerNumber)
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { registerNumber: identifier }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        department: user.department || 'General'
      }
    };

    // Sign token synchronously to avoid unhandled async rejection crashes
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    // Use updateOne to minimize database write latency and avoid full document validation/hooks overhead
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        semester: user.semester,
        section: user.section,
        isFirstLogin: user.isFirstLogin,
        permissions: user.permissions || [],
        classAdvisorDetails: user.classAdvisorDetails || { isClassAdvisor: false }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid old password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false; // Mark that user has changed password
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ 
      $or: [ { email }, { registerNumber: email } ]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const Request = require('../models/Request');
    const Notification = require('../models/Notification');

    // Check if a pending password reset request already exists for this user
    const existingRequest = await Request.findOne({
      requestedBy: user._id,
      targetModel: 'PasswordReset',
      status: 'Pending'
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'A password reset request is already pending with the Admin.' });
    }

    // Create password reset request
    const newRequest = await Request.create({
      requestedBy: user._id,
      targetModel: 'PasswordReset',
      targetRecord: user._id,
      reason: 'User clicked forgot password. Requested reset to Date of Birth.',
      oldValue: 'Active',
      newValue: { resetToDob: true }
    });

    // Notify all Admin users
    const admins = await User.find({ role: 'Admin' }).select('_id');
    const notifications = admins.map(admin => ({
      user: admin._id,
      message: `Password reset request submitted by ${user.name} (${user.email || user.registerNumber})`,
      type: 'Warning',
      link: '/admin'
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ 
      message: 'Your password reset request has been submitted to the Admin. Once approved, your password will be reset to your Date of Birth.', 
      email: user.email 
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    user.isFirstLogin = false; // also unset first login if reset
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    if (req.user.role === 'Parent') {
      const student = await User.findById(req.user.studentId || req.user.id).select('-password').lean();
      if (!student) return res.status(404).json({ message: 'Linked student not found' });
      return res.json({
        id: req.user.id,
        role: 'Parent',
        studentId: student._id,
        linkedStudent: {
          name: student.name,
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          department: student.department,
          year: student.year,
          semester: student.semester,
          section: student.section
        }
      });
    }
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('getUserProfile error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Parent login using student register number and date of birth (DDMMYYYY)
exports.parentLogin = async (req, res) => {
  try {
    const { registerNumber, dob } = req.body;
    if (!registerNumber || !dob) {
      return res.status(400).json({ message: 'Register number and date of birth are required' });
    }

    const student = await User.findOne({ registerNumber, role: 'Student', isActive: true });
    if (!student || !student.dob) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const d = new Date(student.dob);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Student date of birth is not configured' });
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dobString = `${dd}${mm}${yyyy}`;

    if (dob !== dobString) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: student._id,
        role: 'Parent',
        studentId: student._id,
        department: student.department || 'General'
      }
    };

    // Sign token synchronously to avoid unhandled async rejection crashes
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: student._id,
        name: student.parentDetails?.name || `Parent of ${student.name}`,
        role: 'Parent',
        studentId: student._id,
        linkedStudent: {
          name: student.name,
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          department: student.department,
          year: student.year,
          semester: student.semester,
          section: student.section
        },
        isFirstLogin: false
      }
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
