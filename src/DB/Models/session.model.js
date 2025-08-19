import mongoose from "mongoose";
import { SESSION_TIME, STUDENT_ENUMS } from "../../Constants/constants.js";

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  mathBranch: { type: String, required: true },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  videoLink: { type: String, required: true },

  // 🔹 Link session to grade
  grade: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.GRADE),
    required: true
  },

  division: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.DIVISION),
    required: true
  },

  videoQuizzes: [{
    questionText: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    showAtTime: { type: Number, required: true }, 
    passingGrade: { type: Number, default: 70 },
  }],

  homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },

  points: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  price: { type: Number, required: true },

  // 🔹 Availability control
  availabilityType: {
    type: String,
    enum: Object.values(SESSION_TIME),
    default :  SESSION_TIME.IMMEDIATE ,
    required: true
  },
  availableAt: {
    type: Date, // only required if availabilityType = "SCHEDULED"
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

const Session = mongoose.models.session || mongoose.model('Session', sessionSchema);

export default Session;
