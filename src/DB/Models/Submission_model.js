import mongoose from "mongoose";

const Submission_schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  answerText: String,
  imageUrl: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Assistant" },
  grade: Number,
  status: { type: String, enum: ["Pending", "Graded", "Flagged"], default: "Pending" }
}, { timestamps: true });

const Submission_model = mongoose.models.Submission || mongoose.model("Submission", Submission_schema);

export default Submission_model;