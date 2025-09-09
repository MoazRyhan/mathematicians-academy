import mongoose from "mongoose";
import { EXAM_TYPE, EXAM_TIME_TYPE } from "../../Constants/constants.js";

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String }], // موجودة في الـ MCQ فقط
  correctAnswer: { type: String }, // صح للإجابة
  point: { type: Number, default: 1 }, // كل سؤال له نقاط
  grade: { type: Number, default: 1 }, // كل سؤال له نقاط
});

const questionBankGroupSchema = new mongoose.Schema({
  questionsGroupName: { type: String, required: true }, // اسم المجموعة
  questions: [questionSchema], // أسئلة داخل المجموعة
});


const examSchema = new mongoose.Schema({
  title: { type: String, required: true },

  examType: { type: String, enum: Object.values(EXAM_TYPE), required: true },

  // ✅ الأسئلة
  questions: {
    multipleChoices: [questionSchema], // أسئلة اختياري
    essay: [questionSchema],           // أسئلة مقالية
    questionBank: [questionBankGroupSchema],    // بنك الأسئلة
  },

  totalPoints: { type: Number, default: 0 }, // ✅ مجموع النقاط (يحسب عند الإنشاء)
  totalGrades: { type: Number, default: 0 }, // ✅ مجموع الدرجات )


  
  timeType: { type: String, enum: Object.values(EXAM_TIME_TYPE), required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number },
  deadline: { type: Date },

  grade: { type: String, required: true }, // now
  division: { type: String, required: true },  // now
  
  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  createdByTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher'},
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},

  // 🔹 Reference to student submissions
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],  // now

  isActive: { type: Boolean, default: true },

  // 🟢 إضافة عشان الامتحانات الشهرية
  month: { type: String },  

}, { timestamps: true });


const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
export default Exam;
