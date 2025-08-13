const errorFileSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  questions: [{
    questionText: { type: String },
    studentAnswer: { type: String },
    correctAnswer: { type: String },
    type: { type: String, enum: ['homework', 'section', 'exam'] },
  }],
  generationDate: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' },
}, { timestamps: true });

export const ErrorFile = mongoose.models.ErrorFile || mongoose.model('ErrorFile', errorFileSchema);