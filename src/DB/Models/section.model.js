import mongoose from "mongoose";
import { SECTION_QUESTION_TYPE } from "../../Constants/constants.js";

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // 🔹 Homework resources (e.g., PDF, Docs, etc.)
  materials: {
    files :{public_id : String,
      secure_url : String },
      folderId : String 
    }, // ملفات أو روابط


  // 🔹 Whether the section is currently active
  isActive: { type: Boolean, default: true },

  // 🔹 section availability & deadline
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
        enum: Object.values(SECTION_QUESTION_TYPE) , 
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


const Section = mongoose.models.section || mongoose.model("Section", sectionSchema);

export default Section;


