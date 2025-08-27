import mongoose from "mongoose";
import { EXAM_TYPE, EXAM_QUESTION_TYPE, EXAM_TIME_TYPE } from "../../Constants/constants.js";

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },

  examType: { type: String, enum: Object.values(EXAM_TYPE), required: true },

  questions: [{
    questionText: { type: String, required: true },
    questionType: { type: String, enum: Object.values(EXAM_QUESTION_TYPE), required: true },
    
    options: [{ type: String }],       // للاختياري فقط
    correctAnswer: { type: String },   // للاختياري فقط

    // 🟢 بنك الأسئلة (لو النوع QUESTION_BANK)
    questionBank: [{
      questionText: { type: String },
      options: [{ type: String }],
      correctAnswer: { type: String },
    }],

    points: { type: Number, required: true }, // for all
  }],

  
  timeType: { type: String, enum: Object.values(EXAM_TIME_TYPE), required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number },
  deadline: { type: Date },

  grade: { type: String, required: true }, // now
  division: { type: String, required: true },  // now
  
  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },

  // 🔹 Reference to student submissions
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],  // now
  
  pdfSolution: {
    files :{public_id : String,
      secure_url : String },
      folderId : String 
    },

  isActive: { type: Boolean, default: true },

  // 🟢 إضافة عشان الامتحانات الشهرية
  month: { type: String },  

}, { timestamps: true });

const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
export default Exam;
