const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  submissionType: { type: String, enum: ['homework', 'section', 'exam'], required: true },
  pdfSolution: { type: String }, // For homework/section submissions
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    studentAnswer: { type: String },
    isCorrect: { type: Boolean },
    assistantNotes: { type: String },
  }],
  grade: { type: Number },
  isCorrected: { type: Boolean, default: false },
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' },
  reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' },
  deadline: { type: Date, required: true },
}, { timestamps: true });

export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);