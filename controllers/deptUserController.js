import bcrypt from "bcrypt";
import DeptUser from "../models/deptUserModel.js";
import Department from "../models/department.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

// 🔹 Signup Dept User
export const Signup = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only!" });
    }

    const { name, email, password, phoneNumber, dept, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    // 🔹 Check if the email is already in use
    const existingUser = await DeptUser.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    // 🔹 Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // 🔹 Find department by name
    const department = await Department.findOne({ name: dept });
    if (!department) {
      return res.status(400).json({ error: "Invalid department name" });
    }

    // 🔹 Create a new Dept User
    const newDeptUser = new DeptUser({
      name,
      email: normalizedEmail,
      phoneNumber,
      password: hashedPassword,
      dept: department._id, // ✅ Save department ID, not name
      role: role || "Dept_User",
    });

    await newDeptUser.save();
    await sendEmail(name, email, password);

    res.status(201).json({
      success: true,
      message: "Dept user created successfully!",
      user: newDeptUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Function to send email using Nodemailer
const sendEmail = async (name, email, password) => {
  console.log("Dept user Email: ", email);

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

// Login Dept User
export const deptUSerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const deptUsers = await DeptUser.findOne({ email });
    if (!deptUsers) {
      return res.status(404).json({ error: "Dept User not found" });
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, deptUsers.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: deptUsers._id,
        name: deptUsers.name,
        email: deptUsers.email,
        role: deptUsers.role, // Include role in the token
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    res.status(200).json({
      message: "Login successfull!",
      token,
      user: {
        id: deptUsers._id,
        name: deptUsers.name,
        email: deptUsers.email,
        role: deptUsers.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// 🔹 Forgot Password - Send Reset Email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user exists
    const user = await DeptUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a Reset Token (expires in 1 hour)
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Send the reset password email
    await sendResetEmail(email, resetToken);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email!",
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// 📧 Send Reset Email
const sendResetEmail = async (email, token) => {
  console.log(email);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `https://security.websitescheckup.in/reset-password-user/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password. The link expires in 1 hour:</p>
          <a href="${resetURL}" style="color: blue; text-decoration: underline;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best Regards,<br>Security Team</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Password reset email sent to:", email);
  } catch (error) {
    console.error("❌ Failed to send reset email:", error);
  }
};

// 🔹 Reset Password - Update New Password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Find User
    const user = await DeptUser.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been successfully reset!",
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

//Get all Dept user
export const getAllDeptUser = async (req, res) => {
  try {
    const deptUsers = await DeptUser.find();
    res.status(200).json({
      message: "All dept users fetched successfully!",
      deptUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error, Please try again later.",
    });
  }
};

// Delete a Dept User
export const DelDeptUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user to be deleted in the database
    const user = await DeptUser.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user is found, delete the user

    res.status(200).json({ message: "Department User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
