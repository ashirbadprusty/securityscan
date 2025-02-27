import mongoose from "mongoose";

const deptUserSchema = mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    PhoneNumber: { type: Number },
    // dept: {type: String, enum: ["HR", "IT", "Finance", "Operations"]},
    dept: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    }, // Reference Department
    role: { type: String, default: "Dept_User" },
  },
  {
    timeStamps: true,
  }
);

const DeptUSer = mongoose.model("DeptUser", deptUserSchema);
export default DeptUSer;
