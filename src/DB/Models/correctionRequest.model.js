import mongoose from "mongoose";
import { CORRECTION_REQUEST_STATUS, SUBMISSION_TYPE } from "../../Constants/constants.js";

const correctionRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant', required: true },

  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },

  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true }, // ✅ ربط بالـ Submission

  type: {
    type: String,
    enum: Object.values(SUBMISSION_TYPE) ,
    required: true
  },

  reason: { type: String, trim: true }, // ✅ سبب طلب التصحيح (اختياري)

  previousScore: { type: Number, min: 0, max: 100 }, // ✅ قبل التصحيح

  requestedScore: { type: Number, min: 0, max: 100, required: true }, // ✅ الدرجة المطلوبة

  notes: { type: String, trim: true },

  status: {
    type: String,
    enum:  Object.values(CORRECTION_REQUEST_STATUS),
    default: CORRECTION_REQUEST_STATUS.PENDING
  }

}, { timestamps: true });

const CorrectionRequest = mongoose.models.CorrectionRequest || mongoose.model('CorrectionRequest', correctionRequestSchema);
export default CorrectionRequest;
