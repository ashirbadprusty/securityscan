import bcrypt from "bcrypt";
import Admin from "../models/adminModel.js";
import jwt from "jsonwebtoken";

// Admin Signup
const adminSignup = async (req, res) => {
  const { name, password } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ name });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      password: hashedPassword,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//Admin Login
const adminLogin = async (req, res) => {
  const { name, password } = req.body;

  try {
    const admin = await Admin.findOne({ name });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }
    const token = jwt.sign(
      {
        id: admin._id,
        name: admin.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Admin Logged in successfully!",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
};

export { adminSignup, adminLogin };
