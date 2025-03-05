import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

/**
 * Create a new user - Only an Admin can perform this action.
 */
export const createUser = async (req, res) => {
  try {
    // Ensure req.admin is properly set by middleware
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only!" });
    }

    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email!" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new user
    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "security", // Default role is "security"
    });

    await newUser.save();

    // Send email with credentials
    await sendEmail(email, name, password);

    res.status(201).json({
      message: "User created successfully and email sent!",
      user: newUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Function to send email using Nodemailer
const sendEmail = async (email, name, password) => {
  try {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Set this in your .env file
        pass: process.env.EMAIL_PASS, // Set this in your .env file
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender email
      to: email, // Receiver email
      subject: "Your Account Credentials",
      html: `
       <h2>Welcome, ${name}!</h2>
<p>Your account has been created successfully. Here are your login details:</p>
<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Password:</strong> ${password}</li>
</ul>
<p>Please <a href="https://security.websitescheckup.in" style="color: blue; text-decoration: underline;">click here</a> to log in.</p>
<p>We recommend changing your password after logging in.</p>
<p>Best Regards,<br>Security Team</p>

      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully to:", email);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Include role in the token
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//Get all Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ message: "All users fetched successfully!", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, Please try again later." });
  }
};

//Search user based on name, email
export const searchUser = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset password send mail
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a JWT reset token (expires in 1 hour)
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Send reset link via email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Use your email provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:3000/reset-password-user/${resetToken}`;

    const emailContent = `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetLink}" target="_blank" style="padding: 10px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>If you did not request a password reset, please ignore this email.</p>
      `;

    await transporter.sendMail({
      from: `"SecurityScan" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: emailContent,
    });

    res.json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error("Error sending reset email:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

//Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Find the user by email extracted from token
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();
    res.json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Delete a security
export const delSecurity = async (req, res) => {
  try {
    const { userId } = req.params;

    const security = await User.findByIdAndDelete(userId);
    if (!security) {
      return res.status(404).json({
        message: "User not foound!",
      });
    }

    res.status(200).json({
      message: "Security deleted successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
