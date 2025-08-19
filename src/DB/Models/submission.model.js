import mongoose from "mongoose";
import { SUBMISSION_TYPE, SUBMISSION_REVIEW_STATUS } from "../../Constants/constants.js";

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },

  submissionType: { 
    type: String, 
    enum: Object.values(SUBMISSION_TYPE), 
    required: true 
  },

  pdfSolution: { type: String },

  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    studentAnswer: { type: String },
    isCorrect: { type: Boolean },
    assistantNotes: { type: String },
  }],

  // Assistant grading
  grade: { type: Number },
  isCorrected: { type: Boolean, default: false },
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' },

  // Supervisor review
  reviewStatus: { 
    type: String, 
    enum: Object.values(SUBMISSION_REVIEW_STATUS), 
    default: SUBMISSION_REVIEW_STATUS.PENDING 
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' },
  supervisorComment: { type: String }, // reason for rejection if any
  finalGrade: { type: Number }, // approved grade after supervisor review

  deadline: { type: Date, required: true },
}, { timestamps: true });

const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

export default Submission;
