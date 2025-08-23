import mongoose from "mongoose";

const paymentCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // الكود نفسه
  isUsed: { type: Boolean, default: false }, // اتستخدم ولا لأ
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }, // مين أنشأه
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // الطالب اللي استخدمه
  sessionsCount: { type: Number, default: 1 }, // عدد الجلسات اللي يفتحها الكود
}, { timestamps: true });

const PaymentCode = mongoose.models.PaymentCode || mongoose.model('PaymentCode', paymentCodeSchema);

export default PaymentCode;
