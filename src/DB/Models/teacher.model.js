const teacherSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' }],
  assistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' }],
}, { timestamps: true });

export const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

