import mongoose from "mongoose";

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
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },

    // 🔹 Reference to student submissions
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],

}, { timestamps: true });


const Section = mongoose.models.section || mongoose.model("Section", sectionSchema);

export default Section;


