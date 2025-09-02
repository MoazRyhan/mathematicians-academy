import mongoose from "mongoose";
import { CORRECTION_REVIEW_STATUS } from './../../Constants/constants.js';

const correctionReviewSchema = new mongoose.Schema({

  correctionRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CorrectionRequest', required: true },

  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant', required: true },

  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor', required: true },

  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true }, // ✅ لسهولة الوصول

  status: {
    type: String,
    enum:  Object.values(CORRECTION_REVIEW_STATUS),
    default: CORRECTION_REVIEW_STATUS.PENDING
  },

  notes: { type: String, trim: true },

  finalScore: { type: Number, min: 0, max: 100 }, // ✅ بعد مراجعة المشرف

}, { timestamps: true });

const CorrectionReview = mongoose.models.CorrectionReview || mongoose.model('CorrectionReview', correctionReviewSchema);
export default CorrectionReview;
