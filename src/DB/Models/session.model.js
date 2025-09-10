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

  // ✅ تقسيم الفيديو لأجزاء
  segments: [{
    title: { type: String, required: true },       // اسم الجزء
    startTime: { type: Number, required: true },   // بداية الجزء (بالثواني)
    endTime: { type: Number, required: true },     // نهاية الجزء (بالثواني)
    points: { type: Number, required: true },      // النقاط الخاصة بالجزء
    passingScore: { type: Number, required: true },// الحد الأدنى للنجاح في الجزء
    questions: [{                                   // الأسئلة الخاصة بالجزء
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: String, required: true },
      point: { type: Number, default : 1 },      // النقاط الخاصة بالسوال
    }]
  }],

  // ✅ إجمالي النقاط
  totalPoints: { type: Number, default: 0 }, // مجموع نقاط الأجزاء
  videoWatchPoints: { type: Number, default: 0 }, // بونص لو خلص الفيديو أول مرة

  // ✅ نتائج الطلاب
  studentResults: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    segmentResults: [{
      segmentId: { type: mongoose.Schema.Types.ObjectId }, // ID الجزء
      score: { type: Number, default: 0 },
      passed: { type: Boolean, default: false }
    }],
    totalScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }, // نسبة النجاح
    passed: { type: Boolean, default: false },
    completedAt: { type: Date }
  }],
  homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },

  isActive: { type: Boolean, default: true },
  price: { type: Number }, // ====================== > no use for this

  // 🔹 Availability control
  availabilityType: {
    type: String,
    enum: Object.values(SESSION_TIME),
    default : SESSION_TIME.IMMEDIATE , // ['immediate', 'scheduled']
    required: true,
  },
  availableAt: {
    type: Date, // only required if availabilityType = "SCHEDULED"
  },

  availableTill: { type: Date }, // and this we need it always to know what is the last time fot the session

  createdByTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher'},
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin'}

}, { timestamps: true });

const Session = mongoose.models.session || mongoose.model('Session', sessionSchema);

export default Session;
