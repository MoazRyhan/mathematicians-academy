import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // 🔹 Link to the session this homework belongs to
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },

  // 🔹 Homework resources (e.g., PDF, Docs, etc.)
  resources: [{ type: String }],

  // 🔹 Homework questions (MCQ or essay)
  questions: [{
    questionText: { type: String, required: true },
    options: [{ type: String }], // MCQ options
    correctAnswer: { type: String }, // leave empty if essay question
    points: { type: Number, default: 0 } // points per question
  }],

  // 🔹 Total grade for the homework
  totalPoints: { type: Number, required: true },

  // 🔹 Whether the homework is currently active
  isActive: { type: Boolean, default: true },

  // 🔹 Homework availability & deadline
  availableFrom: { type: Date, required: true },
  deadline: { type: Date, required: true },

  // 🔹 Reference to student submissions
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],

}, { timestamps: true });

const Homework = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

export default Homework;
