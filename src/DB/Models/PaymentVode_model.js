import mongoose from "mongoose";

const Payment_schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  method: { type: String, enum: ["VodafoneCash"], default: "VodafoneCash" },
  phoneNumber: { type: String, required: true }, // رقم الموبايل اللي اتعمل منه التحويل
  screenshotUrl: { type: String, required: true }, // رابط صورة التحويل
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Assistant", default: null },
  confirmed: { type: Boolean, default: false }
}, { timestamps: true });

const Payment_model = mongoose.models.Payment || mongoose.model("Payment", Payment_schema);

export default Payment_model;