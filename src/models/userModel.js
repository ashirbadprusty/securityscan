import mongoose, { mongo } from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    password: { type: String },
    role: { type: String, default: "security" },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("Users", userSchema);
export default User;
