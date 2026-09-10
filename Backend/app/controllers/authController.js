const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { redisClient } = require("../config/redis");
const sendEmail = require("../utils/sendEmail");

class authController {
  constructor() {
    this.register = this.register.bind(this);
    this.verifyOTP = this.verifyOTP.bind(this);
    this.resendOTP = this.resendOTP.bind(this);
    this.login = this.login.bind(this);
    this.getProfile = this.getProfile.bind(this);
  }

  // Generate 6 Digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // =========================
  // REGISTER USER
  // =========================

  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email and password are required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check existing user
      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists. Please login or resend OTP.",
        });
      }

      // Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User
      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
      });

      // Generate OTP
      const otp = this.generateOTP();

      // Redis Key
      const redisKey = `otp:${normalizedEmail}`;

      // Store OTP in Redis for 5 Minutes
      await redisClient.set(redisKey, otp, {
        EX: 300,
      });

      // Send OTP Email
      await sendEmail(normalizedEmail, otp);

      return res.status(201).json({
        success: true,
        message: "Registration successful. OTP sent to your email.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error("Register Error:", error);

      return res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error.message,
      });
    }
  }

  // =========================
  // VERIFY OTP
  // =========================

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find OTP from Redis
      const redisKey = `otp:${normalizedEmail}`;

      const storedOTP = await redisClient.get(redisKey);

      // Check OTP Exists
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: "OTP expired or not found",
        });
      }

      // Check OTP Match
      if (storedOTP !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Update User Verification Status
      const user = await User.findOneAndUpdate(
        {
          email: normalizedEmail,
        },
        {
          isVerified: true,
        },
        {
          new: true,
        },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete OTP after successful verification
      await redisClient.del(redisKey);

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error("Verify OTP Error:", error);

      return res.status(500).json({
        success: false,
        message: "OTP verification failed",
        error: error.message,
      });
    }
  }

  // =========================
  // RESEND OTP
  // =========================

  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check User
      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Already Verified
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate New OTP
      const otp = this.generateOTP();

      const redisKey = `otp:${normalizedEmail}`;

      // Store New OTP for 5 Minutes
      await redisClient.set(redisKey, otp, {
        EX: 300,
      });

      // Send Email
      await sendEmail(normalizedEmail, otp);

      return res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
      });
    } catch (error) {
      console.error("Resend OTP Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
        error: error.message,
      });
    }
  }

  // =========================
  // LOGIN
  // =========================

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find User
      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check Email Verification
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email first",
        });
      }

      // Compare Password
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        },
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login Error:", error);

      return res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
      });
    }
  }

  // =========================
  // GET PROFILE
  // =========================

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        user,
      });
    } catch (error) {
      console.error("Profile Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }
}

module.exports = new authController();
