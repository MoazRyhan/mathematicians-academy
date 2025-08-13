const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, enum: ['fixed', 'question_bank'], required: true },
  questions: [{
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['multiple_choice', 'essay'], required: true },
    options: [{ type: String }],
    correctAnswer: { type: String },
    questionBank: [{
      questionText: { type: String },
      options: [{ type: String }],
      correctAnswer: { type: String },
    }],
    points: { type: Number, required: true },
  }],
  relatedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  timeType: { type: String, enum: ['fixed_time', 'deadline'], required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number }, // in minutes
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

export const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);