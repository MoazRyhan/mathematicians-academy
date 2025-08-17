import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  mathBranch: { type: String, required: true },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  videoLink: { type: String, required: true },
  videoQuizzes: [{
    questionText: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    showAtTime: { type: Number, required: true }, // in seconds
    passingGrade: { type: Number, default: 70 },
  }],
  homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  points: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  price: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

 const Session = mongoose.models.session || mongoose.model('Session',sessionSchema);

  export default Session