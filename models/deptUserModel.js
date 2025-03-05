import mongoose from "mongoose";

const deptUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phoneNumber: { type: Number, required: true },
    dept: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    role: { type: String, default: "Dept_User" },
  },
  {
    timestamps: true, // Corrected spelling
  }
);

const DeptUser = mongoose.model("DeptUser", deptUserSchema); // Fixed naming issue
export default DeptUser;
