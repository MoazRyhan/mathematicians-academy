import mongoose from "mongoose";

const Question_schema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
  type: { type: String, enum: ["MCQ", "Essay"], required: true },
  content: String,
  correctAnswer: String
}, { timestamps: true });

const Question_model = mongoose.models.Question || mongoose.model("Question", Question_schema);

export default Question_model;