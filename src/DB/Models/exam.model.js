import mongoose from "mongoose";
import { EXAM_TYPE, EXAM_QUESTION_TYPE, EXAM_TIME_TYPE } from "../../Constants/constants.js";

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, enum: Object.values(EXAM_TYPE), required: true },
  questions: [{
    questionText: { type: String, required: true },
    questionType: { type: String, enum: Object.values(EXAM_QUESTION_TYPE), required: true },
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
  timeType: { type: String, enum: Object.values(EXAM_TIME_TYPE), required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
export default Exam;
