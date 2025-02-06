import mongoose from "mongoose";

const adminModel = mongoose.Schema({
  name: { type: String, default: "" },
  password: { type: String, required: true },
  // email: { type: String, unique: true, required: true },
  // role: {type: String,}
});

const Admin = mongoose.model("Admin", adminModel);
export default Admin;
