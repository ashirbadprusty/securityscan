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
    qrCode: { type: String },
    barcodeId: { type: String },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", formSchema);
export default Form;
