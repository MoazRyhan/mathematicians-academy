import mongoose from "mongoose";

const AccessCode_schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true }, // الجلسة المحددة
  status: { type: String, enum: ["Active", "Used"], default: "Active" }
}, { timestamps: true });

const AccessCode_model = mongoose.models.AccessCode || mongoose.model("AccessCode", AccessCode_schema);

export default AccessCode_model;