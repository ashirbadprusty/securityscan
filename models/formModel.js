import mongoose from "mongoose";

const formSchema = mongoose.Schema(
  {
    profilePhoto: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    reason: { type: String, required: true },
    file: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    department: { type: String },
    personToMeet: {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      dept: { type: String },
      role: { type: String },
    },
    date: { type: String },
    timeFrom: { type: String },
    timeTo: { type: String },
    gate: { type: String },
    qrCode: { type: String },
    barcodeId: { type: String },
    qrCodeDate: { type: String },
    qrCodeTimeFrom:{type: String},
    qrCodeTimeTo: {type: String},
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", formSchema);
export default Form;
