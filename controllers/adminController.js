import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Admin Signup
const adminSignup = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin already exists with this email." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: role || "admin", // Default to "admin" if role not provided
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin created successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Admin Login
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: admin._id, name: admin.name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Admin logged in successfully!",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error.", details: error.message });
  }
};

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

//Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Generate Reset Token
    const resetToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    // Reset Link
    const resetLink = `https://security.websitescheckup.in/reset-password/${resetToken}`;

    // Email Template
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "Admin Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${admin.name},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background: #007bff; color: #fff; padding: 10px; text-decoration: none;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    };

    // Send Email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset link sent to email" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending email", details: error.message });
  }
};

//Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Find Admin
    const admin = await Admin.findOne({ email: decoded.email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", details: error.message });
  }
};

export { adminSignup, adminLogin, forgotPassword, resetPassword };
