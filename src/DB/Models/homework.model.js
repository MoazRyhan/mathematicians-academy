import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // 🔹 Homework resources (e.g., PDF, Docs, etc.)
    materials: {
    files :{public_id : String,
      secure_url : String },
      folderId : String 
    }, 

  // 🔹 Whether the homework is currently active
  isActive: { type: Boolean, default: true },

  // 🔹 Homework availability & deadline
  availableFrom: { type: Date, required: true },
  deadline: { type: Date, required: true },

  
  grade: { type: String, required: true },
  division: { type: String, required: true },

    // Relations
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true }, // ✅ إضافة علاقة بالجلسة
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  isAdminAddIt: { type: Boolean, default: false }
  

}, { timestamps: true });

const Homework = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

export default Homework;
