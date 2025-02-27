import mongoose from "mongoose";

const departmentSchema = mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Tracks the admin who created it
  },
  { timestamps: true }
);

const Department = mongoose.model("Department", departmentSchema);
export default Department;
