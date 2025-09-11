import mongoose from "mongoose";
import { HOMEWORK_QUESTION_TYPE } from "../../Constants/constants.js";

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // 🔹 Whether the homework is currently active
  isActive: { type: Boolean, default: true },

  // 🔹 Homework availability & deadline
  availableFrom: { type: Date, required: true },
  deadline: { type: Date, required: true },

  
  grade: { type: String, required: true },
  division: { type: String, required: true },

    // Relations
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true }, // ✅ إضافة علاقة بالجلسة
  assignedByTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  assignedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },


  // 🔹 Reference to student submissions
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],
  
  questions: [
    {
      questionText: { type: String, required: true }, 
      type: { 
        type: String, 
        enum: Object.values(HOMEWORK_QUESTION_TYPE) , 
        required: true 
      },  
      points: { type: Number, required: true }, 
      grade: { type: Number, required: true },  
      correctAnswer: { type: String } ,
      options: [{ type: String }] // ✅ MCQ
    }
  ],

    // ✅ the new things
  totalQuestions: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  totalGrade: { type: Number, default: 0 },
  countEssayQuestions: { type: Number, default: 0 },
  countMCQQuestions: { type: Number, default: 0 },

}, { timestamps: true });

const Homework = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

export default Homework;
